import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sampleFormSchema } from '@/data/initialSchema';
import { FormRenderer } from '@/components/runtime/FormRenderer';
import { ArrowLeft, ShieldCheck, Layers } from 'lucide-react';

interface FormPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resume?: string }>;
}

export default async function FormPage({ params, searchParams }: FormPageProps) {
  const { id } = await params;
  const { resume: resumeToken } = await searchParams;

  // In production/full DB mode, fetch schema by ID from storage.
  // For demo/prototype, resolve sample schema if matching or if demo.
  let schema = sampleFormSchema;
  if (id !== 'demo' && id !== sampleFormSchema.id) {
    // If not demo or sample id, we can still fall back or show 404 if unknown
    // To allow flexible testing, we use sampleFormSchema as demo preview
    schema = {
      ...sampleFormSchema,
      id,
      title: `${sampleFormSchema.title} (${id})`,
    };
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner & Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal</span>
          </Link>

          <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-Bit Encrypted Form Session</span>
          </div>

          <Link
            href="/builder"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open in Builder</span>
          </Link>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 py-8">
        <FormRenderer
          schema={schema}
          resumeToken={resumeToken}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-slate-400">
          Powered by <span className="font-semibold text-slate-600">Dyno Forms Engine</span>. All submissions securely validated with Zod & React Hook Form.
        </div>
      </footer>
    </div>
  );
}
