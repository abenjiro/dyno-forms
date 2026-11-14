import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { VoucherDiscountType } from '@prisma/client';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

// Unambiguous character set (no 0/O, 1/I/L)
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateRandomSegment(length: number): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

export async function POST(
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

    const {
      batchName = 'Default Voucher Batch',
      quantity = 10,
      prefix = 'ADM-2026',
      maxUses = 1,
      discountType = 'full_waiver',
      discountValue = 0,
      expiresAt = null,
      applyToCohort = false,
    } = body;

    const count = Math.min(1000, Math.max(1, parseInt(quantity, 10) || 1));

    // 1. Fetch form & verify ownership
    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id }, include: { group: true } })
      : await prisma.form.findFirst({ where: { slug: id }, include: { group: true } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const cleanPrefix = prefix
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .replace(/-+$/, '');

    // 2. Generate unique voucher codes
    const generatedVouchers: Array<{
      id: string;
      code: string;
      codeMasked: string;
      codeHash: string;
    }> = [];

    const existingHashes = new Set<string>();

    for (let i = 0; i < count; i++) {
      let code = '';
      let codeHash = '';
      let attempts = 0;

      do {
        attempts++;
        const segment1 = generateRandomSegment(4);
        const segment2 = generateRandomSegment(4);
        code = cleanPrefix ? `${cleanPrefix}-${segment1}-${segment2}` : `${segment1}-${segment2}`;
        codeHash = crypto.createHash('sha256').update(code).digest('hex');
      } while (existingHashes.has(codeHash) && attempts < 10);

      existingHashes.add(codeHash);

      // Mask e.g. "ADM-2026-***-8Q9K"
      const parts = code.split('-');
      const lastSegment = parts[parts.length - 1];
      const leadSegment = parts.length > 2 ? parts.slice(0, -2).join('-') : parts[0];
      const codeMasked = `${leadSegment}-***-${lastSegment}`;

      generatedVouchers.push({
        id: crypto.randomUUID(),
        code,
        codeMasked,
        codeHash,
      });
    }

    // 3. Batch insert into PostgreSQL
    const targetGroupId = applyToCohort && form.groupId ? form.groupId : null;
    const targetFormId = applyToCohort && form.groupId ? null : form.id;

    await prisma.$transaction(
      generatedVouchers.map((v) =>
        prisma.voucher.create({
          data: {
            id: v.id,
            formId: targetFormId,
            groupId: targetGroupId,
            codeHash: v.codeHash,
            codeMasked: v.codeMasked,
            batchName: batchName.trim(),
            discountType: discountType as VoucherDiscountType,
            discountValue: discountValue ? parseFloat(discountValue) : 0,
            maxUses: parseInt(maxUses, 10) || 1,
            timesUsed: 0,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            status: 'active',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      batchName,
      count: generatedVouchers.length,
      scope: targetGroupId ? 'cohort' : 'form',
      vouchers: generatedVouchers.map((v) => ({
        id: v.id,
        code: v.code, // Returned once for download / printing
        codeMasked: v.codeMasked,
      })),
      message: `Successfully generated and saved ${generatedVouchers.length} vouchers!`,
    });
  } catch (err: any) {
    console.error('[VoucherGenAPI] Batch creation failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate voucher batch' }, { status: 500 });
  }
}
