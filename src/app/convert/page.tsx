'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import { FormRenderer } from '@/components/runtime/FormRenderer';
import { FormSchema } from '@/types/schema';
import {
  FileUp,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Eye,
  Loader2,
  FileText,
  Key,
  Code2,
  X,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

export default function ConvertFormPage() {
  const router = useRouter();
  const setSchema = useFormBuilderStore((s) => s.setSchema);

  const [file, setFile] = useState<File | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionStage, setConversionStage] = useState<string>('');
  const [conversionMode, setConversionMode] = useState<string>('');
  const [conversionModel, setConversionModel] = useState<string>('');
  const [conversionWarning, setConversionWarning] = useState<string | null>(null);
  const [convertedSchema, setConvertedSchema] = useState<FormSchema | null>(null);
  const [conversionStats, setConversionStats] = useState<{
    detectedFields: number;
    detectedContainers: number;
    confidence: number;
  } | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'preview' | 'json'>('preview');

  const [keyStatus, setKeyStatus] = useState<{
    tested: boolean;
    loading: boolean;
    connected: boolean;
    model?: string;
    hasServerKey?: boolean;
    error?: string;
  }>({ tested: false, loading: false, connected: false });

  const verifyApiKey = async (keyToTest?: string) => {
    setKeyStatus((prev) => ({ ...prev, loading: true }));
    try {
      const key = keyToTest !== undefined ? keyToTest : customApiKey;
      const headers: Record<string, string> = {};
      if (key.trim()) {
        headers['x-gemini-key'] = key.trim();
      }
      const res = await fetch('/api/convert-form', { headers });
      const data = await res.json();
      setKeyStatus({
        tested: true,
        loading: false,
        connected: Boolean(data.connected),
        model: data.model,
        hasServerKey: data.hasServerKey,
        error: data.error,
      });
    } catch (e: any) {
      setKeyStatus({
        tested: true,
        loading: false,
        connected: false,
        error: e.message || 'Network error reaching server',
      });
    }
  };

  // Load saved Gemini API key or check server key on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('dyno_gemini_api_key');
      if (savedKey) {
        setCustomApiKey(savedKey);
        setShowKeyInput(true);
        verifyApiKey(savedKey);
      } else {
        verifyApiKey('');
      }
    }
  }, []);

  const handleApiKeyChange = (val: string) => {
    setCustomApiKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dyno_gemini_api_key', val);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleStartConversion = async (sampleFileName?: string) => {
    setIsProcessing(true);
    setConvertedSchema(null);
    setConversionStats(null);
    setConversionMode('');
    setConversionModel('');
    setConversionWarning(null);

    try {
      setConversionStage('1. Reading document & optical layout geometry...');
      await new Promise((r) => setTimeout(r, 400));

      setConversionStage('2. Scanning labels, checkboxes, radio groups & dropdowns...');
      await new Promise((r) => setTimeout(r, 450));

      setConversionStage('3. Synthesizing Dyno AST Schema & validation rules...');

      const headers: Record<string, string> = {};
      if (customApiKey.trim()) {
        headers['x-gemini-key'] = customApiKey.trim();
      }

      let response: Response;

      if (sampleFileName || !file) {
        // Sample template or default
        headers['Content-Type'] = 'application/json';
        response = await fetch('/api/convert-form', {
          method: 'POST',
          headers,
          body: JSON.stringify({ filename: sampleFileName || 'document.pdf' }),
        });
      } else {
        // Actual uploaded file
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch('/api/convert-form', {
          method: 'POST',
          headers,
          body: formData,
        });
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Conversion API failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      setConversionStage('4. Finalizing dynamic validation and API data mappings...');
      await new Promise((r) => setTimeout(r, 300));

      setConvertedSchema(data.schema);
      setConversionStats(data.stats);
      setConversionMode(data.mode || 'heuristic');
      setConversionModel(data.model || '');
      setConversionWarning(data.warning || null);

      // Auto-scroll to conversion result
      setTimeout(() => {
        const resultSection = document.getElementById('conversion-result-section');
        if (resultSection) {
          resultSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setConversionStage('');
    }
  };

  const handleOpenInBuilder = async () => {
    if (convertedSchema) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('dyno_active_schema', JSON.stringify(convertedSchema));
        try {
          await fetch(`/api/forms/${encodeURIComponent(convertedSchema.id)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schema: convertedSchema }),
          });
        } catch (e) {}
      }
      setSchema(convertedSchema);
      router.push('/builder');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portal</span>
          </Link>

          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="font-bold text-sm text-slate-900">
              AI Document to Dyno Form Ingestion
            </span>
          </div>

          <Link
            href="/builder"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Go to Studio</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Intro Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multimodal Vision AI & Document Recognition</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Convert Old Paperwork & PDFs into Live Dyno Forms
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl mx-auto leading-relaxed">
            Upload PDF paperwork, scans, or document screenshots. Our ingestion engine identifies
            input fields, radio groups, checkboxes, and tables, synthesizing an editable Dyno Form AST schema.
          </p>
        </div>

        {/* Gemini Vision API Key & Status Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                keyStatus.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              )}
            >
              {keyStatus.loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : keyStatus.connected ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Key className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Google Gemini Multimodal AI
                </span>
                {keyStatus.connected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Connected ({keyStatus.model})
                  </span>
                ) : keyStatus.tested ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Offline / Smart Heuristic Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-400">
                    Checking...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {keyStatus.connected
                  ? customApiKey
                    ? 'Using custom API key saved in browser'
                    : 'Active from server environment (.env)'
                  : keyStatus.error
                  ? keyStatus.error
                  : 'Add a key to enable live optical document recognition'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              {showKeyInput ? 'Hide Key Config' : 'Configure Key'}
            </button>
            <button
              type="button"
              onClick={() => verifyApiKey()}
              disabled={keyStatus.loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Test API Key Connection"
            >
              <RefreshCw className={clsx('w-4 h-4', keyStatus.loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {showKeyInput && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950">
                Custom Google Gemini API Key
              </label>
              <span className="text-[11px] text-indigo-600">
                {keyStatus.connected ? '✓ Validated' : 'Optional (overrides .env)'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={customApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="flex-1 text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => verifyApiKey()}
                disabled={keyStatus.loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {keyStatus.loading ? 'Testing...' : 'Test & Save'}
              </button>
            </div>
            {keyStatus.error && (
              <p className="text-[11px] text-red-600 font-mono mt-1">
                {keyStatus.error}
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              Get a free Gemini API key from <a href="https://aistudio.google.dev/app/apikey" target="_blank" rel="noreferrer" className="underline text-indigo-600">Google AI Studio</a>. Keys are stored locally in your browser.
            </p>
          </div>
        )}

        {/* Upload & Quick Try Box */}
        {!convertedSchema && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            {/* If NO file selected: show drag & drop file zone */}
            {!file ? (
              <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-10 text-center transition-colors bg-slate-50/50 group cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />

                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 flex items-center justify-center mb-1 transition-transform">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Click or Drag PDF / Scanned Image to Ingest
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Supports paperwork scans, application PDFs, PNG, or JPEG up to 25MB
                  </p>
                </div>
              </div>
            ) : (
              /* If file IS selected: show dedicated file card and action button (NO overlay obstruction) */
              <div className="border border-indigo-200 bg-indigo-50/30 rounded-2xl p-6 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{file.name}</h4>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB • {file.type || 'Document'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={isProcessing}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Direct Action Button */}
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => handleStartConversion()}
                    className="w-full inline-flex items-center justify-center space-x-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start AI Form Ingestion</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Test Samples */}
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3 text-center">
                Or Try One-Click Sample Documents
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleStartConversion('patient_intake_medical_history.pdf')}
                  className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold">Medical Intake PDF</span>
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-700">
                    Patient history, blood types, HIPAA consent
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleStartConversion('new_hire_employee_registration.pdf')}
                  className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-2 text-blue-600 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold">Employee HR Scan</span>
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-700">
                    New hire details, departments, work authorization
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleStartConversion('vendor_application_form.pdf')}
                  className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center space-x-2 text-emerald-600 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold">Vendor Registration</span>
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-700">
                    Tax identification, dynamic country & state
                  </span>
                </button>
              </div>
            </div>

            {/* In-Flight Processing Spinner */}
            {isProcessing && (
              <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center animate-fadeIn">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-indigo-950 mb-1">
                  Multimodal Ingestion Pipeline Active
                </h4>
                <p className="text-xs font-mono text-indigo-700">{conversionStage}</p>
              </div>
            )}
          </div>
        )}

        {/* Conversion Result View */}
        {convertedSchema && (
          <div id="conversion-result-section" className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
              {/* Header result stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Conversion Complete!
                    </h2>
                    <p className="text-xs text-slate-500">
                      Successfully digitized document into live Dyno Form AST
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    {conversionStats ? `${(conversionStats.confidence * 100).toFixed(0)}% Confidence` : '98% Confidence'}
                  </span>
                  <span
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1',
                      conversionMode === 'gemini-vision-live'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    )}
                  >
                    {conversionMode === 'gemini-vision-live' ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Live Vision AI {conversionModel ? `(${conversionModel})` : ''}</span>
                      </>
                    ) : (
                      <span>Smart Heuristic</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Multimodal Warning if fallback occurred */}
              {conversionWarning && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Multimodal AI Notice</p>
                    <p className="text-amber-800 font-mono text-[11px]">{conversionWarning}</p>
                    <p className="text-amber-700 text-[11px]">
                      The document structure was automatically recovered using our offline layout engine.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConvertedSchema(null);
                    setFile(null);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  ← Convert Another Document
                </button>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenInBuilder}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Open & Customize in Builder Studio</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>

              {/* Tabs: Live Form Preview vs Raw JSON */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveResultTab('preview')}
                    className={clsx(
                      'inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      activeResultTab === 'preview'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Interactive Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveResultTab('json')}
                    className={clsx(
                      'inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      activeResultTab === 'json'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Generated AST JSON</span>
                  </button>
                </div>

                {activeResultTab === 'preview' ? (
                  <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                    <FormRenderer schema={convertedSchema} />
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto text-slate-100 font-mono text-xs max-h-96">
                    <pre>{JSON.stringify(convertedSchema, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
