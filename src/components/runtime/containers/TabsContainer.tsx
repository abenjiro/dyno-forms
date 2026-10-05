'use client';

import React, { useState } from 'react';
import { ContainerNode } from '@/types/schema';
import clsx from 'clsx';

interface TabsContainerProps {
  node: ContainerNode;
  children: React.ReactNode[];
}

export function TabsContainer({ node, children }: TabsContainerProps) {
  const childNodes = node.children || [];
  const tabs =
    node.layoutProps?.tabs ||
    childNodes.map((c, i) => ({
      id: c.id,
      label: c.label || `Tab ${i + 1}`,
    }));

  const [activeTabId, setActiveTabId] = useState<string>(
    node.layoutProps?.activeTab || tabs[0]?.id || ''
  );

  return (
    <div
      className={clsx('w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6', node.customClass)}
      data-container-id={node.id}
    >
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={clsx(
                'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
                isActive
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabs Body */}
      <div className="p-6">
        {childNodes.map((child, idx) => {
          const isTabActive = child.id === activeTabId;
          return (
            <div key={child.id} className={clsx(!isTabActive && 'hidden')}>
              {children[idx]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
