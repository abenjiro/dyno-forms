import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createPrepaidUnlockToken } from '@/lib/payments-server';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reference, paymentId } = body;

    if (!reference && !paymentId) {
      return NextResponse.json({ error: 'Payment reference or ID is required' }, { status: 400 });
    }

    // 1. Locate Form
    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // 2. Query Payment
    const payment = await prisma.payment.findFirst({
      where: {
        formId: form.id,
        OR: [
          ...(reference ? [{ gatewayReference: reference }] : []),
          ...(paymentId && isUuid(paymentId) ? [{ id: paymentId }] : []),
        ],
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // 3. Mark payment as Paid
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        completedAt: new Date(),
      },
    });

    // If linked to a submission, update submission payment status
    if (payment.submissionId) {
      await prisma.submission.update({
        where: { id: payment.submissionId },
        data: { paymentStatus: 'paid' },
      });
    }

    // 4. Generate Unlock Token for Prepaid Forms
    const unlockToken = createPrepaidUnlockToken(form.id, updatedPayment.id);

    return NextResponse.json({
      success: true,
      status: 'paid',
      paymentId: updatedPayment.id,
      reference: updatedPayment.gatewayReference,
      totalCharged: Number(updatedPayment.totalCharged),
      currency: updatedPayment.currency,
      completedAt: updatedPayment.completedAt?.toISOString(),
      unlockToken,
      message: 'Payment successfully confirmed and verified!',
    });
  } catch (err: any) {
    console.error('[PaymentVerifyAPI] Failed:', err);
    return NextResponse.json(
      { error: err.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
