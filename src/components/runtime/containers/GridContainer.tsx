'use client';

import React from 'react';
import { ContainerNode } from '@/types/schema';
import clsx from 'clsx';

interface GridContainerProps {
  node: ContainerNode;
  children: React.ReactNode;
}

export function GridContainer({ node, children }: GridContainerProps) {
  const columns = node.layoutProps?.columns || 2;
  const gap = node.layoutProps?.gap ?? 4;

  const columnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const gapClasses: Record<number, string> = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div
      className={clsx(
        'grid w-full items-start',
        columnClasses[columns] || 'grid-cols-1 md:grid-cols-2',
        gapClasses[gap] || 'gap-4',
        node.customClass
      )}
      data-container-id={node.id}
    >
      {children}
    </div>
  );
}
