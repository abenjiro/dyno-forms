import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const batchName = searchParams.get('batchName') || '';

    // 1. Locate Form & verify tenant authorization
    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id }, include: { group: true } })
      : await prisma.form.findFirst({ where: { slug: id }, include: { group: true } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // 2. Build where filter: matches form OR cohort group
    const where: any = {
      OR: [
        { formId: form.id },
        ...(form.groupId ? [{ groupId: form.groupId }] : []),
      ],
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (batchName) {
      where.batchName = batchName;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { codeMasked: { contains: search, mode: 'insensitive' } },
            { batchName: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [vouchers, total, batchesRaw] = await Promise.all([
      prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              redemptions: true,
            },
          },
        },
      }),
      prisma.voucher.count({ where }),
      prisma.voucher.findMany({
        where: {
          OR: [
            { formId: form.id },
            ...(form.groupId ? [{ groupId: form.groupId }] : []),
          ],
        },
        distinct: ['batchName'],
        select: { batchName: true },
      }),
    ]);

    const batchNames = batchesRaw
      .map((b) => b.batchName)
      .filter((b): b is string => Boolean(b));

    return NextResponse.json({
      vouchers: vouchers.map((v) => ({
        id: v.id,
        codeMasked: v.codeMasked,
        batchName: v.batchName,
        discountType: v.discountType,
        discountValue: Number(v.discountValue),
        maxUses: v.maxUses,
        timesUsed: v.timesUsed,
        status: v.status,
        expiresAt: v.expiresAt,
        createdAt: v.createdAt,
        redemptionCount: v._count.redemptions,
        scope: v.groupId ? 'cohort' : 'form',
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      batchNames,
      form: {
        id: form.id,
        title: form.title,
        slug: form.slug,
        group: form.group,
      },
    });
  } catch (err: any) {
    console.error('[VouchersAPI] GET failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch vouchers' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { voucherId, action, batchName } = body;

    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'revoke_batch' && batchName) {
      await prisma.voucher.updateMany({
        where: {
          batchName,
          OR: [{ formId: form.id }, ...(form.groupId ? [{ groupId: form.groupId }] : [])],
        },
        data: { status: 'revoked' },
      });
      return NextResponse.json({ success: true, message: `Batch "${batchName}" revoked` });
    }

    if (voucherId) {
      const updated = await prisma.voucher.update({
        where: { id: voucherId },
        data: {
          status: action === 'activate' ? 'active' : 'revoked',
        },
      });
      return NextResponse.json({ success: true, voucher: updated });
    }

    return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
  } catch (err: any) {
    console.error('[VouchersAPI] PATCH failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to update voucher' }, { status: 500 });
  }
}
