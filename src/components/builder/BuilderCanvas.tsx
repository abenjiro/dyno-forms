'use client';

import React, { useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import { CanvasNode } from './CanvasNode';
import { FormRenderer } from '../runtime/FormRenderer';
import { customDepthCollisionAlgorithm } from './collisionAlgorithm';
import { createNewNodeFromType } from './paletteItems';
import { DropZonePosition, FormNode, NodeType } from '@/types/schema';
import clsx from 'clsx';

export function BuilderCanvas() {
  const schema = useFormBuilderStore((s) => s.schema);
  const previewMode = useFormBuilderStore((s) => s.previewMode);
  const deviceView = useFormBuilderStore((s) => s.deviceView);
  const draggedItem = useFormBuilderStore((s) => s.draggedItem);
  const setDraggedItem = useFormBuilderStore((s) => s.setDraggedItem);
  const setDropIndicator = useFormBuilderStore((s) => s.setDropIndicator);
  const insertNode = useFormBuilderStore((s) => s.insertNode);
  const moveNode = useFormBuilderStore((s) => s.moveNode);
  const selectedNodeId = useFormBuilderStore((s) => s.selectedNodeId);
  const selectNode = useFormBuilderStore((s) => s.selectNode);
  const removeNode = useFormBuilderStore((s) => s.removeNode);
  const duplicateNode = useFormBuilderStore((s) => s.duplicateNode);
  const undo = useFormBuilderStore((s) => s.undo);
  const redo = useFormBuilderStore((s) => s.redo);
  const hydrateFromStorage = useFormBuilderStore((s) => s.hydrateFromStorage);

  // Hydrate converted or saved schema on mount
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Keyboard Shortcuts: Delete, Ctrl+D (duplicate), Escape (deselect), Ctrl+Z / Ctrl+Y (undo/redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Escape: Deselect active node
      if (e.key === 'Escape') {
        e.preventDefault();
        selectNode(null);
        return;
      }

      // If a node is selected (and not the root canvas)
      if (selectedNodeId && selectedNodeId !== schema.root.id) {
        // Delete / Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          removeNode(selectedNodeId);
          return;
        }

        // Duplicate: Ctrl+D / Cmd+D
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateNode(selectedNodeId);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, schema.root.id, selectNode, removeNode, duplicateNode, undo, redo]);

  // Require 5px movement before activating drag (allows clean clicks without dragging)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    setDraggedItem({
      id: String(active.id),
      type: (activeData?.type || 'text') as NodeType,
      isPaletteItem: Boolean(activeData?.isPaletteItem),
      isContainer: Boolean(activeData?.isContainer),
      treeDepth: activeData?.treeDepth || 0,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setDropIndicator(null);
      return;
    }

    const overData = over.data.current;
    const overId = String(over.id);
    const targetElement = document.querySelector(`[data-node-id="${overId}"]`) as HTMLElement;

    let position: DropZonePosition = 'inside';

    if (targetElement && overData?.isContainer) {
      const rect = targetElement.getBoundingClientRect();
      const pointerY = (event as any).activatorEvent?.clientY || 0;
      const relativeY = pointerY - rect.top;
      const height = rect.height;

      // Top 20%: before, Bottom 20%: after, Middle 60%: inside
      if (relativeY < height * 0.2) {
        position = 'before';
      } else if (relativeY > height * 0.8) {
        position = 'after';
      } else {
        position = 'inside';
      }
    } else if (targetElement) {
      // For leaf fields, top 50% is before, bottom 50% is after
      const rect = targetElement.getBoundingClientRect();
      const pointerY = (event as any).activatorEvent?.clientY || 0;
      const relativeY = pointerY - rect.top;
      position = relativeY < rect.height / 2 ? 'before' : 'after';
    }

    setDropIndicator({
      targetId: overId,
      position,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDropIndicator(null);
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    const overData = over.data.current;
    const activeData = active.data.current;
    const overId = String(over.id);

    // Determine drop position
    const targetElement = document.querySelector(`[data-node-id="${overId}"]`) as HTMLElement;
    let position: DropZonePosition = 'inside';

    if (targetElement && overData?.isContainer) {
      const rect = targetElement.getBoundingClientRect();
      const pointerY = (event as any).activatorEvent?.clientY || 0;
      const relativeY = pointerY - rect.top;
      const height = rect.height;

      if (relativeY < height * 0.2) {
        position = 'before';
      } else if (relativeY > height * 0.8) {
        position = 'after';
      } else {
        position = 'inside';
      }
    } else if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const pointerY = (event as any).activatorEvent?.clientY || 0;
      const relativeY = pointerY - rect.top;
      position = relativeY < rect.height / 2 ? 'before' : 'after';
    }

    // 1. New item dropped from Component Palette
    if (activeData?.isPaletteItem) {
      const newNode = createNewNodeFromType(activeData.type as NodeType);
      insertNode(overId, position, newNode);
      return;
    }

    // 2. Existing canvas node moved
    moveNode(String(active.id), overId, position);
  };

  const handleDragCancel = () => {
    setDropIndicator(null);
    setDraggedItem(null);
  };

  // Device width wrappers
  const deviceWidthClass = {
    desktop: 'w-full max-w-5xl',
    tablet: 'w-full max-w-2xl',
    mobile: 'w-full max-w-sm',
  }[deviceView];

  return (
    <main className="flex-1 bg-slate-100 overflow-y-auto p-6 sm:p-8 flex justify-center items-start">
      <div
        className={clsx(
          'transition-all duration-300 ease-in-out',
          deviceWidthClass,
          deviceView !== 'desktop' && 'border-4 border-slate-300 rounded-3xl p-4 bg-slate-50 shadow-xl min-h-[700px]'
        )}
      >
        {previewMode === 'preview' ? (
          /* Live Interactive Form Preview */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-fadeIn">
            <FormRenderer
              key={`preview_${schema.id}_${schema.root.children.length}`}
              schema={schema}
            />
          </div>
        ) : (
          /* Visual Drag-and-Drop Canvas */
          <DndContext
            sensors={sensors}
            collisionDetection={customDepthCollisionAlgorithm}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm min-h-[600px]">
              {/* Form Canvas Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-white rounded-t-2xl">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {schema.title}
                </h1>
                {schema.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {schema.description}
                  </p>
                )}
              </div>

              {/* Main Canvas Component Tree */}
              <CanvasNode node={schema.root} />

              {/* Bottom Canvas Helper Bar */}
              <div className="px-6 py-2.5 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-3">
                  <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-xs">Del</kbd> Delete</span>
                  <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-xs">Ctrl+D</kbd> Duplicate</span>
                  <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-xs">Esc</kbd> Deselect</span>
                  <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-xs">Ctrl+Z</kbd> Undo</span>
                </div>
                <span>{selectedNodeId ? `Selected: ${selectedNodeId}` : 'Click any element to inspect'}</span>
              </div>
            </div>

            {/* Drag Overlay Ghost */}
            <DragOverlay dropAnimation={null}>
              {draggedItem ? (
                <div className="px-4 py-2.5 rounded-xl border border-blue-500 bg-white/95 shadow-xl text-xs font-semibold text-blue-600 flex items-center space-x-2 select-none cursor-grabbing">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>Moving {draggedItem.type}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </main>
  );
}
