'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  FolderPlus,
  Search,
  LayoutGrid,
  List,
  ExternalLink,
  Edit3,
  Copy,
  Check,
  MoreVertical,
  Archive,
  Trash2,
  Clock,
  Users,
  Ticket,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  Loader2,
  Folder,
} from 'lucide-react';
import { AuthNav } from '@/components/auth/AuthNav';
import clsx from 'clsx';

interface FormItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived' | 'soft_deleted';
  currentVersion: number;
  submissionCount: number;
  voucherCount?: number;
  expiresAt: string | null;
  submissionLimit: number | null;
  createdAt: string;
  updatedAt: string;
  group?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface GroupItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  formCount: number;
}

export default function DashboardPage() {
  const router = useRouter();

  const [forms, setForms] = useState<FormItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [isNewFormModalOpen, setIsNewFormModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);

  // New form fields
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [newTemplate, setNewTemplate] = useState<'blank' | 'vendor'>('vendor');

  // New group fields
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [formsRes, groupsRes] = await Promise.all([
        fetch('/api/forms'),
        fetch('/api/groups'),
      ]);

      if (formsRes.ok) {
        const formsData = await formsRes.json();
        setForms(formsData.forms || []);
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData.groups || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/f/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/forms/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to duplicate form:', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to delete form:', err);
    }
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmittingModal(true);
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          groupId: newGroupId || undefined,
          template: newTemplate,
          status: 'published',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsNewFormModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewGroupId('');
        loadData();
        // Redirect to builder
        if (data.form?.id) {
          router.push(`/builder?id=${encodeURIComponent(data.form.id)}`);
        }
      }
    } catch (err) {
      console.error('Failed to create form:', err);
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setSubmittingModal(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsNewGroupModalOpen(false);
        setNewGroupName('');
        setNewGroupDescription('');
        loadData();
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setSubmittingModal(false);
    }
  };

  // Filtered forms
  const filteredForms = forms.filter((f) => {
    if (selectedGroup && f.group?.id !== selectedGroup) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchSlug = f.slug.toLowerCase().includes(q);
      const matchDesc = f.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchSlug && !matchDesc) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissionCount || 0), 0);
  const publishedForms = forms.filter((f) => f.status === 'published').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Dyno Forms
              </span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
              Creator Dashboard
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/builder"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Studio Builder</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsNewFormModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/25 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Form</span>
            </button>

            <span className="text-slate-200">|</span>

            <AuthNav />
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* KPI Analytics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Forms</span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{forms.length}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Live & Published</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{publishedForms}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Submissions</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalSubmissions}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Form Groups / Folders</span>
              <Folder className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-slate-900">{groups.length}</p>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Groups Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGroup(null)}
              className={clsx(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer',
                selectedGroup === null
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              <span>All Forms</span>
              <span
                className={clsx(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  selectedGroup === null ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {forms.length}
              </span>
            </button>

            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroup(group.id)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer',
                  selectedGroup === group.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{group.name}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    selectedGroup === group.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {group.formCount}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsNewGroupModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 text-xs font-semibold transition-colors flex items-center space-x-1 whitespace-nowrap cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Group</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search forms by name, slug or description..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status Tabs */}
            <div className="bg-slate-200/70 p-1 rounded-xl flex items-center space-x-1 text-xs">
              {(['all', 'published', 'draft', 'closed', 'archived'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer',
                    statusFilter === status
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="bg-slate-200/70 p-1 rounded-xl flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={clsx(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                )}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section: Forms Grid or Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading forms repository...</span>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No forms found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery || statusFilter !== 'all' || selectedGroup
                  ? 'No forms match your current filters. Try resetting search or status filters.'
                  : 'Get started by creating your first enterprise dynamic form or importing an existing document.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewFormModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Form</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          form.status === 'published' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                          form.status === 'draft' && 'bg-slate-100 text-slate-700 border border-slate-200',
                          form.status === 'closed' && 'bg-amber-50 text-amber-700 border border-amber-200',
                          form.status === 'archived' && 'bg-purple-50 text-purple-700 border border-purple-200'
                        )}
                      >
                        {form.status}
                      </span>

                      {form.group && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[130px]">
                          {form.group.name}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-medium text-slate-400">
                      v{form.currentVersion}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                    {form.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                    {form.description || 'No description provided.'}
                  </p>

                  {/* Metadata Chips: Submissions, Expiration */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <Link
                      href={`/dashboard/forms/${form.id}/submissions`}
                      className="flex items-center space-x-1 font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                      title="View form submissions"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{form.submissionCount} submissions</span>
                    </Link>

                    {form.expiresAt ? (
                      <span className="flex items-center space-x-1 text-amber-600 text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>Closes {new Date(form.expiresAt).toLocaleDateString()}</span>
                      </span>
                    ) : form.submissionLimit ? (
                      <span className="text-[11px] text-slate-500">
                        Cap: {form.submissionLimit}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Actions Bottom Bar */}
                <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(form.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                      title="Copy Public Link"
                    >
                      {copiedId === form.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(form.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                      title="Duplicate Form"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          form.id,
                          form.status === 'published' ? 'closed' : 'published'
                        )
                      }
                      className={clsx(
                        'px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors',
                        form.status === 'published'
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      )}
                    >
                      {form.status === 'published' ? 'Close' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(form.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Delete Form"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/dashboard/forms/${form.id}/submissions`}
                      className="inline-flex items-center space-x-1 text-slate-600 hover:text-blue-600 text-xs font-semibold"
                      title="View Responses"
                    >
                      <Users className="w-3 h-3" />
                      <span>Data</span>
                    </Link>

                    <Link
                      href={`/dashboard/forms/${form.id}/vouchers`}
                      className="inline-flex items-center space-x-1 text-slate-600 hover:text-purple-600 text-xs font-semibold"
                      title="Manage Vouchers"
                    >
                      <Ticket className="w-3 h-3" />
                      <span>Vouchers</span>
                    </Link>

                    <Link
                      href={`/f/${form.id}`}
                      target="_blank"
                      className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                    >
                      <span>Public</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <Link
                      href={`/builder?id=${encodeURIComponent(form.id)}`}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Studio</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Form Title</th>
                  <th className="py-3 px-4">Group / Folder</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Responses</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{form.title}</div>
                      <div className="text-[11px] font-normal text-slate-400 font-mono">
                        /f/{form.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {form.group ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {form.group.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          form.status === 'published' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                          form.status === 'draft' && 'bg-slate-100 text-slate-700 border border-slate-200',
                          form.status === 'closed' && 'bg-amber-50 text-amber-700 border border-amber-200',
                          form.status === 'archived' && 'bg-purple-50 text-purple-700 border border-purple-200'
                        )}
                      >
                        {form.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <Link
                        href={`/dashboard/forms/${form.id}/submissions`}
                        className="inline-flex items-center space-x-1.5 text-blue-600 hover:text-blue-800 hover:underline"
                        title="View Submissions"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{form.submissionCount}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(form.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(form.id)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800"
                          title="Copy Link"
                        >
                          {copiedId === form.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(form.id)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800"
                          title="Duplicate"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          href={`/f/${form.id}`}
                          target="_blank"
                          className="p-1 rounded text-slate-500 hover:text-slate-800"
                          title="Open Public Form"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <Link
                          href={`/builder?id=${encodeURIComponent(form.id)}`}
                          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px]"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(form.id)}
                          className="p-1 rounded text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal: Create New Form */}
      {isNewFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create New Form</h2>
            <p className="text-xs text-slate-500 mb-5">
              Build a dynamic drag-and-drop form or start from an existing template.
            </p>

            <form onSubmit={handleCreateForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 2026 Academic Admissions"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief summary of this form's intent..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Group / Initiative (Optional)
                </label>
                <select
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">No Group (Standalone Form)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Initial Template
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={clsx(
                      'border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between',
                      newTemplate === 'vendor'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <input
                      type="radio"
                      name="template"
                      value="vendor"
                      checked={newTemplate === 'vendor'}
                      onChange={() => setNewTemplate('vendor')}
                      className="sr-only"
                    />
                    <span className="font-bold">Enterprise Vendor</span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Includes sections, multi-column grids & validation
                    </span>
                  </label>

                  <label
                    className={clsx(
                      'border rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between',
                      newTemplate === 'blank'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <input
                      type="radio"
                      name="template"
                      value="blank"
                      checked={newTemplate === 'blank'}
                      onChange={() => setNewTemplate('blank')}
                      className="sr-only"
                    />
                    <span className="font-bold">Blank Canvas</span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Empty container ready for custom drag-and-drop
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submittingModal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create & Launch Studio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Group */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <h2 className="text-lg font-bold text-slate-900 mb-1">New Form Group</h2>
            <p className="text-xs text-slate-500 mb-5">
              Organize related application forms under a single initiative or cohort (e.g. 2025/2026 Admissions).
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Group / Initiative Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. 2025/2026 Academic Admissions"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Optional details or instructions for this cohort..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submittingModal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
