'use client';

import React, { useState, useMemo } from 'react';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import { findNodeById, getAllFieldNames as getFieldNamesFromTree } from '@/store/treeMutations';
import { FormNode, StaticOption, ConditionalRule } from '@/types/schema';
import {
  Sliders,
  ShieldCheck,
  Zap,
  GitBranch,
  Layers,
  Plus,
  Trash2,
  Info,
  Settings,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

export function PropertyInspector() {
  const selectedNodeId = useFormBuilderStore((s) => s.selectedNodeId);
  const schema = useFormBuilderStore((s) => s.schema);
  const updateNodeProps = useFormBuilderStore((s) => s.updateNodeProps);
  const updateFormSettings = useFormBuilderStore((s) => s.updateFormSettings);
  const updateFormMeta = useFormBuilderStore((s) => s.updateFormMeta);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return findNodeById(schema.root, selectedNodeId);
  }, [schema.root, selectedNodeId]);

  const allFieldNames = useMemo(() => {
    return getFieldNamesFromTree(schema.root);
  }, [schema.root]);

  const [activeTab, setActiveTab] = useState<'general' | 'validation' | 'data' | 'conditions' | 'layout'>('general');

  // If no node selected, display Form Settings Inspector
  if (!selectedNodeId || !selectedNode || selectedNode.type === 'canvas') {
    return (
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center space-x-2">
          <Settings className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Form Settings & Meta
          </h2>
        </div>

        <div className="p-4 space-y-5 flex-1">
          {/* Form Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Form Title</label>
              <input
                type="text"
                value={schema.title}
                onChange={(e) => updateFormMeta({ title: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
              <textarea
                rows={3}
                value={schema.description || ''}
                onChange={(e) => updateFormMeta({ description: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Form Layout Mode: Single-Page vs Wizard */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Form Layout Mode</label>
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => updateFormSettings({ layoutMode: 'single-page' })}
                className={clsx(
                  'flex-1 py-1.5 rounded-md font-medium transition-all cursor-pointer',
                  (schema.settings.layoutMode || 'single-page') === 'single-page'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Single Page
              </button>
              <button
                type="button"
                onClick={() => updateFormSettings({ layoutMode: 'wizard' })}
                className={clsx(
                  'flex-1 py-1.5 rounded-md font-medium transition-all cursor-pointer',
                  schema.settings.layoutMode === 'wizard'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Multi-Step Wizard
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              {schema.settings.layoutMode === 'wizard'
                ? 'Paginates top-level sections into steps with stepper progress and Next/Prev controls.'
                : 'Displays all sections together on a continuous scrolling page.'}
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Form Action Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Submission & Actions
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Submit Button Label</label>
              <input
                type="text"
                value={schema.settings.submitLabel || 'Submit Form'}
                onChange={(e) => updateFormSettings({ submitLabel: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Submit Endpoint URL</label>
              <input
                type="text"
                value={schema.settings.submitUrl || '/api/forms/submit'}
                onChange={(e) => updateFormSettings({ submitUrl: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="text-xs font-medium text-slate-700">Show Reset Button</label>
              <input
                type="checkbox"
                checked={schema.settings.showReset ?? false}
                onChange={(e) => updateFormSettings({ showReset: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
            </div>

            {schema.settings.showReset && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reset Button Label</label>
                <input
                  type="text"
                  value={schema.settings.resetLabel || 'Clear Form'}
                  onChange={(e) => updateFormSettings({ resetLabel: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Drafts & Auto-save */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Drafts & Continuity
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">Enable Auto-Save Drafts</span>
                <span className="text-[11px] text-slate-500 block">Saves inputs to local storage</span>
              </div>
              <input
                type="checkbox"
                checked={schema.settings.enableDrafts ?? true}
                onChange={(e) => updateFormSettings({ enableDrafts: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
          Click any canvas component to inspect its properties.
        </div>
      </aside>
    );
  }

  const isContainer = selectedNode.isContainer;
  const isLeafField = !isContainer;
  const supportsDynamicData = selectedNode.type === 'select' || selectedNode.type === 'radio';

  // Tabs for inspector
  const tabs = [
    { id: 'general', label: 'General', icon: Sliders },
    ...(isLeafField ? [{ id: 'validation', label: 'Validation', icon: ShieldCheck }] : []),
    ...(supportsDynamicData ? [{ id: 'data', label: 'API / Data', icon: Zap }] : []),
    ...(isContainer ? [{ id: 'layout', label: 'Layout', icon: Layers }] : []),
    { id: 'conditions', label: 'Logic', icon: GitBranch },
  ];

  // Safe mutations
  const handlePropChange = (key: keyof FormNode, val: any) => {
    updateNodeProps(selectedNode.id, { [key]: val } as any);
  };

  const handleValidationChange = (key: string, val: any) => {
    const currentVal = (selectedNode as any).validation || {};
    updateNodeProps(selectedNode.id, {
      validation: {
        ...currentVal,
        [key]: val,
      },
    } as any);
  };

  const handleLayoutChange = (key: string, val: any) => {
    const currentLayout = (selectedNode as any).layoutProps || {};
    updateNodeProps(selectedNode.id, {
      layoutProps: {
        ...currentLayout,
        [key]: val,
      },
    } as any);
  };

  // Vault secret state for selected node
  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isVaultSaving, setIsVaultSaving] = useState(false);
  const [vaultSuccess, setVaultSuccess] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const handleSaveSecret = async () => {
    if (!selectedNode || !secretInput.trim()) return;
    setIsVaultSaving(true);
    setVaultError(null);
    setVaultSuccess(null);
    try {
      const curApi = (selectedNode as any).dataSource?.api || {};
      const chosenAuthType = curApi.authType || 'bearer';
      const chosenHeaderName =
        curApi.headerName || (chosenAuthType === 'api_key' ? 'X-API-Key' : 'Authorization');

      const res = await fetch(`/api/forms/${encodeURIComponent(schema.id)}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: selectedNode.id,
          authType: chosenAuthType,
          headerName: chosenHeaderName,
          secret: secretInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to encrypt secret');
      }

      updateNodeProps(selectedNode.id, {
        dataSource: {
          type: 'api',
          api: {
            ...curApi,
            useProxy: true,
            hasSecret: true,
            authType: chosenAuthType,
            headerName: chosenHeaderName,
          },
        },
      } as any);

      setSecretInput('');
      setVaultSuccess('Encrypted with AES-256-GCM and saved to vault!');
      setTimeout(() => setVaultSuccess(null), 4000);
    } catch (err: any) {
      setVaultError(err.message || 'Error saving secret');
    } finally {
      setIsVaultSaving(false);
    }
  };

  const handleDeleteSecret = async () => {
    if (!selectedNode) return;
    setIsVaultSaving(true);
    setVaultError(null);
    setVaultSuccess(null);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(schema.id)}/secrets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: selectedNode.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete secret');
      }

      const curApi = (selectedNode as any).dataSource?.api || {};
      updateNodeProps(selectedNode.id, {
        dataSource: {
          type: 'api',
          api: {
            ...curApi,
            hasSecret: false,
          },
        },
      } as any);

      setVaultSuccess('Secret removed from vault');
      setTimeout(() => setVaultSuccess(null), 3000);
    } catch (err: any) {
      setVaultError(err.message || 'Error deleting secret');
    } finally {
      setIsVaultSaving(false);
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden select-none">
      {/* Node Inspector Header */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
            {selectedNode.type}
          </span>
          <span className="text-xs font-semibold text-slate-700 ml-2 font-mono truncate">
            {selectedNode.id}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-100/60 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={clsx(
                'flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Display Label</label>
              <input
                type="text"
                value={selectedNode.label || ''}
                onChange={(e) => handlePropChange('label', e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {isLeafField && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Field Key Name <span className="text-slate-400 font-normal">(React Hook Form)</span>
                </label>
                <input
                  type="text"
                  value={selectedNode.name || ''}
                  onChange={(e) => handlePropChange('name', e.target.value.replace(/\s+/g, '_'))}
                  className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Description / Subtitle</label>
              <textarea
                rows={2}
                value={selectedNode.description || ''}
                onChange={(e) => handlePropChange('description', e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {isLeafField && (
              <>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={selectedNode.placeholder || ''}
                    onChange={(e) => handlePropChange('placeholder', e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Helper Hint Text</label>
                  <input
                    type="text"
                    value={selectedNode.helperText || ''}
                    onChange={(e) => handlePropChange('helperText', e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* VALIDATION TAB */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Required Field</span>
                <span className="text-[11px] text-slate-500">Marks input as mandatory</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean((selectedNode as any).validation?.required)}
                onChange={(e) => handleValidationChange('required', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
              />
            </div>

            {(selectedNode as any).validation?.required && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Custom Required Error Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. This field is required to proceed"
                  value={(selectedNode as any).validation?.requiredMessage || ''}
                  onChange={(e) => handleValidationChange('requiredMessage', e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {selectedNode.type === 'text' && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Email Validation</span>
                  <span className="text-[11px] text-slate-500">Requires valid email format</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean((selectedNode as any).validation?.email)}
                  onChange={(e) => handleValidationChange('email', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
              </div>
            )}

            {selectedNode.type === 'number' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Min Value</label>
                  <input
                    type="number"
                    value={(selectedNode as any).validation?.min ?? ''}
                    onChange={(e) =>
                      handleValidationChange('min', e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Max Value</label>
                  <input
                    type="number"
                    value={(selectedNode as any).validation?.max ?? ''}
                    onChange={(e) =>
                      handleValidationChange('max', e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* DYNAMIC API / OPTIONS TAB */}
        {activeTab === 'data' && supportsDynamicData && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Data Source Type</label>
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    updateNodeProps(selectedNode.id, {
                      dataSource: { type: 'static', staticOptions: (selectedNode as any).dataSource?.staticOptions || [] },
                    } as any)
                  }
                  className={clsx(
                    'flex-1 py-1.5 rounded-md font-medium transition-all',
                    (selectedNode as any).dataSource?.type !== 'api'
                      ? 'bg-white text-blue-600 shadow-sm font-semibold'
                      : 'text-slate-600'
                  )}
                >
                  Static Options
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateNodeProps(selectedNode.id, {
                      dataSource: {
                        type: 'api',
                        api: {
                          url: 'http://localhost:4050/api/countries',
                          labelPath: 'name.common',
                          valuePath: 'cca2',
                        },
                      },
                    } as any)
                  }
                  className={clsx(
                    'flex-1 py-1.5 rounded-md font-medium transition-all',
                    (selectedNode as any).dataSource?.type === 'api'
                      ? 'bg-white text-blue-600 shadow-sm font-semibold'
                      : 'text-slate-600'
                  )}
                >
                  Dynamic REST API
                </button>
              </div>
            </div>

            {/* STATIC OPTIONS EDITOR */}
            {(selectedNode as any).dataSource?.type !== 'api' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Option Choices</span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentOptions: StaticOption[] = (selectedNode as any).dataSource?.staticOptions || [];
                      const nextIndex = currentOptions.length + 1;
                      updateNodeProps(selectedNode.id, {
                        dataSource: {
                          type: 'static',
                          staticOptions: [
                            ...currentOptions,
                            { label: `Option ${nextIndex}`, value: `option_${nextIndex}` },
                          ],
                        },
                      } as any);
                    }}
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Choice</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {((selectedNode as any).dataSource?.staticOptions || []).map(
                    (opt: StaticOption, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Label"
                          value={opt.label}
                          onChange={(e) => {
                            const newOptions = [...(selectedNode as any).dataSource.staticOptions];
                            newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                            updateNodeProps(selectedNode.id, {
                              dataSource: { type: 'static', staticOptions: newOptions },
                            } as any);
                          }}
                          className="flex-1 text-xs rounded border border-slate-300 px-2 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={opt.value}
                          onChange={(e) => {
                            const newOptions = [...(selectedNode as any).dataSource.staticOptions];
                            newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                            updateNodeProps(selectedNode.id, {
                              dataSource: { type: 'static', staticOptions: newOptions },
                            } as any);
                          }}
                          className="w-24 text-xs font-mono rounded border border-slate-300 px-2 py-1.5"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = (selectedNode as any).dataSource.staticOptions.filter(
                              (_: any, i: number) => i !== idx
                            );
                            updateNodeProps(selectedNode.id, {
                              dataSource: { type: 'static', staticOptions: newOptions },
                            } as any);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              /* DYNAMIC API CONFIGURATION */
              <div className="space-y-3 border border-indigo-100 bg-indigo-50/40 p-3 rounded-xl">
                <div className="flex items-center space-x-1.5 text-indigo-700">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">API Connection Details</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">API Endpoint URL</label>
                  <input
                    type="text"
                    placeholder="http://localhost:4050/api/countries"
                    value={(selectedNode as any).dataSource?.api?.url || ''}
                    onChange={(e) => {
                      const cur = (selectedNode as any).dataSource?.api || {};
                      updateNodeProps(selectedNode.id, {
                        dataSource: { type: 'api', api: { ...cur, url: e.target.value } },
                      } as any);
                    }}
                    className="w-full text-xs font-mono rounded border border-slate-300 px-2.5 py-1.5 text-slate-800 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Label Path</label>
                    <input
                      type="text"
                      placeholder="name.common"
                      value={(selectedNode as any).dataSource?.api?.labelPath || ''}
                      onChange={(e) => {
                        const cur = (selectedNode as any).dataSource?.api || {};
                        updateNodeProps(selectedNode.id, {
                          dataSource: { type: 'api', api: { ...cur, labelPath: e.target.value } },
                        } as any);
                      }}
                      className="w-full text-xs font-mono rounded border border-slate-300 px-2 py-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Value Path</label>
                    <input
                      type="text"
                      placeholder="cca2"
                      value={(selectedNode as any).dataSource?.api?.valuePath || ''}
                      onChange={(e) => {
                        const cur = (selectedNode as any).dataSource?.api || {};
                        updateNodeProps(selectedNode.id, {
                          dataSource: { type: 'api', api: { ...cur, valuePath: e.target.value } },
                        } as any);
                      }}
                      className="w-full text-xs font-mono rounded border border-slate-300 px-2 py-1.5 bg-white"
                    />
                  </div>
                </div>

                {/* Cascading Dependency */}
                <div className="pt-2 border-t border-indigo-100">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Cascading Parent Dependency
                  </label>
                  <select
                    value={(selectedNode as any).dataSource?.api?.dependsOnField || ''}
                    onChange={(e) => {
                      const cur = (selectedNode as any).dataSource?.api || {};
                      updateNodeProps(selectedNode.id, {
                        dataSource: {
                          type: 'api',
                          api: {
                            ...cur,
                            dependsOnField: e.target.value || undefined,
                          },
                        },
                      } as any);
                    }}
                    className="w-full text-xs rounded border border-slate-300 px-2 py-1.5 bg-white"
                  >
                    <option value="">None (Independent Query)</option>
                    {allFieldNames
                      .filter((f) => f !== selectedNode.name)
                      .map((fieldName) => (
                        <option key={fieldName} value={fieldName}>
                          Depends on: {fieldName}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Secure Server Proxy & Vault */}
                <div className="pt-3 border-t border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-700" />
                      <span className="text-xs font-bold text-slate-800">Secure Proxy & Vault</span>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      AES-256
                    </span>
                  </div>

                  <label className="flex items-start space-x-2 cursor-pointer bg-white p-2 rounded-lg border border-indigo-100/80 hover:border-indigo-200">
                    <input
                      type="checkbox"
                      checked={Boolean((selectedNode as any).dataSource?.api?.useProxy)}
                      onChange={(e) => {
                        const cur = (selectedNode as any).dataSource?.api || {};
                        updateNodeProps(selectedNode.id, {
                          dataSource: {
                            type: 'api',
                            api: {
                              ...cur,
                              useProxy: e.target.checked,
                            },
                          },
                        } as any);
                      }}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Route through Secure Proxy
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight">
                        Hides API tokens from respondents & bypasses browser CORS restrictions.
                      </span>
                    </div>
                  </label>

                  {/* Vault Authentication & Secret Setup */}
                  {Boolean((selectedNode as any).dataSource?.api?.useProxy) && (
                    <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 space-y-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Authentication Type
                        </label>
                        <select
                          value={(selectedNode as any).dataSource?.api?.authType || 'bearer'}
                          onChange={(e) => {
                            const cur = (selectedNode as any).dataSource?.api || {};
                            updateNodeProps(selectedNode.id, {
                              dataSource: {
                                type: 'api',
                                api: {
                                  ...cur,
                                  authType: e.target.value,
                                  headerName:
                                    e.target.value === 'api_key'
                                      ? cur.headerName || 'X-API-Key'
                                      : cur.headerName || 'Authorization',
                                },
                              },
                            } as any);
                          }}
                          className="w-full text-xs rounded border border-slate-300 px-2 py-1.5 bg-white text-slate-800"
                        >
                          <option value="bearer">Bearer Token (Authorization: Bearer ...)</option>
                          <option value="api_key">API Key Header (e.g. X-API-Key)</option>
                          <option value="basic">Basic Auth (Authorization: Basic ...)</option>
                        </select>
                      </div>

                      {(selectedNode as any).dataSource?.api?.authType === 'api_key' && (
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Header Name
                          </label>
                          <input
                            type="text"
                            placeholder="X-API-Key"
                            value={(selectedNode as any).dataSource?.api?.headerName || 'X-API-Key'}
                            onChange={(e) => {
                              const cur = (selectedNode as any).dataSource?.api || {};
                              updateNodeProps(selectedNode.id, {
                                dataSource: {
                                  type: 'api',
                                  api: { ...cur, headerName: e.target.value },
                                },
                              } as any);
                            }}
                            className="w-full text-xs font-mono rounded border border-slate-300 px-2 py-1.5 bg-white text-slate-800"
                          />
                        </div>
                      )}

                      {/* Secret Input & Vault Actions */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-700">
                            Private Secret / Token
                          </label>
                          {(selectedNode as any).dataSource?.api?.hasSecret && (
                            <span className="text-[10px] font-semibold text-emerald-600 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Vaulted</span>
                            </span>
                          )}
                        </div>

                        {(selectedNode as any).dataSource?.api?.hasSecret ? (
                          <div className="flex items-center justify-between p-2 rounded bg-emerald-50 border border-emerald-200">
                            <span className="text-xs font-mono text-emerald-900 tracking-wider">
                              ••••••••••••••••
                            </span>
                            <button
                              type="button"
                              onClick={handleDeleteSecret}
                              disabled={isVaultSaving}
                              className="text-[11px] font-medium text-red-600 hover:text-red-700 underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <input
                                type={showSecret ? 'text' : 'password'}
                                placeholder="Paste token or private key..."
                                value={secretInput}
                                onChange={(e) => setSecretInput(e.target.value)}
                                className="w-full text-xs font-mono rounded border border-slate-300 pl-2.5 pr-8 py-1.5 bg-white text-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                              >
                                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveSecret}
                              disabled={isVaultSaving || !secretInput.trim()}
                              className={clsx(
                                'w-full inline-flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-semibold text-white shadow-xs transition-all',
                                isVaultSaving || !secretInput.trim()
                                  ? 'bg-indigo-300 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              )}
                            >
                              {isVaultSaving ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Encrypting...</span>
                                </>
                              ) : (
                                <>
                                  <Key className="w-3.5 h-3.5" />
                                  <span>Save Secret to Vault</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {vaultSuccess && (
                          <p className="text-[11px] text-emerald-600 mt-1 font-medium">{vaultSuccess}</p>
                        )}
                        {vaultError && (
                          <p className="text-[11px] text-red-600 mt-1 font-medium">{vaultError}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LAYOUT TAB FOR CONTAINERS */}
        {activeTab === 'layout' && isContainer && (
          <div className="space-y-4">
            {selectedNode.type === 'grid' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Number of Columns</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleLayoutChange('columns', col)}
                      className={clsx(
                        'py-2 rounded-lg text-xs font-bold border transition-colors',
                        (selectedNode as any).layoutProps?.columns === col
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {col} Col
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedNode.type === 'section' && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Collapsible Section</span>
                  <span className="text-[11px] text-slate-500">Allow users to collapse this section</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean((selectedNode as any).layoutProps?.collapsible)}
                  onChange={(e) => handleLayoutChange('collapsible', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {/* CONDITIONS LOGIC TAB */}
        {activeTab === 'conditions' && (
          <div className="space-y-3.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800 block mb-1">Conditional Visibility</span>
              <p className="text-[11px] text-slate-500 leading-normal">
                Dynamically display or hide this element based on another field&apos;s active selection.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Action</label>
              <select
                value={(selectedNode as any).conditions?.action || 'show'}
                onChange={(e) => {
                  const cur = (selectedNode as any).conditions || { rules: [], matchType: 'all' };
                  updateNodeProps(selectedNode.id, {
                    conditions: { ...cur, action: e.target.value },
                  } as any);
                }}
                className="w-full text-xs rounded border border-slate-300 px-2 py-1.5 bg-white"
              >
                <option value="show">Show when conditions match</option>
                <option value="hide">Hide when conditions match</option>
                <option value="enable">Enable when conditions match</option>
                <option value="disable">Disable when conditions match</option>
              </select>
            </div>

            {/* Rules List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Rules</span>
                <button
                  type="button"
                  onClick={() => {
                    const cur = (selectedNode as any).conditions || { action: 'show', matchType: 'all', rules: [] };
                    const targetField = allFieldNames[0] || 'field_1';
                    updateNodeProps(selectedNode.id, {
                      conditions: {
                        ...cur,
                        rules: [
                          ...cur.rules,
                          { fieldId: targetField, operator: 'equals', value: '' },
                        ],
                      },
                    } as any);
                  }}
                  className="inline-flex items-center space-x-1 text-xs text-blue-600 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>

              {((selectedNode as any).conditions?.rules || []).map((rule: ConditionalRule, rIdx: number) => (
                <div key={rIdx} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Rule #{rIdx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (selectedNode as any).conditions;
                        const newRules = cur.rules.filter((_: any, i: number) => i !== rIdx);
                        updateNodeProps(selectedNode.id, {
                          conditions: { ...cur, rules: newRules },
                        } as any);
                      }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <select
                    value={rule.fieldId}
                    onChange={(e) => {
                      const cur = (selectedNode as any).conditions;
                      const newRules = [...cur.rules];
                      newRules[rIdx] = { ...newRules[rIdx], fieldId: e.target.value };
                      updateNodeProps(selectedNode.id, { conditions: { ...cur, rules: newRules } } as any);
                    }}
                    className="w-full text-xs rounded border border-slate-300 px-2 py-1"
                  >
                    {allFieldNames.map((fn) => (
                      <option key={fn} value={fn}>
                        Field: {fn}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(e) => {
                      const cur = (selectedNode as any).conditions;
                      const newRules = [...cur.rules];
                      newRules[rIdx] = { ...newRules[rIdx], operator: e.target.value as any };
                      updateNodeProps(selectedNode.id, { conditions: { ...cur, rules: newRules } } as any);
                    }}
                    className="w-full text-xs rounded border border-slate-300 px-2 py-1"
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Does not equal</option>
                    <option value="contains">Contains text</option>
                    <option value="is_empty">Is empty</option>
                    <option value="is_not_empty">Is not empty</option>
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                  </select>

                  {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                    <input
                      type="text"
                      placeholder="Expected value..."
                      value={rule.value ?? ''}
                      onChange={(e) => {
                        const cur = (selectedNode as any).conditions;
                        const newRules = [...cur.rules];
                        newRules[rIdx] = { ...newRules[rIdx], value: e.target.value };
                        updateNodeProps(selectedNode.id, { conditions: { ...cur, rules: newRules } } as any);
                      }}
                      className="w-full text-xs rounded border border-slate-300 px-2 py-1"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
