import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  DEFAULT_PRICING_CONFIG,
  calculateFeeBreakdown,
  PricingConfig,
} from '@/lib/payments';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id }, select: { id: true, title: true, slug: true, pricingConfig: true } })
      : await prisma.form.findFirst({ where: { slug: id }, select: { id: true, title: true, slug: true, pricingConfig: true } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const config: PricingConfig = (form.pricingConfig as unknown as PricingConfig) || DEFAULT_PRICING_CONFIG;
    const feeBreakdown = calculateFeeBreakdown(
      config.basePrice,
      config.currency,
      config.feeBearer,
      config.platformFeePercent,
      config.gatewayFeePercent
    );

    return NextResponse.json({
      formId: form.id,
      title: form.title,
      slug: form.slug,
      pricingConfig: config,
      feeBreakdown,
    });
  } catch (err: any) {
    console.error('[PricingAPI] GET failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch pricing' }, { status: 500 });
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

    const {
      accessMode = 'free',
      basePrice = 0,
      currency = 'USD',
      feeBearer = 'client',
      platformFeePercent = 5.0,
      gatewayFeePercent = 2.5,
      enabledGateways = ['stripe', 'paystack', 'momo'],
    } = body;

    const validatedConfig: PricingConfig = {
      accessMode: ['free', 'prepaid', 'postpaid'].includes(accessMode) ? accessMode : 'free',
      basePrice: Math.max(0, parseFloat(basePrice) || 0),
      currency: ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES'].includes(currency) ? currency : 'USD',
      feeBearer: ['client', 'creator'].includes(feeBearer) ? feeBearer : 'client',
      platformFeePercent: Math.max(0, parseFloat(platformFeePercent) || 5.0),
      gatewayFeePercent: Math.max(0, parseFloat(gatewayFeePercent) || 2.5),
      enabledGateways: Array.isArray(enabledGateways) ? enabledGateways : ['stripe', 'paystack', 'momo'],
    };

    const updatedForm = await prisma.form.update({
      where: { id: form.id },
      data: {
        pricingConfig: validatedConfig as any,
      },
    });

    const feeBreakdown = calculateFeeBreakdown(
      validatedConfig.basePrice,
      validatedConfig.currency,
      validatedConfig.feeBearer,
      validatedConfig.platformFeePercent,
      validatedConfig.gatewayFeePercent
    );

    return NextResponse.json({
      success: true,
      pricingConfig: updatedForm.pricingConfig,
      feeBreakdown,
      message: 'Pricing configuration successfully saved!',
    });
  } catch (err: any) {
    console.error('[PricingAPI] PATCH failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to update pricing' }, { status: 500 });
  }
}
