'use client';

import React, { useState } from 'react';
import { ContainerNode } from '@/types/schema';
import { ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface SectionContainerProps {
  node: ContainerNode;
  children: React.ReactNode;
}

export function SectionContainer({ node, children }: SectionContainerProps) {
  const { label, description, layoutProps, customClass } = node;
  const isCollapsible = Boolean(layoutProps?.collapsible);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section
      className={clsx(
        'w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all overflow-hidden mb-6',
        customClass
      )}
      data-container-id={node.id}
    >
      {(label || description) && (
        <div
          className={clsx(
            'px-6 py-4 border-b border-slate-100 flex items-center justify-between',
            isCollapsible && 'cursor-pointer hover:bg-slate-50/80 transition-colors select-none'
          )}
          onClick={isCollapsible ? () => setIsCollapsed((prev) => !prev) : undefined}
        >
          <div className="flex flex-col">
            {label && <h3 className="text-base font-bold text-slate-900">{label}</h3>}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>

          {isCollapsible && (
            <button
              type="button"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            >
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          )}
        </div>
      )}

      <div className={clsx('p-6 space-y-5', isCollapsed && 'hidden')}>{children}</div>
    </section>
  );
}
