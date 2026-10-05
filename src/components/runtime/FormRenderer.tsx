'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormSchema, FieldNode, isFieldNode } from '@/types/schema';
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
  X,
} from 'lucide-react';
import clsx from 'clsx';

interface FormRendererProps {
  schema: FormSchema;
  initialValues?: Record<string, any>;
  resumeToken?: string;
  onSubmit?: (data: Record<string, any>) => Promise<any> | void;
  readOnly?: boolean;
  showDraftControls?: boolean;
}

export function FormRenderer({
  schema,
  initialValues,
  resumeToken,
  onSubmit,
  readOnly = false,
  showDraftControls = true,
}: FormRendererProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    submissionId?: string;
    timestamp?: string;
    message?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Draft & Auto-save states
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [isSavingServerDraft, setIsSavingServerDraft] = useState(false);
  const [serverResumeUrl, setServerResumeUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Compile dynamic Zod validation schema
  const zodSchema = useMemo(() => buildZodSchema(schema), [schema]);

  // Extract all fields to calculate defaults and completion progress
  const allFieldNodes = useMemo(() => {
    const flattened = flattenTree(schema.root);
    return flattened.filter((n): n is FieldNode => isFieldNode(n) && Boolean(n.name));
  }, [schema.root]);

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
    formState: { isDirty, isValid },
  } = methods;

  const currentValues = watch();

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
      if (resumeToken) {
        try {
          const serverDraft = await loadServerDraft(schema.id, resumeToken);
          if (serverDraft && isMounted) {
            reset(serverDraft.values);
            setLastAutoSaved(new Date(serverDraft.savedAt).toLocaleTimeString());
            return;
          }
        } catch (err) {
          console.warn('[FormRenderer] Could not load server draft token:', err);
        }
      }

      if (!initialValues) {
        const local = await loadLocalDraft(schema.id);
        if (local && isMounted && Object.keys(local.values).length > 0) {
          reset(local.values);
          setLastAutoSaved(new Date(local.savedAt).toLocaleTimeString());
        }
      }
    }

    hydrateDraft();
    return () => {
      isMounted = false;
    };
  }, [schema.id, resumeToken, initialValues, reset]);

  // Debounced auto-save to local storage (1500ms debounce)
  useEffect(() => {
    if (!schema.settings.enableDrafts || readOnly) return;
    if (submitSuccess) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (isDirty) {
        await saveLocalDraft(schema.id, currentValues, progressPercent);
        setLastAutoSaved(new Date().toLocaleTimeString());
      }
    }, schema.settings.draftAutoSaveIntervalMs || 1500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentValues, isDirty, schema.id, schema.settings.enableDrafts, schema.settings.draftAutoSaveIntervalMs, progressPercent, readOnly, submitSuccess]);

  // Save server draft & generate resume link
  const handleGenerateResumeLink = async () => {
    try {
      setIsSavingServerDraft(true);
      const res = await saveServerDraft(schema.id, currentValues);
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
  const onFormSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (onSubmit) {
        await onSubmit(data);
      } else if (schema.settings.submitUrl) {
        const response = await fetch(schema.settings.submitUrl, {
          method: schema.settings.submitMethod || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: schema.id,
            data,
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
      } else {
        // Fallback simulate submission
        await new Promise((r) => setTimeout(r, 600));
        setSubmitSuccess({
          submissionId: `sub_${Date.now()}`,
          timestamp: new Date().toISOString(),
          message: 'Form response captured successfully!',
        });
      }

      // Clear local draft upon successful submission
      await clearLocalDraft(schema.id);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        {/* Form Title & Header */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {schema.title}
          </h1>
          {schema.description && (
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              {schema.description}
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

              {showDraftControls && schema.settings.enableDrafts && !readOnly && (
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

        {/* Main Interactive Form Canvas */}
        <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
          <FormNodeRenderer node={schema.root} />

          {/* Form Actions Footer */}
          {!readOnly && (
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                {schema.settings.showReset && (
                  <button
                    type="button"
                    onClick={() => reset(defaultFormValues)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{schema.settings.resetLabel || 'Reset Form'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={clsx(
                    'w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all',
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
                    <span>{schema.settings.submitLabel || 'Submit Form'}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </FormProvider>
  );
}
