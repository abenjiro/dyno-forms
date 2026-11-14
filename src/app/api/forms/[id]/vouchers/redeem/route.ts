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
    const { code, email, submissionId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Voucher code is required' }, { status: 400 });
    }

    // 1. Locate Form
    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
    }

    // 2. Hash Code
    const cleanCode = code.toUpperCase().trim();
    const codeHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    // 3. Atomically check and update voucher using transactional lock
    const redemptionResult = await prisma.$transaction(async (tx) => {
      // Find voucher
      const voucher = await tx.voucher.findUnique({
        where: { codeHash },
      });

      if (!voucher) {
        throw new Error('Invalid voucher code. Please check and try again.');
      }

      if (voucher.status === 'revoked') {
        throw new Error('This voucher code has been revoked.');
      }

      if (voucher.status === 'exhausted' || voucher.timesUsed >= voucher.maxUses) {
        throw new Error('This voucher code has already reached its maximum usage limit.');
      }

      if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
        throw new Error('This voucher code has expired.');
      }

      // Check form or cohort scoping
      const matchesForm = !voucher.formId || voucher.formId === form.id;
      const matchesGroup = !voucher.groupId || (form.groupId && voucher.groupId === form.groupId);

      if (!matchesForm && !matchesGroup) {
        throw new Error('This voucher code is not eligible for this form.');
      }

      // Atomic increment
      const newTimesUsed = voucher.timesUsed + 1;
      const isNowExhausted = newTimesUsed >= voucher.maxUses;

      const updatedVoucher = await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          timesUsed: { increment: 1 },
          status: isNowExhausted ? 'exhausted' : voucher.status,
        },
      });

      // Record redemption event
      const redemption = await tx.voucherRedemption.create({
        data: {
          id: crypto.randomUUID(),
          voucherId: voucher.id,
          submissionId: submissionId || null,
          redeemedByEmail: email || null,
        },
      });

      return {
        voucher: updatedVoucher,
        redemption,
      };
    });

    const v = redemptionResult.voucher;
    const discountSummary =
      v.discountType === 'full_waiver'
        ? '100% Fee Waiver'
        : v.discountType === 'percentage'
        ? `${Number(v.discountValue)}% Discount`
        : `$${Number(v.discountValue)} Credit`;

    return NextResponse.json({
      success: true,
      voucherId: v.id,
      codeMasked: v.codeMasked,
      discountType: v.discountType,
      discountValue: Number(v.discountValue),
      discountSummary,
      timesUsed: v.timesUsed,
      maxUses: v.maxUses,
      redemptionId: redemptionResult.redemption.id,
      message: `Voucher successfully redeemed: ${discountSummary}!`,
    });
  } catch (err: any) {
    console.error('[VoucherRedeemAPI] Redemption failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to redeem voucher' },
      { status: 400 }
    );
  }
}
