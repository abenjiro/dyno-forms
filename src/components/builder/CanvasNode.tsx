'use client';

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { FormNode, isContainerNode, isFieldNode } from '@/types/schema';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import {
  GripVertical,
  Copy,
  Trash2,
  Columns2,
  LayoutGrid,
  SquareDashed,
  Layers,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

interface CanvasNodeProps {
  node: FormNode;
  ancestorIds?: string[];
}

export function CanvasNode({ node, ancestorIds = [] }: CanvasNodeProps) {
  const selectedNodeId = useFormBuilderStore((s) => s.selectedNodeId);
  const selectNode = useFormBuilderStore((s) => s.selectNode);
  const removeNode = useFormBuilderStore((s) => s.removeNode);
  const duplicateNode = useFormBuilderStore((s) => s.duplicateNode);
  const dropIndicator = useFormBuilderStore((s) => s.dropIndicator);

  const isSelected = selectedNodeId === node.id;
  const isContainer = isContainerNode(node);

  // Droppable hook
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: node.id,
    data: {
      id: node.id,
      type: node.type,
      isContainer,
      treeDepth: node.treeDepth || 0,
      ancestorIds,
      node,
    },
  });

  // Draggable hook (skip dragging root canvas)
  const isRoot = node.type === 'canvas';
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: node.id,
    disabled: isRoot,
    data: {
      id: node.id,
      type: node.type,
      isContainer,
      treeDepth: node.treeDepth || 0,
      ancestorIds,
      node,
    },
  });

  // Combine refs
  const setNodeRef = (el: HTMLElement | null) => {
    setDroppableRef(el);
    if (!isRoot) {
      setDraggableRef(el);
    }
  };

  // Drop indicator evaluation
  const showBeforeLine = dropIndicator?.targetId === node.id && dropIndicator?.position === 'before';
  const showAfterLine = dropIndicator?.targetId === node.id && dropIndicator?.position === 'after';
  const showInsideTint = dropIndicator?.targetId === node.id && dropIndicator?.position === 'inside';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateNode(node.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(node.id);
  };

  const currentAncestors = [...ancestorIds, node.id];

  // Render Root Canvas Container
  if (isRoot) {
    const children = (node as any).children || [];
    return (
      <div
        ref={setNodeRef}
        onClick={() => selectNode(null)}
        className={clsx(
          'w-full min-h-[500px] p-6 rounded-2xl transition-all',
          showInsideTint ? 'bg-blue-50/40 ring-2 ring-blue-400 ring-dashed' : 'bg-transparent'
        )}
        data-canvas-root
      >
        {children.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center text-slate-400 hover:border-blue-400 transition-colors">
            <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-base font-semibold text-slate-600">Your Form Canvas is Empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Drag components or sections from the library on the left to start building your form.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child: FormNode) => (
              <CanvasNode key={child.id} node={child} ancestorIds={currentAncestors} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Container Nodes (Section, Grid, Card, Tabs)
  if (isContainer) {
    const children = node.children || [];
    const columns = node.layoutProps?.columns || (node.type === 'grid' ? 2 : 1);

    const gridColClasses: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
      <div className="relative group/container">
        {/* Drop Line: Before */}
        {showBeforeLine && (
          <div className="h-1.5 w-full bg-blue-500 rounded-full my-1 shadow-sm animate-pulse" />
        )}

        <div
          ref={setNodeRef}
          onClick={handleClick}
          className={clsx(
            'relative rounded-2xl border transition-all',
            isSelected
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-md'
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm',
            showInsideTint && 'bg-blue-50/50 ring-2 ring-blue-500 border-blue-400',
            isDragging && 'opacity-40 scale-[0.99]'
          )}
          data-node-id={node.id}
        >
          {/* Container Action Toolbar */}
          <div
            className={clsx(
              'absolute top-0 right-3 -translate-y-1/2 flex items-center space-x-1 px-2 py-0.5 rounded-full border text-xs shadow-sm z-30 transition-opacity',
              isSelected
                ? 'bg-blue-600 text-white border-blue-600 opacity-100'
                : 'bg-white text-slate-600 border-slate-200 opacity-0 group-hover/container:opacity-100'
            )}
          >
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-0.5 hover:text-blue-200"
              title="Drag container"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-[11px] uppercase tracking-wider px-1">
              {node.type}
            </span>
            <button
              type="button"
              onClick={handleDuplicate}
              className="p-1 hover:text-blue-200"
              title="Duplicate"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Container Header */}
          {(node.label || node.description) && (
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                {node.label && (
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    {node.type === 'section' && <LayoutGrid className="w-4 h-4 text-blue-500" />}
                    {node.type === 'grid' && <Columns2 className="w-4 h-4 text-indigo-500" />}
                    {node.type === 'card' && <SquareDashed className="w-4 h-4 text-emerald-500" />}
                    <span>{node.label}</span>
                  </h3>
                )}
                {node.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{node.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Container Children Area */}
          <div className="p-4">
            {children.length === 0 ? (
              <div
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center text-xs transition-colors',
                  showInsideTint
                    ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
                    : 'border-slate-200 text-slate-400 hover:border-blue-300'
                )}
              >
                Drop elements inside this {node.type}
              </div>
            ) : (
              <div className={clsx('grid gap-4 items-start', gridColClasses[columns] || 'grid-cols-1')}>
                {children.map((child: FormNode) => (
                  <CanvasNode key={child.id} node={child} ancestorIds={currentAncestors} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drop Line: After */}
        {showAfterLine && (
          <div className="h-1.5 w-full bg-blue-500 rounded-full my-1 shadow-sm animate-pulse" />
        )}
      </div>
    );
  }

  // Render Leaf Field Nodes (Inputs, Presentational)
  return (
    <div className="relative group/field w-full">
      {/* Drop Line: Before */}
      {showBeforeLine && (
        <div className="h-1.5 w-full bg-blue-500 rounded-full my-1 shadow-sm animate-pulse" />
      )}

      <div
        ref={setNodeRef}
        onClick={handleClick}
        className={clsx(
          'relative p-3.5 rounded-xl border bg-white transition-all cursor-pointer',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
            : 'border-slate-200/90 hover:border-blue-300 hover:shadow-sm',
          isDragging && 'opacity-40 scale-[0.99]'
        )}
        data-node-id={node.id}
      >
        {/* Floating Toolbar on Hover / Select */}
        <div
          className={clsx(
            'absolute top-0 right-3 -translate-y-1/2 flex items-center space-x-1 px-2 py-0.5 rounded-full border text-xs shadow-sm z-30 transition-opacity',
            isSelected
              ? 'bg-blue-600 text-white border-blue-600 opacity-100'
              : 'bg-white text-slate-600 border-slate-200 opacity-0 group-hover/field:opacity-100'
          )}
        >
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 hover:text-blue-200"
            title="Drag field"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold text-[10px] uppercase tracking-wider px-1">
            {node.type}
          </span>
          <button
            type="button"
            onClick={handleDuplicate}
            className="p-0.5 hover:text-blue-200"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-0.5 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Visual Mockup of Element */}
        <div className="space-y-1 pointer-events-none select-none">
          {node.label && (
            <label className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
              <span>{node.label}</span>
              {(node as any).validation?.required && (
                <span className="text-red-500 font-bold">*</span>
              )}
            </label>
          )}

          {node.description && (
            <p className="text-[11px] text-slate-500">{node.description}</p>
          )}

          {/* Form Control Mockup */}
          {node.type === 'textarea' ? (
            <div className="w-full h-16 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400">
              {node.placeholder || 'Textarea placeholder...'}
            </div>
          ) : node.type === 'select' ? (
            <div className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center justify-between text-xs text-slate-400">
              <span>{node.placeholder || 'Select option...'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          ) : node.type === 'checkbox' ? (
            <div className="flex items-center space-x-2 pt-1">
              <div className="w-4 h-4 rounded border border-slate-300 bg-slate-50" />
              <span className="text-xs text-slate-700">{node.label}</span>
            </div>
          ) : node.type === 'switch' ? (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-700">{node.label}</span>
              <div className="w-8 h-4 rounded-full bg-slate-200 relative">
                <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 left-0.5 shadow-sm" />
              </div>
            </div>
          ) : node.type === 'radio' ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-slate-50" />
                <span className="text-xs text-slate-600">Option 1</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-slate-50" />
                <span className="text-xs text-slate-600">Option 2</span>
              </div>
            </div>
          ) : node.type === 'file' ? (
            <div className="w-full border-2 border-dashed border-slate-200 rounded-lg p-3 text-center text-xs text-slate-400">
              Upload file or drag here
            </div>
          ) : node.type === 'heading' ? (
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1">
              {node.label || 'Heading Title'}
            </h3>
          ) : node.type === 'paragraph' ? (
            <p className="text-xs text-slate-600 leading-relaxed">
              {node.description || 'Paragraph text content here.'}
            </p>
          ) : node.type === 'divider' ? (
            <div className="border-t border-slate-200 my-2" />
          ) : (
            <div className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center text-xs text-slate-400">
              {node.placeholder || 'Text input placeholder...'}
            </div>
          )}

          {node.helperText && (
            <p className="text-[10px] text-slate-400">{node.helperText}</p>
          )}
        </div>
      </div>

      {/* Drop Line: After */}
      {showAfterLine && (
        <div className="h-1.5 w-full bg-blue-500 rounded-full my-1 shadow-sm animate-pulse" />
      )}
    </div>
  );
}
