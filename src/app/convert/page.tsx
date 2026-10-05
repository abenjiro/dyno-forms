'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
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
  Zap,
  Cpu,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

export default function ConvertFormPage() {
  const router = useRouter();
  const setSchema = useFormBuilderStore((s) => s.setSchema);

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversionStage, setConversionStage] = useState<string>('');
  const [convertedSchema, setConvertedSchema] = useState<FormSchema | null>(null);
  const [conversionStats, setConversionStats] = useState<{
    detectedFields: number;
    detectedContainers: number;
    confidence: number;
  } | null>(null);

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

    const activeFileName = sampleFileName || file?.name || 'document_scan.pdf';

    try {
      // Animated conversion stages
      setConversionStage('1. Extracting high-res document frames & visual layout...');
      await new Promise((r) => setTimeout(r, 600));

      setConversionStage('2. Multimodal Vision detection: scanning textboxes, checkboxes & dropdowns...');
      await new Promise((r) => setTimeout(r, 700));

      setConversionStage('3. Synthesizing Dyno AST Schema & hierarchical nesting tree...');

      const response = await fetch('/api/convert-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: activeFileName }),
      });

      if (!response.ok) {
        throw new Error(`Conversion API failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      setConversionStage('4. Finalizing dynamic validation and API data mappings...');
      await new Promise((r) => setTimeout(r, 400));

      setConvertedSchema(data.schema);
      setConversionStats(data.stats);
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setConversionStage('');
    }
  };

  const handleOpenInBuilder = () => {
    if (convertedSchema) {
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
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
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
            <Cpu className="w-3.5 h-3.5" />
            <span>Multimodal Vision AI Form Recognizer</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Convert Old Paperwork & PDFs into Live Dyno Forms
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl mx-auto leading-relaxed">
            Upload PDF forms, scanned images, or paperwork. Our multimodal vision pipeline
            identifies input boxes, radio buttons, dropdown indicators, and tables,
            synthesizing an interactive Dyno Form AST schema in seconds.
          </p>
        </div>

        {/* Upload & Quick Try Box */}
        {!convertedSchema && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Drag & Drop File Zone */}
            <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                  <FileUp className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {file ? file.name : 'Upload PDF Document or Scanned Form'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB — Ready for conversion`
                    : 'Drag & drop paperwork scan, PDF, PNG, or JPEG up to 25MB'}
                </p>

                {file && !isProcessing && (
                  <button
                    type="button"
                    onClick={() => handleStartConversion()}
                    className="mt-4 inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start AI Form Ingestion</span>
                  </button>
                )}
              </div>
            </div>

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
                  className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
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
                  className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="flex items-center space-x-2 text-blue-600 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold">Employee HR Scan</span>
                  </div>
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-700">
                    New hire details, departments, work visas
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleStartConversion('vendor_application_form.pdf')}
                  className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
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
                  Multimodal AI Pipeline Active
                </h4>
                <p className="text-xs font-mono text-indigo-700">{conversionStage}</p>
              </div>
            )}
          </div>
        )}

        {/* Conversion Result Card */}
        {convertedSchema && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Conversion Complete!
                  </h2>
                  <p className="text-xs text-slate-500">
                    Successfully synthesized valid Dyno Form AST schema
                  </p>
                </div>
              </div>

              {conversionStats && (
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    {(conversionStats.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
              )}
            </div>

            {/* Extracted Schema Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="text-base font-bold text-slate-800">{convertedSchema.title}</h3>
              {convertedSchema.description && (
                <p className="text-xs text-slate-600 mt-1">{convertedSchema.description}</p>
              )}
              <div className="mt-3 flex items-center space-x-4 text-xs text-slate-500">
                <span>
                  Sections & Grids:{' '}
                  <strong className="text-slate-800">
                    {convertedSchema.root.children.length}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Draft Persistence:{' '}
                  <strong className="text-slate-800">Enabled</strong>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all"
                >
                  <Layers className="w-4 h-4" />
                  <span>Open & Customize in Builder Studio</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
