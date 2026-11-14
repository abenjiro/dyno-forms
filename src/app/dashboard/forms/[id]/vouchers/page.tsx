'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ticket,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Edit3,
  ExternalLink,
  Users,
  X,
  FileSpreadsheet,
  Ban,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Printer,
  QrCode,
} from 'lucide-react';
import { AuthNav } from '@/components/auth/AuthNav';
import clsx from 'clsx';

interface VoucherItem {
  id: string;
  codeMasked: string;
  batchName: string | null;
  discountType: string;
  discountValue: number;
  maxUses: number;
  timesUsed: number;
  status: 'active' | 'exhausted' | 'revoked' | 'expired';
  expiresAt: string | null;
  createdAt: string;
  redemptionCount: number;
  scope: 'form' | 'cohort';
}

interface FormMeta {
  id: string;
  title: string;
  slug: string;
  group?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function VouchersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState<FormMeta | null>(null);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [batchNames, setBatchNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVouchers, setTotalVouchers] = useState(0);

  // Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGeneratedSuccessOpen, setIsGeneratedSuccessOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newPrefix, setNewPrefix] = useState('ADM-2026');
  const [newDiscountType, setNewDiscountType] = useState('full_waiver');
  const [newDiscountValue, setNewDiscountValue] = useState(0);
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [applyToCohort, setApplyToCohort] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Generation Modal Data
  const [generatedCodes, setGeneratedCodes] = useState<Array<{ id: string; code: string; codeMasked: string }>>([]);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Printable Cards Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [cardsToPrint, setCardsToPrint] = useState<
    Array<{
      serial: number;
      code: string;
      batchName: string;
      expiresAt: string | null;
      discountSummary: string;
    }>
  >([]);

  const handleOpenPrintModalFromGenerated = () => {
    const summary =
      newDiscountType === 'full_waiver'
        ? '100% Fee Waiver'
        : newDiscountType === 'percentage'
        ? `${newDiscountValue}% Discount`
        : `$${newDiscountValue} Credit`;

    setCardsToPrint(
      generatedCodes.map((c, i) => ({
        serial: i + 1,
        code: c.code,
        batchName: newBatchName || 'Voucher Batch',
        expiresAt: newExpiresAt || null,
        discountSummary: summary,
      }))
    );
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintModalFromTable = () => {
    setCardsToPrint(
      vouchers.map((v, i) => ({
        serial: i + 1,
        code: v.codeMasked,
        batchName: v.batchName || 'Voucher Batch',
        expiresAt: v.expiresAt,
        discountSummary:
          v.discountType === 'full_waiver'
            ? '100% Fee Waiver'
            : v.discountType === 'percentage'
            ? `${v.discountValue}% Discount`
            : `$${v.discountValue} Credit`,
      }))
    );
    setIsPrintModalOpen(true);
  };

  const fetchVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search: search.trim(),
        status: statusFilter,
        batchName: batchFilter,
      });

      const res = await fetch(`/api/forms/${encodeURIComponent(id)}/vouchers?${q}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const err = await res.json();
        throw new Error(err.error || 'Failed to load vouchers');
      }

      const data = await res.json();
      setForm(data.form);
      setVouchers(data.vouchers || []);
      setBatchNames(data.batchNames || []);
      setTotalPages(data.totalPages || 1);
      setTotalVouchers(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error fetching vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [id, page, statusFilter, batchFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVouchers();
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(id)}/vouchers/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: newBatchName.trim() || 'New Voucher Batch',
          quantity: newQuantity,
          prefix: newPrefix.trim() || 'ADM-2026',
          discountType: newDiscountType,
          discountValue: newDiscountValue,
          maxUses: newMaxUses,
          expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
          applyToCohort,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      setIsGenerateModalOpen(false);
      setGeneratedCodes(data.vouchers || []);
      setIsGeneratedSuccessOpen(true);
      fetchVouchers();
    } catch (err: any) {
      alert(err.message || 'Failed to generate voucher batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (voucherId: string, currentStatus: string) => {
    const nextAction = currentStatus === 'active' ? 'revoke' : 'activate';
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(id)}/vouchers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherId, action: nextAction }),
      });
      if (res.ok) {
        fetchVouchers();
      } else {
        const err = await res.json();
        alert(err.error || 'Action failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error toggling voucher status');
    }
  };

  const handleDownloadPlaintextCsv = () => {
    const headers = ['Serial', 'Voucher Code (Unmasked)', 'Masked Preview'];
    const rows = generatedCodes.map((v, i) => `"${i + 1}","${v.code}","${v.codeMasked}"`);
    const csvContent = [headers.join(','), ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form?.slug || 'form'}-new-batch-codes-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAllCodes = async () => {
    const text = generatedCodes.map((c) => c.code).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  // Metrics
  const activeCount = vouchers.filter((v) => v.status === 'active').length;
  const exhaustedCount = vouchers.filter((v) => v.status === 'exhausted').length;
  const totalRedemptions = vouchers.reduce((acc, v) => acc + (v.timesUsed || 0), 0);

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
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1">
                <Ticket className="w-3 h-3" />
                <span>Vouchers</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href={`/dashboard/forms/${encodeURIComponent(id)}/submissions`}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Submissions</span>
            </Link>

            {form && (
              <a
                href={`/api/forms/${encodeURIComponent(form.id)}/vouchers/export`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                title="Export Vouchers CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </a>
            )}

            <button
              onClick={handleOpenPrintModalFromTable}
              disabled={vouchers.length === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Print Physical Cards"
            >
              <Printer className="w-3.5 h-3.5 text-purple-600" />
              <span>Print Cards</span>
            </button>

            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs shadow-purple-500/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Batch</span>
            </button>

            <AuthNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Vouchers</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{totalVouchers}</div>
            <p className="text-[11px] text-slate-400 mt-2">Hashed & Cryptographically Safe</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Codes</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{activeCount}</div>
            <p className="text-[11px] text-slate-400 mt-2">Ready for redemption</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Exhausted / Used</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700">{exhaustedCount}</div>
            <p className="text-[11px] text-slate-400 mt-2">Caps reached or expired</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Redemptions</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-700">{totalRedemptions}</div>
            <p className="text-[11px] text-slate-400 mt-2">Responses unlocked</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by masked code or batch name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
            />
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {batchNames.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">All Batches</option>
                  {batchNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                <option value="active">Active</option>
                <option value="exhausted">Exhausted</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <button
              onClick={() => fetchVouchers()}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Refresh vouchers"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Vouchers Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading vouchers...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Error Loading Vouchers</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
          </div>
        ) : vouchers.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Vouchers Generated Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Create batches of single-use or multi-use voucher codes for institutional bank sales, orientation packs, or promotional fee waivers.
            </p>

            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="mt-6 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Generate First Batch</span>
            </button>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Masked Code</th>
                    <th className="py-3 px-4">Batch Name</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Usage (Times Used / Cap)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expires At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                        {v.codeMasked}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {v.batchName || 'General'}
                        {v.scope === 'cohort' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                            Cohort
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700">
                          {v.discountType === 'full_waiver'
                            ? '100% Waiver'
                            : v.discountType === 'percentage'
                            ? `${v.discountValue}% Off`
                            : `$${v.discountValue} Off`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-800">
                            {v.timesUsed} / {v.maxUses}
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={clsx(
                                'h-1.5 rounded-full',
                                v.timesUsed >= v.maxUses ? 'bg-amber-500' : 'bg-purple-600'
                              )}
                              style={{ width: `${Math.min(100, (v.timesUsed / v.maxUses) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            v.status === 'active' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                            v.status === 'exhausted' && 'bg-amber-50 text-amber-700 border border-amber-200',
                            v.status === 'revoked' && 'bg-red-50 text-red-700 border border-red-200'
                          )}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(v.id, v.status)}
                          className={clsx(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                            v.status === 'active'
                              ? 'text-red-700 bg-red-50 hover:bg-red-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          )}
                        >
                          {v.status === 'active' ? 'Revoke' : 'Reactivate'}
                        </button>
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
                <span className="font-semibold text-slate-800">{totalPages}</span> ({totalVouchers} vouchers)
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

      {/* Generate Batch Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generate Voucher Batch</h3>
                  <p className="text-xs text-slate-500">Create cryptographic codes for distribution</p>
                </div>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateBatch} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch Label / Campaign Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bank Branch Sales Batch 1"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity (1 - 1,000)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code Prefix
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ADM-2026"
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 font-mono uppercase border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newDiscountType}
                    onChange={(e) => setNewDiscountType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="full_waiver">Full Fee Waiver (100%)</option>
                    <option value="fixed_amount">Fixed Amount Discount</option>
                    <option value="percentage">Percentage Discount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Uses Per Code
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {form?.group && (
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    id="applyCohort"
                    checked={applyToCohort}
                    onChange={(e) => setApplyToCohort(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                  />
                  <label htmlFor="applyCohort" className="text-xs text-slate-700">
                    Apply to entire cohort <span className="font-semibold">"{form.group.name}"</span> (Valid across all forms in group)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Codes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Success / Plaintext Download Modal */}
      {isGeneratedSuccessOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {generatedCodes.length} Vouchers Generated!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Download or copy plaintext codes now for distribution.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGeneratedSuccessOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Security Notice:</strong> Plaintext codes are only displayed once upon generation. Future views in the table will be masked for cryptographic security.
              </span>
            </div>

            {/* Codes List Preview */}
            <div className="mt-4 max-h-56 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-1">
              {generatedCodes.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between hover:bg-slate-800/80 px-2 py-0.5 rounded">
                  <span>
                    <span className="text-slate-500 mr-2">{i + 1}.</span>
                    {c.code}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(c.code);
                      setCopiedCodeId(c.id);
                      setTimeout(() => setCopiedCodeId(null), 1500);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedCodeId === c.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={handleCopyAllCodes}
                className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {copiedBatch ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedBatch ? 'Copied All!' : 'Copy All Codes'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleOpenPrintModalFromGenerated}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Cards</span>
                </button>

                <button
                  onClick={handleDownloadPlaintextCsv}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Plaintext CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Printable Cards Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Printable Voucher Cards ({cardsToPrint.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Formatted for physical scratch cards, flyers, and registration desks.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print All Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Cards Grid Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60 print:p-0 print:bg-white">
              <div
                id="printable-cards-container"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:w-full"
              >
                {cardsToPrint.map((c) => (
                  <div
                    key={c.serial}
                    className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4 shadow-xs flex flex-col justify-between relative overflow-hidden print:border-slate-400 print:shadow-none print:break-inside-avoid"
                  >
                    {/* Top Stripe */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                          {c.batchName}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {form?.title || 'Dyno Forms Application'}
                        </h4>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          #{String(c.serial).padStart(3, '0')}
                        </span>
                      </div>
                    </div>

                    {/* Code Display Box */}
                    <div className="my-3 py-2 px-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-0.5">
                        Access Voucher Code
                      </span>
                      <span className="font-mono font-black text-base text-purple-900 tracking-wider select-all">
                        {c.code}
                      </span>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-end justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <div>
                        <p className="font-semibold text-emerald-700">{c.discountSummary}</p>
                        <p className="text-slate-400">
                          {c.expiresAt ? `Expires: ${new Date(c.expiresAt).toLocaleDateString()}` : 'No Expiry'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 text-purple-600 font-medium">
                        <QrCode className="w-5 h-5 text-slate-700" />
                        <span className="text-[9px] text-slate-400 leading-tight">
                          Enter at<br />Portal
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
