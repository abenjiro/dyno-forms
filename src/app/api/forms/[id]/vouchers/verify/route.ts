import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Voucher code is required' }, { status: 400 });
    }

    // 1. Locate Form
    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ valid: false, error: 'Form not found' }, { status: 404 });
    }

    // 2. Query Voucher by SHA-256 Hash
    const cleanCode = code.toUpperCase().trim();
    const codeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    const voucher = await prisma.voucher.findUnique({
      where: { codeHash },
    });

    if (!voucher) {
      return NextResponse.json({ valid: false, error: 'Invalid voucher code. Please check and try again.' });
    }

    if (voucher.status === 'revoked') {
      return NextResponse.json({ valid: false, error: 'This voucher code has been revoked.' });
    }

    if (voucher.status === 'exhausted' || voucher.timesUsed >= voucher.maxUses) {
      return NextResponse.json({ valid: false, error: 'This voucher code has already reached its maximum usage limit.' });
    }

    if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
      return NextResponse.json({ valid: false, error: 'This voucher code has expired.' });
    }

    // Verify scope (form-level or cohort-level)
    const matchesForm = !voucher.formId || voucher.formId === form.id;
    const matchesGroup = !voucher.groupId || (form.groupId && voucher.groupId === form.groupId);

    if (!matchesForm && !matchesGroup) {
      return NextResponse.json({ valid: false, error: 'This voucher is not valid for this specific form.' });
    }

    const discountSummary =
      voucher.discountType === 'full_waiver'
        ? '100% Fee Waiver'
        : voucher.discountType === 'percentage'
        ? `${Number(voucher.discountValue)}% Discount`
        : `$${Number(voucher.discountValue)} Credit`;

    return NextResponse.json({
      valid: true,
      voucherId: voucher.id,
      codeMasked: voucher.codeMasked,
      discountType: voucher.discountType,
      discountValue: Number(voucher.discountValue),
      discountSummary,
      usesRemaining: voucher.maxUses - voucher.timesUsed,
      message: `Voucher successfully applied: ${discountSummary}!`,
    });
  } catch (err: any) {
    console.error('[VoucherVerifyAPI] Verification failed:', err);
    return NextResponse.json({ valid: false, error: 'Failed to verify voucher code' }, { status: 500 });
  }
}
