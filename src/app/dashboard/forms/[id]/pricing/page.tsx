'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Users,
  Ticket,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Globe,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { AuthNav } from '@/components/auth/AuthNav';
import {
  AccessMode,
  FeeBearer,
  CurrencyCode,
  PaymentGatewayType,
  calculateFeeBreakdown,
  formatMoney,
  CURRENCY_SYMBOLS,
} from '@/lib/payments';
import clsx from 'clsx';

interface FormMeta {
  id: string;
  title: string;
  slug: string;
}

export default function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Pricing Configuration State
  const [accessMode, setAccessMode] = useState<AccessMode>('free');
  const [basePrice, setBasePrice] = useState<number>(10);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [feeBearer, setFeeBearer] = useState<FeeBearer>('client');
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(5.0);
  const [gatewayFeePercent, setGatewayFeePercent] = useState<number>(2.5);
  const [enabledGateways, setEnabledGateways] = useState<PaymentGatewayType[]>([
    'stripe',
    'paystack',
    'momo',
  ]);

  const fetchPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(id)}/pricing`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const err = await res.json();
        throw new Error(err.error || 'Failed to load pricing');
      }

      const data = await res.json();
      setForm({ id: data.formId, title: data.title, slug: data.slug });

      if (data.pricingConfig) {
        setAccessMode(data.pricingConfig.accessMode || 'free');
        setBasePrice(Number(data.pricingConfig.basePrice) || 0);
        setCurrency(data.pricingConfig.currency || 'USD');
        setFeeBearer(data.pricingConfig.feeBearer || 'client');
        setPlatformFeePercent(Number(data.pricingConfig.platformFeePercent) || 5.0);
        setGatewayFeePercent(Number(data.pricingConfig.gatewayFeePercent) || 2.5);
        if (Array.isArray(data.pricingConfig.enabledGateways)) {
          setEnabledGateways(data.pricingConfig.enabledGateways);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(id)}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessMode,
          basePrice,
          currency,
          feeBearer,
          platformFeePercent,
          gatewayFeePercent,
          enabledGateways,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save pricing configuration');
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleGateway = (gw: PaymentGatewayType) => {
    if (enabledGateways.includes(gw)) {
      if (enabledGateways.length === 1) return; // Keep at least one
      setEnabledGateways(enabledGateways.filter((g) => g !== gw));
    } else {
      setEnabledGateways([...enabledGateways, gw]);
    }
  };

  // Real-time Fee Breakdown Calculation
  const feeBreakdown = calculateFeeBreakdown(
    accessMode === 'free' ? 0 : basePrice,
    currency,
    feeBearer,
    platformFeePercent,
    gatewayFeePercent
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-900 text-sm">Forms</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900 text-sm truncate max-w-xs sm:max-w-md">
                {form?.title || 'Form'}
              </span>
              <span className="text-slate-300">/</span>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>Monetization & Pricing</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href={`/dashboard/forms/${encodeURIComponent(id)}/vouchers`}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Ticket className="w-3.5 h-3.5 text-purple-600" />
              <span>Vouchers</span>
            </Link>

            <Link
              href={`/dashboard/forms/${encodeURIComponent(id)}/submissions`}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Submissions</span>
            </Link>

            <AuthNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading pricing configuration...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Error Loading Pricing</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Form Settings (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Access Mode Selector Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Access & Paywall Mode</h3>
                    <p className="text-xs text-slate-500">
                      Determine how and when applicants encounter the payment paywall.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  {/* Free Mode */}
                  <div
                    onClick={() => setAccessMode('free')}
                    className={clsx(
                      'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between',
                      accessMode === 'free'
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">Free Access</span>
                        {accessMode === 'free' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Standard public form. No payment or access fee required.
                      </p>
                    </div>
                    <span className="mt-3 text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                      Zero Fees
                    </span>
                  </div>

                  {/* Prepaid Mode */}
                  <div
                    onClick={() => setAccessMode('prepaid')}
                    className={clsx(
                      'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between',
                      accessMode === 'prepaid'
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">Prepaid Paywall</span>
                        {accessMode === 'prepaid' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Paywall at entrance. Form fields remain locked until applicant pays or enters voucher.
                      </p>
                    </div>
                    <span className="mt-3 text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                      Admissions / Exams
                    </span>
                  </div>

                  {/* Postpaid Mode */}
                  <div
                    onClick={() => setAccessMode('postpaid')}
                    className={clsx(
                      'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between',
                      accessMode === 'postpaid'
                        ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">Postpaid Paywall</span>
                        {accessMode === 'postpaid' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Paywall upon submit. Applicant completes fields, then pays to commit response.
                      </p>
                    </div>
                    <span className="mt-3 text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                      Events / Bookings
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing & Fee Bearer Config Card (Visible if not free) */}
              {accessMode !== 'free' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Pricing & Fee Split Settings</h3>
                      <p className="text-xs text-slate-500">
                        Set your base price, currency, and who covers platform and transaction processing fees.
                      </p>
                    </div>
                  </div>

                  {/* Base Price and Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Base Price (Net Creator Price)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                          {CURRENCY_SYMBOLS[currency] || '$'}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.50"
                          required
                          value={basePrice}
                          onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="USD">USD ($) — United States Dollar</option>
                        <option value="EUR">EUR (€) — Euro</option>
                        <option value="GBP">GBP (£) — British Pound</option>
                        <option value="GHS">GHS (GH₵) — Ghanaian Cedi</option>
                        <option value="NGN">NGN (₦) — Nigerian Naira</option>
                        <option value="KES">KES (KSh) — Kenyan Shilling</option>
                      </select>
                    </div>
                  </div>

                  {/* Fee Bearer Toggle */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fee Bearer (Who pays the processing fees?)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                      <div
                        onClick={() => setFeeBearer('client')}
                        className={clsx(
                          'p-3.5 rounded-xl border-2 transition-all cursor-pointer',
                          feeBearer === 'client'
                            ? 'border-emerald-600 bg-emerald-50/30'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="feeBearer"
                            checked={feeBearer === 'client'}
                            onChange={() => setFeeBearer('client')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-bold text-slate-900">
                            Applicant / Client Bears Fees
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 pl-5">
                          Fees are added on top of your base price. You receive 100% of your net base price.
                        </p>
                      </div>

                      <div
                        onClick={() => setFeeBearer('creator')}
                        className={clsx(
                          'p-3.5 rounded-xl border-2 transition-all cursor-pointer',
                          feeBearer === 'creator'
                            ? 'border-emerald-600 bg-emerald-50/30'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="feeBearer"
                            checked={feeBearer === 'creator'}
                            onChange={() => setFeeBearer('creator')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-bold text-slate-900">
                            Creator Absorbs Fees
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 pl-5">
                          Applicant pays exact base price. Processing and platform fees are deducted from your payout.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Gateway Adapters */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enabled Payment Gateways
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
                      {/* Stripe */}
                      <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100/60">
                        <input
                          type="checkbox"
                          checked={enabledGateways.includes('stripe')}
                          onChange={() => toggleGateway('stripe')}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Stripe</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Cards, Apple/Google Pay</span>
                        </div>
                      </label>

                      {/* Paystack */}
                      <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100/60">
                        <input
                          type="checkbox"
                          checked={enabledGateways.includes('paystack')}
                          onChange={() => toggleGateway('paystack')}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                            <Globe className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Paystack</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Cards, Bank Accounts</span>
                        </div>
                      </label>

                      {/* Mobile Money */}
                      <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100/60">
                        <input
                          type="checkbox"
                          checked={enabledGateways.includes('momo')}
                          onChange={() => toggleGateway('momo')}
                          className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                            <span>Mobile Money</span>
                          </div>
                          <span className="text-[10px] text-slate-400">MTN MoMo, M-Pesa, Telecel</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </Link>

                <div className="flex items-center space-x-3">
                  {savedSuccess && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pricing settings updated!</span>
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-500/25 transition-colors cursor-pointer"
                  >
                    {saving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Split Fee Calculator Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Live Fee Breakdown</h3>
                    <p className="text-[11px] text-slate-400">Real-time split monetization preview</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                    {accessMode.toUpperCase()}
                  </span>
                </div>

                {accessMode === 'free' ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">Form is completely free</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      No fees will be charged to respondents or deducted from payouts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* What Applicant Pays Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Applicant Pays Total
                      </span>
                      <div className="text-2xl font-black text-slate-900 mt-0.5">
                        {formatMoney(feeBreakdown.totalCharged, currency)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Gross charge processed at checkout
                      </p>
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-2 text-xs border-y border-slate-100 py-3">
                      <div className="flex justify-between text-slate-600">
                        <span>Base Form Price:</span>
                        <span className="font-semibold text-slate-800">
                          {formatMoney(feeBreakdown.basePrice, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Dyno Forms Fee ({platformFeePercent}%):</span>
                        <span className="font-semibold text-slate-800">
                          {formatMoney(feeBreakdown.platformFee, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Gateway / Telco Fee ({gatewayFeePercent}%):</span>
                        <span className="font-semibold text-slate-800">
                          {formatMoney(feeBreakdown.gatewayFee, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Net Creator Payout Card */}
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Net Creator Payout
                      </span>
                      <div className="text-2xl font-black text-emerald-700 mt-0.5">
                        {formatMoney(feeBreakdown.creatorNet, currency)}
                      </div>
                      <p className="text-[10px] text-emerald-600 mt-1">
                        {feeBearer === 'client'
                          ? '100% of base price retained (Client covers processing fees)'
                          : 'Fees deducted from creator payout'}
                      </p>
                    </div>

                    {/* Supported Gateways Chips */}
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Active Checkout Gateways:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {enabledGateways.map((g) => (
                          <span
                            key={g}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
