'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import { SchemaModal } from './SchemaModal';
import {
  Layers,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Edit3,
  Code2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

export function StudioHeader() {
  const schema = useFormBuilderStore((s) => s.schema);
  const isDirty = useFormBuilderStore((s) => s.isDirty);
  const undo = useFormBuilderStore((s) => s.undo);
  const redo = useFormBuilderStore((s) => s.redo);
  const canUndo = useFormBuilderStore((s) => s.past.length > 0);
  const canRedo = useFormBuilderStore((s) => s.future.length > 0);

  const previewMode = useFormBuilderStore((s) => s.previewMode);
  const setPreviewMode = useFormBuilderStore((s) => s.setPreviewMode);
  const deviceView = useFormBuilderStore((s) => s.deviceView);
  const setDeviceView = useFormBuilderStore((s) => s.setDeviceView);

  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between z-40 select-none">
        {/* Left: Brand & Form Name */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-900 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Dyno Forms
            </span>
          </Link>

          <span className="text-slate-300">|</span>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-800 max-w-[220px] truncate">
              {schema.title}
            </span>
            {isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes in session" />
            )}
          </div>
        </div>

        {/* Center: Device View & Edit/Preview Modes */}
        <div className="flex items-center space-x-3">
          {/* History Controls */}
          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Device Responsive Breakpoints */}
          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setDeviceView('desktop')}
              title="Desktop View"
              className={clsx(
                'p-1.5 rounded-md text-xs transition-colors',
                deviceView === 'desktop'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('tablet')}
              title="Tablet View"
              className={clsx(
                'p-1.5 rounded-md text-xs transition-colors',
                deviceView === 'tablet'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('mobile')}
              title="Mobile View"
              className={clsx(
                'p-1.5 rounded-md text-xs transition-colors',
                deviceView === 'mobile'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Edit vs Live Preview Toggle */}
          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setPreviewMode('edit')}
              className={clsx(
                'flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
                previewMode === 'edit'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('preview')}
              className={clsx(
                'flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
                previewMode === 'preview'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Test</span>
            </button>
          </div>
        </div>

        {/* Right: AI Ingestion, JSON Schema Modal & Live URL */}
        <div className="flex items-center space-x-2">
          <Link
            href="/convert"
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Form Import</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsSchemaModalOpen(true)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON AST</span>
          </button>

          <Link
            href={`/f/${encodeURIComponent(schema.id)}`}
            target="_blank"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/25 transition-colors"
          >
            <span>Public Form</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* JSON Schema Export/Import Modal */}
      <SchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />
    </>
  );
}
