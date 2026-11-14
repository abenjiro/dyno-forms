/**
 * Dyno Forms Monetization & Payment Engine
 * Handles fee splits, gateway integrations, and pricing models
 */

export type AccessMode = 'free' | 'prepaid' | 'postpaid';
export type FeeBearer = 'client' | 'creator';
export type PaymentGatewayType = 'stripe' | 'paystack' | 'flutterwave' | 'momo';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'GHS' | 'NGN' | 'KES';

export interface PricingConfig {
  accessMode: AccessMode;
  basePrice: number;
  currency: CurrencyCode;
  feeBearer: FeeBearer;
  platformFeePercent: number; // e.g. 5 for 5%
  gatewayFeePercent: number;  // e.g. 2.5 for 2.5%
  fixedPlatformFee?: number;  // optional flat fee e.g. 0.30
  enabledGateways: PaymentGatewayType[];
}

export interface FeeBreakdown {
  basePrice: number;
  platformFee: number;
  gatewayFee: number;
  totalFees: number;
  totalCharged: number; // Gross amount respondent pays
  creatorNet: number;   // Net amount form creator receives
  feeBearer: FeeBearer;
  currency: CurrencyCode;
  currencySymbol: string;
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  GHS: 'GH₵',
  NGN: '₦',
  KES: 'KSh',
};

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  accessMode: 'free',
  basePrice: 0,
  currency: 'USD',
  feeBearer: 'client',
  platformFeePercent: 5.0, // 5% Dyno Forms platform fee
  gatewayFeePercent: 2.5,  // 2.5% Telco / Gateway fee
  fixedPlatformFee: 0,
  enabledGateways: ['stripe', 'paystack', 'momo'],
};

/**
 * Calculates fee breakdown according to Dyno Forms split monetization model
 *
 * Total Paid = Base Price + Platform Fee + Gateway Fee
 *
 * If Fee Bearer is 'client':
 *   - Client pays: BasePrice + PlatformFee + GatewayFee
 *   - Creator receives: BasePrice (100% net)
 *
 * If Fee Bearer is 'creator':
 *   - Client pays: BasePrice
 *   - Creator receives: BasePrice - PlatformFee - GatewayFee
 */
export function calculateFeeBreakdown(
  basePrice: number,
  currency: CurrencyCode = 'USD',
  feeBearer: FeeBearer = 'client',
  platformFeePercent: number = 5.0,
  gatewayFeePercent: number = 2.5,
  fixedPlatformFee: number = 0
): FeeBreakdown {
  const cleanBase = Math.max(0, Number(basePrice) || 0);

  if (cleanBase === 0) {
    return {
      basePrice: 0,
      platformFee: 0,
      gatewayFee: 0,
      totalFees: 0,
      totalCharged: 0,
      creatorNet: 0,
      feeBearer,
      currency,
      currencySymbol: CURRENCY_SYMBOLS[currency] || '$',
    };
  }

  // Calculate percentage fees with 2 decimal precision
  const platformFee = Math.round((cleanBase * (platformFeePercent / 100) + fixedPlatformFee) * 100) / 100;
  const gatewayFee = Math.round((cleanBase * (gatewayFeePercent / 100)) * 100) / 100;
  const totalFees = Math.round((platformFee + gatewayFee) * 100) / 100;

  let totalCharged: number;
  let creatorNet: number;

  if (feeBearer === 'client') {
    // Client bears the fee
    totalCharged = Math.round((cleanBase + totalFees) * 100) / 100;
    creatorNet = cleanBase;
  } else {
    // Creator absorbs the fee
    totalCharged = cleanBase;
    creatorNet = Math.max(0, Math.round((cleanBase - totalFees) * 100) / 100);
  }

  return {
    basePrice: cleanBase,
    platformFee,
    gatewayFee,
    totalFees,
    totalCharged,
    creatorNet,
    feeBearer,
    currency,
    currencySymbol: CURRENCY_SYMBOLS[currency] || '$',
  };
}

/**
 * Formats monetary amounts nicely e.g. "$12.50" or "GH₵ 50.00"
 */
export function formatMoney(amount: number, currency: CurrencyCode = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  return `${symbol}${amount.toFixed(2)}`;
}
