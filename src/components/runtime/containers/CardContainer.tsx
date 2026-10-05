'use client';

import React from 'react';
import { ContainerNode } from '@/types/schema';
import clsx from 'clsx';

interface CardContainerProps {
  node: ContainerNode;
  children: React.ReactNode;
}

export function CardContainer({ node, children }: CardContainerProps) {
  const { label, description, layoutProps, customClass } = node;
  const cardStyle = layoutProps?.cardStyle || 'bordered';

  const styleClasses = {
    bordered: 'border border-slate-200 bg-white shadow-sm',
    shadow: 'border-0 bg-white shadow-md shadow-slate-200/50',
    flat: 'border border-slate-100 bg-slate-50/50',
  }[cardStyle];

  return (
    <div
      className={clsx('w-full rounded-2xl p-6 transition-all mb-4', styleClasses, customClass)}
      data-container-id={node.id}
    >
      {(label || description) && (
        <div className="mb-4 pb-3 border-b border-slate-100">
          {label && <h4 className="text-base font-bold text-slate-800">{label}</h4>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
