'use client';

import React from 'react';
import { BaseNode } from '@/types/schema';
import clsx from 'clsx';

interface ParagraphNodeProps {
  node: BaseNode;
}

export function ParagraphNode({ node }: ParagraphNodeProps) {
  const { label, description, helperText, customClass } = node;
  const content = description || label || helperText || '';

  return (
    <div className={clsx('py-1', customClass)}>
      <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
    </div>
  );
}
