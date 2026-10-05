'use client';

import React, { useState, useEffect } from 'react';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import { X, Copy, Check, FileDown, FileUp, AlertTriangle } from 'lucide-react';

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SchemaModal({ isOpen, onClose }: SchemaModalProps) {
  const schema = useFormBuilderStore((s) => s.schema);
  const importSchemaJson = useFormBuilderStore((s) => s.importSchemaJson);
  const resetSchema = useFormBuilderStore((s) => s.resetSchema);

  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(schema, null, 2));
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, schema]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const result = importSchemaJson(jsonText);
    if (!result.success) {
      setErrorMsg(result.error || 'Failed to import schema');
    } else {
      setSuccessMsg('Schema successfully imported and loaded!');
      setTimeout(() => {
        onClose();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-800">AST Schema JSON (Export / Import)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <label className="text-xs text-slate-500 mb-1.5 font-medium">
            Edit directly below to apply modifications or paste your custom Dyno Form JSON schema:
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="flex-1 w-full p-3 font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto leading-relaxed"
            rows={18}
            spellCheck={false}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset canvas back to the default enterprise onboarding template?')) {
                resetSchema();
                onClose();
              }
            }}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
          >
            Reset to Sample Template
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button
              type="button"
              onClick={handleImport}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/25 transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Apply & Import Schema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
