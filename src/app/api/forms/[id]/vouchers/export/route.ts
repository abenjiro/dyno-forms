import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const stringVal = String(value);
  const escaped = stringVal.replace(/"/g, '""');
  return `"${escaped}"`;
}

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
    const batchName = searchParams.get('batchName');

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

    const where: any = {
      OR: [{ formId: form.id }, ...(form.groupId ? [{ groupId: form.groupId }] : [])],
    };

    if (batchName) {
      where.batchName = batchName;
    }

    const vouchers = await prisma.voucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    const headers = [
      'Serial / ID',
      'Masked Code',
      'Batch Name',
      'Discount Type',
      'Discount Value',
      'Max Uses',
      'Times Used',
      'Redemptions Count',
      'Status',
      'Expires At',
      'Created At (UTC)',
    ];

    const rows: string[] = [headers.map(escapeCsvCell).join(',')];

    for (let i = 0; i < vouchers.length; i++) {
      const v = vouchers[i];
      const row = [
        escapeCsvCell(i + 1),
        escapeCsvCell(v.codeMasked),
        escapeCsvCell(v.batchName || 'General Batch'),
        escapeCsvCell(v.discountType),
        escapeCsvCell(Number(v.discountValue)),
        escapeCsvCell(v.maxUses),
        escapeCsvCell(v.timesUsed),
        escapeCsvCell(v._count.redemptions),
        escapeCsvCell(v.status),
        escapeCsvCell(v.expiresAt ? v.expiresAt.toISOString() : 'Never'),
        escapeCsvCell(v.createdAt.toISOString()),
      ];
      rows.push(row.join(','));
    }

    const csvOutput = rows.join('\r\n');
    const filename = `${form.slug || 'form'}-vouchers-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('[VouchersExportAPI] Export failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to export vouchers' }, { status: 500 });
  }
}
