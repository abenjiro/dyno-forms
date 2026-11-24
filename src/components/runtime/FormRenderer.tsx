'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormSchema, FieldNode, isFieldNode, isContainerNode } from '@/types/schema';
import { flattenTree } from '@/store/treeMutations';
import { buildZodSchema } from '@/runtime/validationBuilder';
import {
  saveLocalDraft,
  loadLocalDraft,
  clearLocalDraft,
  saveServerDraft,
  loadServerDraft,
} from '@/runtime/draftManager';
import { FormNodeRenderer } from './FormNodeRenderer';
import {
  CheckCircle2,
  Bookmark,
  Share2,
  RotateCcw,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Ticket,
  X,
  CreditCard,
  DollarSign,
  Lock,
  ShieldCheck,
  Smartphone,
  Globe,
  ArrowRight,
} from 'lucide-react';
import {
  calculateFeeBreakdown,
  formatMoney,
  PricingConfig,
  PaymentGatewayType,
} from '@/lib/payments';
import clsx from 'clsx';

export interface FormRuntimeContextValue {
  formId?: string;
  readOnly?: boolean;
}

export const FormRuntimeContext = React.createContext<FormRuntimeContextValue>({});
export const useFormRuntime = () => React.useContext(FormRuntimeContext);

interface FormRendererProps {
  schema: FormSchema;
  initialValues?: Record<string, any>;
  resumeToken?: string;
  onSubmit?: (data: Record<string, any>) => Promise<any> | void;
  readOnly?: boolean;
  showDraftControls?: boolean;
}

export function FormRenderer({
  schema: initialSchema,
  initialValues,
  resumeToken,
  onSubmit,
  readOnly = false,
  showDraftControls = true,
}: FormRendererProps) {
  const [activeSchema, setActiveSchema] = useState<FormSchema>(initialSchema);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    submissionId?: string;
    timestamp?: string;
    message?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync activeSchema when initialSchema prop changes
  useEffect(() => {
    setActiveSchema(initialSchema);
  }, [initialSchema]);

  // Draft & Auto-save states
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [isSavingServerDraft, setIsSavingServerDraft] = useState(false);
  const [serverResumeUrl, setServerResumeUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Voucher Code state
  const [voucherInput, setVoucherInput] = useState('');
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    codeMasked: string;
    discountSummary: string;
  } | null>(null);

  const handleVerifyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsVerifyingVoucher(true);
    setVoucherError(null);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(activeSchema.id)}/vouchers/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherInput.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedVoucher({
          code: voucherInput.trim().toUpperCase(),
          codeMasked: data.codeMasked,
          discountSummary: data.discountSummary,
        });
        setVoucherInput('');
      } else {
        setVoucherError(data.error || 'Invalid voucher code');
      }
    } catch (err: any) {
      setVoucherError('Failed to verify voucher');
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  // Pricing & Monetization State
  const pricingConfig: PricingConfig | null = (activeSchema.pricingConfig as unknown as PricingConfig) || null;
  const isPrepaid = pricingConfig?.accessMode === 'prepaid' && (pricingConfig.basePrice || 0) > 0;
  const isPostpaid = pricingConfig?.accessMode === 'postpaid' && (pricingConfig.basePrice || 0) > 0;

  const feeBreakdown = useMemo(() => {
    if (!pricingConfig || pricingConfig.accessMode === 'free' || !pricingConfig.basePrice) return null;
    return calculateFeeBreakdown(
      pricingConfig.basePrice,
      pricingConfig.currency,
      pricingConfig.feeBearer,
      pricingConfig.platformFeePercent,
      pricingConfig.gatewayFeePercent
    );
  }, [pricingConfig]);

  const [isPrepaidUnlocked, setIsPrepaidUnlocked] = useState(false);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('stripe');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Postpaid Checkout Modal State
  const [isPostpaidCheckoutOpen, setIsPostpaidCheckoutOpen] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] = useState<Record<string, any> | null>(null);

  const isFullyWaived = Boolean(
    appliedVoucher && (appliedVoucher.discountSummary.includes('100%') || appliedVoucher.discountSummary.includes('Waiver'))
  );
  const canAccessFields = !isPrepaid || isPrepaidUnlocked || isFullyWaived;

  const handleProcessPayment = async (mode: 'prepaid' | 'postpaid', submissionDataToSubmit?: Record<string, any>) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      // 1. Initialize Payment Session
      const initRes = await fetch(`/api/forms/${encodeURIComponent(activeSchema.id)}/payments/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: selectedGateway,
          payerEmail: watch('email') || watch('applicantEmail') || undefined,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || 'Failed to initialize payment');
      }

      const initData = await initRes.json();

      // 2. Complete/Verify Payment (Simulating gateway success for instant verification)
      const verifyRes = await fetch(`/api/forms/${encodeURIComponent(activeSchema.id)}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: initData.paymentId,
          reference: initData.reference,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Payment verification failed');
      }

      const verifyData = await verifyRes.json();

      if (mode === 'prepaid') {
        setIsPrepaidUnlocked(true);
        setUnlockToken(verifyData.unlockToken);
        setPaymentReference(verifyData.reference);
      } else if (mode === 'postpaid') {
        const dataToPost = submissionDataToSubmit || pendingSubmissionData || watch();
        setIsPostpaidCheckoutOpen(false);
        await executeFinalSubmission(dataToPost, {
          paymentId: verifyData.paymentId,
          paymentReference: verifyData.reference,
        });
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment transaction failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Compile dynamic Zod validation schema
  const zodSchema = useMemo(() => buildZodSchema(activeSchema), [activeSchema]);

  // Extract all fields to calculate defaults and completion progress
  const allFieldNodes = useMemo(() => {
    const flattened = flattenTree(activeSchema.root);
    return flattened.filter((n): n is FieldNode => isFieldNode(n) && Boolean(n.name));
  }, [activeSchema.root]);

  const defaultFormValues = useMemo(() => {
    const defaults: Record<string, any> = {};
    for (const f of allFieldNodes) {
      if (f.defaultValue !== undefined) {
        defaults[f.name] = f.defaultValue;
      }
    }
    return { ...defaults, ...(initialValues || {}) };
  }, [allFieldNodes, initialValues]);

  const methods = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultFormValues,
    mode: 'onTouched',
  });

  const {
    handleSubmit,
    watch,
    reset,
    trigger,
    formState: { isDirty, isValid },
  } = methods;

  const currentValues = watch();

  // Multi-Step Form Wizard mode setup
  const isWizardMode = activeSchema.settings.layoutMode === 'wizard' && activeSchema.root.children.length > 1;
  const wizardSteps = activeSchema.root.children;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Field names belonging to the current step (for step validation before advancing)
  const currentStepFieldNames = useMemo(() => {
    if (!isWizardMode || !wizardSteps[currentStepIndex]) return [];
    const stepNode = wizardSteps[currentStepIndex];
    const stepNodes = isContainerNode(stepNode) ? flattenTree(stepNode) : [stepNode];
    return stepNodes
      .filter((n): n is FieldNode => isFieldNode(n) && Boolean(n.name))
      .map((f) => f.name);
  }, [isWizardMode, wizardSteps, currentStepIndex]);

  const handleNextStep = async () => {
    if (currentStepFieldNames.length > 0) {
      const isStepValid = await trigger(currentStepFieldNames);
      if (!isStepValid) return;
    }
    if (currentStepIndex < wizardSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Calculate completion percentage
  const progressPercent = useMemo(() => {
    const requiredFields = allFieldNodes.filter((f) => f.validation?.required);
    if (requiredFields.length === 0) return 100;

    let filledCount = 0;
    for (const rf of requiredFields) {
      const val = currentValues[rf.name];
      if (val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0)) {
        filledCount++;
      }
    }
    return Math.min(100, Math.round((filledCount / requiredFields.length) * 100));
  }, [allFieldNodes, currentValues]);

  // Load draft on mount (resume token takes precedence over local draft)
  useEffect(() => {
    let isMounted = true;

    async function hydrateDraft() {
      // 1. If an explicit server resume token is provided, hydrate that draft session
      if (resumeToken) {
        try {
          const serverDraft = await loadServerDraft(activeSchema.id, resumeToken);
          if (serverDraft && isMounted) {
            if (serverDraft.schema) {
              setActiveSchema(serverDraft.schema);
            }
            reset(serverDraft.values);
            setLastAutoSaved(new Date(serverDraft.savedAt).toLocaleTimeString());
            return;
          }
        } catch (err) {
          console.warn('[FormRenderer] Could not load server draft token:', err);
        }
      }

      // 2. Otherwise restore previously saved local values for this form if available
      if (!initialValues && !resumeToken) {
        const local = await loadLocalDraft(activeSchema.id);
        if (local && isMounted && local.values && Object.keys(local.values).length > 0) {
          reset(local.values);
          setLastAutoSaved(new Date(local.savedAt).toLocaleTimeString());
        }
      }
    }

    hydrateDraft();
    return () => {
      isMounted = false;
    };
  }, [activeSchema.id, resumeToken, initialValues, reset]);

  // Debounced auto-save to local storage (1500ms debounce)
  useEffect(() => {
    if (!activeSchema.settings.enableDrafts || readOnly) return;
    if (submitSuccess) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (isDirty) {
        await saveLocalDraft(activeSchema.id, currentValues, progressPercent, activeSchema);
        setLastAutoSaved(new Date().toLocaleTimeString());
      }
    }, activeSchema.settings.draftAutoSaveIntervalMs || 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentValues, isDirty, activeSchema, progressPercent, readOnly, submitSuccess]);

  // Save server draft & generate resume link
  const handleGenerateResumeLink = async () => {
    try {
      setIsSavingServerDraft(true);
      const res = await saveServerDraft(activeSchema.id, currentValues, activeSchema);
      const fullUrl = `${window.location.origin}${res.resumeUrl}`;
      setServerResumeUrl(fullUrl);
    } catch (err: any) {
      alert(`Could not save draft: ${err.message}`);
    } finally {
      setIsSavingServerDraft(false);
    }
  };

  const copyResumeLink = async () => {
    if (serverResumeUrl) {
      await navigator.clipboard.writeText(serverResumeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Form submission handler
  const executeFinalSubmission = async (
    data: Record<string, any>,
    paymentMeta?: { paymentId?: string; paymentReference?: string }
  ) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        const submitUrl = activeSchema.settings?.submitUrl || '/api/forms/submit';
        const submitMethod = activeSchema.settings?.submitMethod || 'POST';

        const response = await fetch(submitUrl, {
          method: submitMethod,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: activeSchema.id,
            data,
            voucherCode: appliedVoucher?.code || undefined,
            unlockToken: unlockToken || undefined,
            paymentId: paymentMeta?.paymentId || undefined,
            paymentReference: paymentMeta?.paymentReference || paymentReference || undefined,
            submittedAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        setSubmitSuccess({
          submissionId: result.submissionId,
          timestamp: result.timestamp || new Date().toISOString(),
          message: result.message || 'Thank you! Your response has been securely recorded.',
        });
      }

      // Clear local draft upon successful submission
      await clearLocalDraft(activeSchema.id);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFormSubmit = async (data: Record<string, any>) => {
    if (isPostpaid && !isFullyWaived) {
      setPendingSubmissionData(data);
      setIsPostpaidCheckoutOpen(true);
      return;
    }
    await executeFinalSubmission(data);
  };

  // Success view
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xl text-center animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Submission Successful!</h2>
        <p className="text-slate-600 mb-6">{submitSuccess.message}</p>

        {submitSuccess.submissionId && (
          <div className="inline-block px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 mb-6">
            Reference ID: <span className="font-semibold text-slate-900">{submitSuccess.submissionId}</span>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              reset(defaultFormValues);
              setSubmitSuccess(null);
            }}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <FormRuntimeContext.Provider value={{ formId: activeSchema.id, readOnly }}>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        {/* Form Title & Header */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {activeSchema.title}
          </h1>
          {activeSchema.description && (
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              {activeSchema.description}
            </p>
          )}

          {/* Form Progress Bar & Draft Save Status */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 flex-1 max-w-md">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                {progressPercent}% Complete
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-500">
              {lastAutoSaved && (
                <span className="flex items-center space-x-1 text-slate-500">
                  <Bookmark className="w-3.5 h-3.5 text-blue-500" />
                  <span>Draft saved ({lastAutoSaved})</span>
                </span>
              )}

              {showDraftControls && activeSchema.settings.enableDrafts && !readOnly && (
                <button
                  type="button"
                  onClick={handleGenerateResumeLink}
                  disabled={isSavingServerDraft}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                >
                  {isSavingServerDraft ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  <span>Save & Resume Later</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Server Resume Link Modal Dialog */}
        {serverResumeUrl && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-start justify-between shadow-sm animate-fadeIn">
            <div className="flex-1 pr-4">
              <h4 className="text-sm font-bold flex items-center space-x-1.5">
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Your Draft Has Been Saved to Cloud!</span>
              </h4>
              <p className="text-xs text-indigo-800 mt-1 mb-2">
                Use this link to resume filling this form anytime from any computer or mobile device:
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={serverResumeUrl}
                  className="w-full text-xs font-mono bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={copyResumeLink}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setServerResumeUrl(null)}
              className="text-indigo-400 hover:text-indigo-700 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Submit Error Alert */}
        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        {/* Unlocked Banner for Prepaid / Waived Forms */}
        {canAccessFields && (isPrepaidUnlocked || isFullyWaived) && isPrepaid && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs animate-fadeIn">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">Application Access Unlocked</p>
                <p className="text-[11px] text-emerald-700">
                  {appliedVoucher
                    ? `Institutional waiver applied: ${appliedVoucher.discountSummary}`
                    : 'Entrance payment verified. You may complete and submit the form.'}
                </p>
              </div>
            </div>
            {paymentReference && (
              <span className="font-mono text-[10px] bg-white px-2 py-1 rounded-md border border-emerald-200 text-emerald-700">
                Ref: {paymentReference}
              </span>
            )}
          </div>
        )}

        {/* If Prepaid and Locked: Render Entrance Paywall Card */}
        {!canAccessFields && feeBreakdown ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-10 animate-fadeIn">
            <div className="text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                Prepaid Application Fee
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-3">
                Entrance Fee Required to Access Form
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                This application requires payment of an access fee before you can view and complete the questions.
              </p>
            </div>

            {/* Price Breakdown Box */}
            <div className="max-w-md mx-auto my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <span className="text-xs text-slate-600">Base Application Fee:</span>
                <span className="text-xs font-semibold text-slate-800">
                  {formatMoney(feeBreakdown.basePrice, feeBreakdown.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <span className="text-xs text-slate-600">Platform & Gateway Fees:</span>
                <span className="text-xs font-semibold text-slate-800">
                  {feeBreakdown.feeBearer === 'client'
                    ? formatMoney(feeBreakdown.totalFees, feeBreakdown.currency)
                    : 'Included'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-slate-900">Total to Unlock:</span>
                <span className="text-xl font-black text-purple-700">
                  {formatMoney(feeBreakdown.totalCharged, feeBreakdown.currency)}
                </span>
              </div>
            </div>

            {/* Gateway Selection & Actions */}
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Choose Payment Method:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('stripe')}
                    className={clsx(
                      'p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer',
                      selectedGateway === 'stripe'
                        ? 'border-purple-600 bg-purple-50/60 text-purple-700 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[11px]">Card / Stripe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGateway('momo')}
                    className={clsx(
                      'p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer',
                      selectedGateway === 'momo'
                        ? 'border-purple-600 bg-purple-50/60 text-purple-700 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[11px]">MoMo / Mobile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedGateway('paystack')}
                    className={clsx(
                      'p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer',
                      selectedGateway === 'paystack'
                        ? 'border-purple-600 bg-purple-50/60 text-purple-700 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-[11px]">Paystack</span>
                  </button>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={() => handleProcessPayment('prepaid')}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Pay {formatMoney(feeBreakdown.totalCharged, feeBreakdown.currency)} & Unlock Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Or Voucher Code option */}
              <div className="pt-4 border-t border-slate-200 text-center">
                <span className="text-[11px] text-slate-400 block mb-2">
                  Have an institutional fee voucher code?
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Enter voucher code (e.g. ADM-2026-XXXX)"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={isVerifyingVoucher || !voucherInput.trim()}
                    onClick={handleVerifyVoucher}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {isVerifyingVoucher ? 'Checking...' : 'Redeem'}
                  </button>
                </div>
                {voucherError && (
                  <p className="text-[11px] text-red-600 mt-1.5 text-left">{voucherError}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Main Interactive Form Canvas */
          <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
          {isWizardMode ? (
            <div className="space-y-6">
              {/* Stepper Navigation Bar */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-blue-600 uppercase tracking-wider">
                    Step {currentStepIndex + 1} of {wizardSteps.length}: {wizardSteps[currentStepIndex].label || `Step ${currentStepIndex + 1}`}
                  </span>
                  <span className="text-slate-500 font-medium">
                    {Math.round(((currentStepIndex + 1) / wizardSteps.length) * 100)}% of steps
                  </span>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center space-x-2">
                  {wizardSteps.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={async () => {
                          if (idx < currentStepIndex) {
                            setCurrentStepIndex(idx);
                          } else if (idx === currentStepIndex + 1) {
                            handleNextStep();
                          }
                        }}
                        disabled={idx > currentStepIndex}
                        className={clsx(
                          'flex-1 flex items-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-left truncate',
                          isCompleted && 'border-emerald-300 bg-emerald-50 text-emerald-800 cursor-pointer',
                          isCurrent && 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20 shadow-xs',
                          !isCompleted && !isCurrent && 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                        )}
                      >
                        <span
                          className={clsx(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                            isCompleted && 'bg-emerald-600 text-white',
                            isCurrent && 'bg-blue-600 text-white',
                            !isCompleted && !isCurrent && 'bg-slate-200 text-slate-600'
                          )}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </span>
                        <span className="truncate hidden sm:inline">{step.label || `Step ${idx + 1}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Step Content */}
              <div className="animate-fadeIn">
                <FormNodeRenderer node={wizardSteps[currentStepIndex]} />
              </div>
            </div>
          ) : (
            <FormNodeRenderer node={activeSchema.root} />
          )}

          {/* Voucher / Fee Waiver Input Section */}
          {!readOnly && (!isWizardMode || currentStepIndex === wizardSteps.length - 1) && (
            <div className="mt-8 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-xs">
              {appliedVoucher ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-emerald-900 font-mono">
                          {appliedVoucher.codeMasked}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-200 text-emerald-800">
                          {appliedVoucher.discountSummary}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Voucher verified and applied to this application.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedVoucher(null);
                      setVoucherInput('');
                    }}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors self-end sm:self-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 mb-2 text-xs font-semibold text-slate-700">
                    <Ticket className="w-3.5 h-3.5 text-purple-600" />
                    <span>Have an institutional voucher or fee waiver code?</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Enter voucher code (e.g. ADM-2026-XXXX)"
                        value={voucherInput}
                        onChange={(e) => {
                          setVoucherInput(e.target.value.toUpperCase());
                          if (voucherError) setVoucherError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleVerifyVoucher();
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-800 placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyVoucher}
                      disabled={isVerifyingVoucher || !voucherInput.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      {isVerifyingVoucher ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Apply Voucher</span>
                      )}
                    </button>
                  </div>
                  {voucherError && (
                    <p className="text-[11px] text-red-600 mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{voucherError}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Actions Footer */}
          {!readOnly && (
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                {isWizardMode ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStepIndex === 0}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium text-sm transition-colors cursor-pointer"
                  >
                    <span>← Previous Step</span>
                  </button>
                ) : (
                  activeSchema.settings.showReset && (
                    <button
                      type="button"
                      onClick={() => reset(defaultFormValues)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-sm transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{activeSchema.settings.resetLabel || 'Reset Form'}</span>
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                {isWizardMode && currentStepIndex < wizardSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/25 cursor-pointer"
                  >
                    <span>Next Step →</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={clsx(
                      'w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all cursor-pointer',
                      'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/25',
                      isSubmitting && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Submission...</span>
                      </>
                    ) : (
                      <span>{activeSchema.settings.submitLabel || 'Submit Form'}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
        )}

        {/* Postpaid Submission Payment Checkout Modal */}
        {isPostpaidCheckoutOpen && feeBreakdown && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Application Fee Checkout</h3>
                    <p className="text-xs text-slate-500">Complete payment to finalize submission</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPostpaidCheckoutOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Fee Breakdown */}
              <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Form Submission Fee:</span>
                  <span className="font-semibold text-slate-800">
                    {formatMoney(feeBreakdown.basePrice, feeBreakdown.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Platform & Gateway Fee:</span>
                  <span className="font-semibold text-slate-800">
                    {feeBreakdown.feeBearer === 'client'
                      ? formatMoney(feeBreakdown.totalFees, feeBreakdown.currency)
                      : 'Included'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Due:</span>
                  <span className="text-lg font-black text-emerald-700">
                    {formatMoney(feeBreakdown.totalCharged, feeBreakdown.currency)}
                  </span>
                </div>
              </div>

              {/* Gateway Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Payment Gateway</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('stripe')}
                    className={clsx(
                      'p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer',
                      selectedGateway === 'stripe'
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-700 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px]">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('momo')}
                    className={clsx(
                      'p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer',
                      selectedGateway === 'momo'
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-700 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[10px]">Mobile Money</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGateway('paystack')}
                    className={clsx(
                      'p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer',
                      selectedGateway === 'paystack'
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-700 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-[10px]">Paystack</span>
                  </button>
                </div>

                {paymentError && (
                  <p className="text-xs text-red-600 mt-2 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{paymentError}</span>
                  </p>
                )}

                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={() => handleProcessPayment('postpaid')}
                  className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Payment & Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Pay {formatMoney(feeBreakdown.totalCharged, feeBreakdown.currency)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </FormRuntimeContext.Provider>
    </FormProvider>
  );
}
