import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Extract reference from various gateway webhook formats
    const reference =
      body.reference ||
      body.data?.reference ||
      body.data?.id ||
      body.id ||
      request.headers.get('x-gateway-reference');

    if (!reference) {
      return NextResponse.json({ received: true, note: 'No reference detected' });
    }

    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Locate matching pending payment
    const payment = await prisma.payment.findFirst({
      where: {
        formId: form.id,
        gatewayReference: reference,
      },
    });

    if (payment) {
      if (payment.status !== 'paid') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'paid',
            completedAt: new Date(),
          },
        });

        if (payment.submissionId) {
          await prisma.submission.update({
            where: { id: payment.submissionId },
            data: { paymentStatus: 'paid' },
          });
        }
      }
    }

    return NextResponse.json({ received: true, status: 'processed' });
  } catch (err: any) {
    console.error('[PaymentWebhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
