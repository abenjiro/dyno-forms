import React from 'react';
import Link from 'next/link';
import {
  Layers,
  Sparkles,
  Eye,
  Box,
  FileUp,
  Cpu,
  Zap,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Dyno Forms
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                v1.0 (Next.js + TS)
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/builder"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm shadow-blue-500/25"
            >
              <Box className="w-4 h-4" />
              <span>Open Visual Builder</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Dockerized • TypeScript • Hybrid SSR & CSR</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            Enterprise Drag-and-Drop Form Builder & AI Ingestion Engine
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed">
            Construct arbitrary nested forms with depth-aware collision detection,
            bind live REST/GraphQL APIs dynamically to dropdowns, auto-save drafts,
            and transform legacy PDFs & images into live interactive forms.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/builder"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-all shadow-md shadow-blue-500/25 hover:shadow-lg"
            >
              <Box className="w-5 h-5" />
              <span>Launch Form Builder</span>
            </Link>

            <Link
              href="/convert"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base transition-all shadow-sm"
            >
              <FileUp className="w-5 h-5" />
              <span>Convert Old Form (PDF / Image)</span>
            </Link>

            <Link
              href="/f/demo"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-base transition-all"
            >
              <Eye className="w-5 h-5" />
              <span>Live Runtime Preview</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Card 1 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <Box className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Nested Drag & Drop Canvas
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Drop elements anywhere. Hierarchical depth-first collision prevents parent-shadowing
              when dropping inputs into multi-column grid rows, sections, and cards.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Dynamic API & Cascading Data
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Connect external REST APIs directly to dropdowns and radio groups with TanStack Query caching
              and nested path extraction (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">name.common</code>).
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              AI Document Ingestion
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Upload legacy paperwork, scanned forms, or PDF documents. The multimodal vision pipeline
              detects checkboxes, textboxes, and dropdowns and generates a live Dyno form instantly.
            </p>
          </div>
        </div>

        {/* Architecture & Docker Status Banner */}
        <div className="bg-slate-900 rounded-2xl text-white p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 text-blue-400 text-sm font-semibold mb-2">
                <Terminal className="w-4 h-4" />
                <span>Docker Container Architecture Ready</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Containerized Development & Production</h2>
              <p className="text-slate-300 text-sm max-w-2xl">
                Ready to spin up with Docker Compose. Includes mock API container (<code className="text-blue-300">port 4000</code>)
                with offline country and cascading state endpoints, plus standalone production image (~120MB).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3">
                <span className="block text-xs text-slate-400">Run Development Container</span>
                <code className="text-xs font-mono text-emerald-400">docker compose up --build</code>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3">
                <span className="block text-xs text-slate-400">Run Local Host</span>
                <code className="text-xs font-mono text-blue-400">npm run dev</code>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          Dyno Forms — Architected with Next.js 15, React 19, TypeScript, Tailwind CSS, @dnd-kit, and Docker.
        </div>
      </footer>
    </div>
  );
}
