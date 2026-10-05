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
