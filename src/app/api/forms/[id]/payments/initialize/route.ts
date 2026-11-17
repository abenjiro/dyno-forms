import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';
import {
  DEFAULT_PRICING_CONFIG,
  calculateFeeBreakdown,
  PricingConfig,
  PaymentGatewayType,
} from '@/lib/payments';
import { PaymentGateway, FeeBearer } from '@prisma/client';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      payerEmail,
      payerPhone,
      gateway = 'stripe',
      submissionId,
    } = body;

    // 1. Locate Form
    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const config: PricingConfig = (form.pricingConfig as unknown as PricingConfig) || DEFAULT_PRICING_CONFIG;

    if (config.accessMode === 'free' || config.basePrice <= 0) {
      return NextResponse.json({
        error: 'This form is free of charge; no payment required.',
      }, { status: 400 });
    }

    // 2. Compute Fee Breakdown
    const feeBreakdown = calculateFeeBreakdown(
      config.basePrice,
      config.currency,
      config.feeBearer,
      config.platformFeePercent,
      config.gatewayFeePercent
    );

    // 3. Generate Reference
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reference = `DF-PAY-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const paymentId = crypto.randomUUID();

    const chosenGateway: PaymentGateway = (
      ['stripe', 'paystack', 'flutterwave', 'momo'].includes(gateway) ? gateway : 'stripe'
    ) as PaymentGateway;

    // 4. Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        formId: form.id,
        submissionId: submissionId || null,
        payerEmail: payerEmail || null,
        payerPhone: payerPhone || null,
        basePrice: feeBreakdown.basePrice,
        platformFee: feeBreakdown.platformFee,
        gatewayFee: feeBreakdown.gatewayFee,
        totalCharged: feeBreakdown.totalCharged,
        creatorNet: feeBreakdown.creatorNet,
        feeBearer: feeBreakdown.feeBearer as FeeBearer,
        currency: feeBreakdown.currency,
        gateway: chosenGateway,
        gatewayReference: reference,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      reference: payment.gatewayReference,
      totalCharged: feeBreakdown.totalCharged,
      currency: feeBreakdown.currency,
      feeBreakdown,
      gateway: payment.gateway,
      accessMode: config.accessMode,
      message: 'Payment session successfully initialized',
    });
  } catch (err: any) {
    console.error('[PaymentInitAPI] Failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize payment session' },
      { status: 500 }
    );
  }
}
