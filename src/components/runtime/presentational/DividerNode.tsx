'use client';

import React from 'react';
import { BaseNode } from '@/types/schema';
import clsx from 'clsx';

interface DividerNodeProps {
  node: BaseNode;
}

export function DividerNode({ node }: DividerNodeProps) {
  const { label, customClass } = node;

  if (label) {
    return (
      <div className={clsx('relative flex py-4 items-center', customClass)}>
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>
    );
  }

  return <hr className={clsx('border-t border-slate-200 my-4', customClass)} />;
}
