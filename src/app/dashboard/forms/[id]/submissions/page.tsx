'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  ExternalLink,
  Edit3,
  Copy,
  Check,
  Ticket,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  Globe,
  Layers,
} from 'lucide-react';
import { AuthNav } from '@/components/auth/AuthNav';
import clsx from 'clsx';

interface SubmissionItem {
  id: string;
  formId: string;
  formVersion: number;
  submitterId: string | null;
  voucherId: string | null;
  data: Record<string, any>;
  paymentStatus: string;
  voucherCode: string | null;
  ipHash: string | null;
  userAgent: string | null;
  submittedAt: string;
  submitter?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  voucher?: {
    id: string;
    codeMasked: string;
    batchName: string | null;
    discountType: string;
  } | null;
}

interface FormMeta {
  id: string;
  title: string;
  slug: string;
  status: string;
  currentVersion: number;
  submissionCount: number;
  submissionLimit: number | null;
  expiresAt: string | null;
  group?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  schema?: any;
}

export default function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormMeta | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  // Detail Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted');

  // Fetch Submissions from API
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: search.trim(),
        status: statusFilter,
      });

      const res = await fetch(`/api/forms/${encodeURIComponent(id)}/submissions?${queryParams}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const err = await res.json();
        throw new Error(err.error || 'Failed to load submissions');
      }

      const data = await res.json();
      setForm(data.form);
      setSubmissions(data.submissions || []);
      setTotalPages(data.totalPages || 1);
      setTotalSubmissions(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error fetching submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [id, page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/f/${form?.id || id}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyText = async (text: string, idStr: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(idStr);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteSubmission = async (subId: string) => {
    if (!confirm('Are you sure you want to permanently delete this submission?')) return;
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(id)}/submissions?submissionId=${subId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedSubmission?.id === subId) setSelectedSubmission(null);
        fetchSubmissions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete submission');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting submission');
    }
  };

  // Extract display columns from submissions
  const sampleDataKeys = Array.from(
    new Set(
      submissions.flatMap((s) => (s.data && typeof s.data === 'object' ? Object.keys(s.data) : []))
    )
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
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
                {form?.title || 'Form Submissions'}
              </span>
              <span className="text-slate-300">/</span>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Responses
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {form && (
              <a
                href={`/api/forms/${encodeURIComponent(form.id)}/submissions/export`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                title="Download CSV of all responses"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </a>
            )}

            <Link
              href={`/builder?id=${encodeURIComponent(id)}`}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Studio</span>
            </Link>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Public Form</span>
                </>
              )}
            </button>

            <AuthNav />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col space-y-6">
        {/* Header Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Submissions</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{totalSubmissions}</span>
              {form?.submissionLimit && (
                <span className="text-xs text-slate-400">/ cap {form.submissionLimit}</span>
              )}
            </div>
            {form?.submissionLimit && (
              <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (totalSubmissions / form.submissionLimit) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Form Status</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                  form?.status === 'published' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  form?.status === 'draft' && 'bg-slate-100 text-slate-700 border border-slate-200',
                  form?.status === 'closed' && 'bg-amber-50 text-amber-700 border border-amber-200',
                  form?.status === 'archived' && 'bg-purple-50 text-purple-700 border border-purple-200'
                )}
              >
                {form?.status || 'published'}
              </span>
              {form?.group && (
                <span className="text-xs text-slate-500 truncate">({form.group.name})</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono truncate">
              ID: {form?.id || id}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Voucher Redemptions</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900">
                {submissions.filter((s) => s.voucherCode || s.voucherId).length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Verified via institutional codes</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Latest Submission</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-900 truncate">
              {submissions.length > 0
                ? new Date(submissions[0].submittedAt).toLocaleString()
                : 'No submissions yet'}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">AST Version: v{form?.currentVersion || 1}</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search responses by name, email, voucher, or answer value..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="free">Free Submission</option>
                <option value="voucher_waived">Voucher Waived</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <button
              onClick={() => fetchSubmissions()}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Refresh submissions"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Submissions Table / View */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading submissions...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Error Loading Submissions</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchSubmissions()}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : submissions.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Submissions Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {search || statusFilter !== 'all'
                ? 'No responses matched your search criteria. Try resetting filters.'
                : 'This form has not received any submissions yet. Share the public form link to begin collecting data.'}
            </p>

            <div className="mt-6 flex items-center justify-center space-x-3">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Public Form Link</span>
              </button>

              <Link
                href={`/f/${form?.id || id}`}
                target="_blank"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Form</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Submissions Data Table */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Ref ID</th>
                    <th className="py-3 px-4">Submitted At</th>
                    {sampleDataKeys.map((key) => (
                      <th key={key} className="py-3 px-4 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                    <th className="py-3 px-4">Status / Voucher</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {sub.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div>{new Date(sub.submittedAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(sub.submittedAt).toLocaleTimeString()}
                        </div>
                      </td>
                      {sampleDataKeys.map((key) => {
                        const val = sub.data?.[key];
                        return (
                          <td key={key} className="py-3 px-4 max-w-xs truncate text-slate-800 font-medium">
                            {typeof val === 'object' && val !== null
                              ? JSON.stringify(val)
                              : val !== undefined
                              ? String(val)
                              : '—'}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              sub.paymentStatus === 'free' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                              sub.paymentStatus === 'voucher_waived' && 'bg-purple-50 text-purple-700 border border-purple-200',
                              sub.paymentStatus === 'paid' && 'bg-blue-50 text-blue-700 border border-blue-200',
                              sub.paymentStatus === 'pending' && 'bg-amber-50 text-amber-700 border border-amber-200'
                            )}
                          >
                            {sub.paymentStatus.replace('_', ' ')}
                          </span>

                          {sub.voucherCode && (
                            <span className="font-mono text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              {sub.voucherCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Response Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Submission"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing page <span className="font-semibold text-slate-800">{page}</span> of{' '}
                <span className="font-semibold text-slate-800">{totalPages}</span> ({totalSubmissions} records)
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Response Detail Drawer / Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">Submission Details</h2>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      selectedSubmission.paymentStatus === 'free' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                      selectedSubmission.paymentStatus === 'voucher_waived' && 'bg-purple-50 text-purple-700 border border-purple-200',
                      selectedSubmission.paymentStatus === 'paid' && 'bg-blue-50 text-blue-700 border border-blue-200'
                    )}
                  >
                    {selectedSubmission.paymentStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono text-xs text-slate-500">{selectedSubmission.id}</span>
                  <button
                    onClick={() => handleCopyText(selectedSubmission.id, 'modal-id')}
                    className="text-slate-400 hover:text-slate-700"
                    title="Copy UUID"
                  >
                    {copiedId === 'modal-id' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-slate-200 px-6 bg-slate-50/50">
              <button
                onClick={() => setActiveTab('formatted')}
                className={clsx(
                  'py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors',
                  activeTab === 'formatted'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                Formatted Answers
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={clsx(
                  'py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors',
                  activeTab === 'raw'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                )}
              >
                Raw JSON Payload
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {activeTab === 'formatted' ? (
                <>
                  {/* Metadata Card */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Submitted At</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(selectedSubmission.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Form Version</span>
                      <span className="font-semibold text-slate-800">
                        Version {selectedSubmission.formVersion}
                      </span>
                    </div>

                    {selectedSubmission.voucherCode && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Redeemed Voucher</span>
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {selectedSubmission.voucherCode}
                        </span>
                      </div>
                    )}

                    {selectedSubmission.submitter && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Authenticated Submitter</span>
                        <span className="font-semibold text-slate-800">
                          {selectedSubmission.submitter.fullName || selectedSubmission.submitter.email} (
                          {selectedSubmission.submitter.email})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Answers Section */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Recorded Form Responses
                    </h3>

                    <div className="space-y-3">
                      {selectedSubmission.data &&
                        Object.entries(selectedSubmission.data).map(([key, val]) => (
                          <div
                            key={key}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs"
                          >
                            <span className="text-xs font-semibold text-slate-500 block capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <div className="text-sm font-medium text-slate-900 mt-1">
                              {typeof val === 'object' && val !== null ? (
                                <pre className="bg-slate-50 p-2 rounded text-xs overflow-x-auto text-slate-700 font-mono">
                                  {JSON.stringify(val, null, 2)}
                                </pre>
                              ) : (
                                String(val || '—')
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Audit Metadata */}
                  <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
                    <div>
                      <span className="font-semibold text-slate-500">Client IP Hash:</span>{' '}
                      <span className="font-mono">{selectedSubmission.ipHash || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">User Agent:</span>{' '}
                      <span className="truncate block font-mono">
                        {selectedSubmission.userAgent || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Raw JSON */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">Raw JSON Representation</span>
                    <button
                      onClick={() =>
                        handleCopyText(JSON.stringify(selectedSubmission, null, 2), 'raw-json')
                      }
                      className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      {copiedId === 'raw-json' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedSubmission, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                className="inline-flex items-center space-x-1.5 text-red-600 hover:text-red-700 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Submission</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
