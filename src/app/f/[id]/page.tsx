import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/db';
import { sampleFormSchema } from '@/data/initialSchema';
import { FormRenderer } from '@/components/runtime/FormRenderer';
import { getFormSchema } from '@/runtime/serverSchemaStorage';
import { getDraft } from '@/runtime/serverDraftStorage';
import { ArrowLeft, ShieldCheck, Layers, Clock, AlertCircle } from 'lucide-react';
import { FormSchema } from '@/types/schema';

interface FormPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resume?: string }>;
}

export default async function FormPage({ params, searchParams }: FormPageProps) {
  const { id } = await params;
  const { resume: resumeToken } = await searchParams;

  // 1. Try to fetch from PostgreSQL
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  let dbForm: any = null;
  try {
    dbForm = isUuid
      ? await prisma.form.findUnique({
          where: { id },
          include: { group: true },
        })
      : await prisma.form.findFirst({
          where: { slug: id },
          include: { group: true },
        });
  } catch (err) {
    // Database might be unreachable in offline test
  }

  // 2. Check Expiration & Lifecycle Status
  if (dbForm) {
    const isClosedOrArchived = dbForm.status === 'closed' || dbForm.status === 'archived';
    const isSoftDeleted = dbForm.status === 'soft_deleted';
    const isExpiredByTime = dbForm.expiresAt && new Date() > new Date(dbForm.expiresAt);
    const isQuotaExceeded =
      dbForm.submissionLimit && dbForm.submissionCount >= dbForm.submissionLimit;

    if (isSoftDeleted) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Form Not Found</h1>
            <p className="text-sm text-slate-600 mb-6">
              This form has been deleted or is no longer available.
            </p>
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </Link>
          </div>
        </div>
      );
    }

    if (isClosedOrArchived || isExpiredByTime || isQuotaExceeded) {
      const reasonTitle = isExpiredByTime
        ? 'Submission Deadline Has Passed'
        : isQuotaExceeded
        ? 'Maximum Submission Limit Reached'
        : 'Form Is Currently Closed';

      const reasonDesc = isExpiredByTime
        ? `Submissions for "${dbForm.title}" officially ended on ${new Date(dbForm.expiresAt).toLocaleDateString(undefined, { dateStyle: 'long' })}.`
        : isQuotaExceeded
        ? `This form has reached its target quota of ${dbForm.submissionLimit} responses and is no longer accepting new applicants.`
        : `This form has been closed by its administrators. Please check back later or contact the form host.`;

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Portal</span>
              </Link>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-lg w-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7" />
              </div>

              {dbForm.group && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-3">
                  {dbForm.group.name}
                </span>
              )}

              <h1 className="text-2xl font-bold text-slate-900 mb-2">{reasonTitle}</h1>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">{reasonDesc}</p>

              <div className="pt-4 border-t border-slate-100 flex justify-center space-x-3">
                <Link
                  href="/"
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Home</span>
                </Link>
              </div>
            </div>
          </main>
        </div>
      );
    }
  }

  // 3. Resolve Form Schema
  let schema: FormSchema | null = null;
  if (dbForm?.schema) {
    schema = dbForm.schema as unknown as FormSchema;
  }

  if (!schema) {
    schema = getFormSchema(id);
  }

  // 4. If draft token provided, check draft store
  if (!schema && resumeToken) {
    const draft = getDraft(id, resumeToken);
    if (draft?.schema) {
      schema = draft.schema;
    }
  }

  // 5. Fallback defaults
  if (!schema) {
    if (id === 'demo' || id === sampleFormSchema.id) {
      schema = sampleFormSchema;
    } else {
      schema = {
        ...sampleFormSchema,
        id,
        title: `${sampleFormSchema.title} (${id})`,
      };
    }
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
            href={`/builder?id=${encodeURIComponent(id)}`}
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
