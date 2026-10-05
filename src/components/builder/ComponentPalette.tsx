'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { PALETTE_ITEMS, createNewNodeFromType } from './paletteItems';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import { NodeType, PaletteItemMeta } from '@/types/schema';
import {
  LayoutGrid,
  Columns2,
  SquareDashed,
  Folder,
  CaseUpper,
  AlignLeft,
  Binary,
  ChevronDownSquare,
  CheckCircle2,
  CheckSquare,
  ToggleRight,
  Calendar,
  UploadCloud,
  Heading,
  Pilcrow,
  Minus,
  Search,
  GripVertical,
  Plus,
} from 'lucide-react';
import clsx from 'clsx';

// Icon Map
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid,
  Columns2,
  SquareDashed,
  Folder,
  CaseUpper,
  AlignLeft,
  Binary,
  ChevronDownSquare,
  CheckCircle2,
  CheckSquare,
  ToggleRight,
  Calendar,
  UploadCloud,
  Heading,
  Pilcrow,
  Minus,
};

interface PaletteItemCardProps {
  item: PaletteItemMeta;
  onQuickAdd: (type: NodeType) => void;
}

function PaletteItemCard({ item, onQuickAdd }: PaletteItemCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette_${item.type}`,
    data: {
      type: item.type,
      isPaletteItem: true,
      isContainer: item.isContainer,
    },
  });

  const IconComponent = ICON_MAP[item.iconName] || SquareDashed;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'group relative flex items-center justify-between p-2.5 rounded-xl border bg-white transition-all cursor-grab active:cursor-grabbing select-none',
        isDragging
          ? 'opacity-40 border-blue-400 shadow-md scale-95'
          : 'border-slate-200 hover:border-blue-400 hover:shadow-sm'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-600 flex items-center justify-center flex-shrink-0 transition-colors">
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="flex flex-col truncate">
          <span className="text-xs font-semibold text-slate-800 truncate">{item.label}</span>
          <span className="text-[11px] text-slate-500 truncate">{item.description}</span>
        </div>
      </div>

      <div className="flex items-center space-x-1 pl-2 flex-shrink-0">
        <button
          type="button"
          title="Click to add to canvas"
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(item.type);
          }}
          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
      </div>
    </div>
  );
}

export function ComponentPalette() {
  const searchTerm = useFormBuilderStore((s) => s.paletteSearchTerm);
  const setSearchTerm = useFormBuilderStore((s) => s.setPaletteSearch);
  const selectedCategory = useFormBuilderStore((s) => s.selectedPaletteCategory);
  const setSelectedCategory = useFormBuilderStore((s) => s.setPaletteCategory);
  const insertNode = useFormBuilderStore((s) => s.insertNode);
  const selectedNodeId = useFormBuilderStore((s) => s.selectedNodeId);
  const schema = useFormBuilderStore((s) => s.schema);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'layout', label: 'Layout' },
    { id: 'inputs', label: 'Inputs' },
    { id: 'presentational', label: 'Display' },
  ];

  const filteredItems = PALETTE_ITEMS.filter((item) => {
    const matchesSearch =
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleQuickAdd = (type: NodeType) => {
    const newNode = createNewNodeFromType(type);
    const targetId = selectedNodeId || schema.root.id;
    insertNode(targetId, 'inside', newNode);
  };

  return (
    <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col h-full select-none">
      {/* Palette Header */}
      <div className="p-3.5 border-b border-slate-200 bg-white">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Component Library
        </h2>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white rounded-lg text-xs text-slate-800 placeholder-slate-400 border border-transparent focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 mt-2.5 bg-slate-100 p-0.5 rounded-lg text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                'flex-1 py-1 rounded-md font-medium text-[11px] transition-all',
                selectedCategory === cat.id
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Palette List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredItems.map((item) => (
          <PaletteItemCard key={item.type} item={item} onQuickAdd={handleQuickAdd} />
        ))}

        {filteredItems.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400">
            No components match &quot;{searchTerm}&quot;
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between">
        <span>Drag to canvas or click +</span>
        <span className="font-semibold text-slate-700">{filteredItems.length} items</span>
      </div>
    </aside>
  );
}
