'use client';

import React from 'react';
import { BaseNode } from '@/types/schema';
import clsx from 'clsx';

interface HeadingNodeProps {
  node: BaseNode;
}

export function HeadingNode({ node }: HeadingNodeProps) {
  const { label, description, customClass } = node;

  return (
    <div className={clsx('pt-3 pb-1 border-b border-slate-100', customClass)}>
      <h2 className="text-xl font-bold tracking-tight text-slate-900">{label || 'Heading'}</h2>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  );
}
