'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormNode, isContainerNode, isFieldNode } from '@/types/schema';
import { shouldShowNode, isNodeDisabled } from '@/runtime/conditionEvaluator';

// Field Components
import { TextInput } from './fields/TextInput';
import { SelectInput } from './fields/SelectInput';
import { RadioInput } from './fields/RadioInput';
import { CheckboxInput } from './fields/CheckboxInput';
import { SwitchInput } from './fields/SwitchInput';
import { FileInput } from './fields/FileInput';

// Presentational Components
import { HeadingNode } from './presentational/HeadingNode';
import { ParagraphNode } from './presentational/ParagraphNode';
import { DividerNode } from './presentational/DividerNode';

// Container Components
import { SectionContainer } from './containers/SectionContainer';
import { GridContainer } from './containers/GridContainer';
import { CardContainer } from './containers/CardContainer';
import { TabsContainer } from './containers/TabsContainer';

interface FormNodeRendererProps {
  node: FormNode;
}

export function FormNodeRenderer({ node }: FormNodeRendererProps) {
  const { watch } = useFormContext();
  const formValues = watch();

  // Evaluate conditional visibility and disabled state
  const isVisible = shouldShowNode(node, formValues);
  const isDisabled = isNodeDisabled(node, formValues);

  if (!isVisible) {
    return null;
  }

  // Handle Containers
  if (isContainerNode(node)) {
    const renderedChildren = node.children.map((child) => (
      <FormNodeRenderer key={child.id} node={child} />
    ));

    switch (node.type) {
      case 'canvas':
        return <div className="space-y-6 w-full">{renderedChildren}</div>;

      case 'section':
        return <SectionContainer node={node}>{renderedChildren}</SectionContainer>;

      case 'grid':
      case 'column':
        return <GridContainer node={node}>{renderedChildren}</GridContainer>;

      case 'card':
        return <CardContainer node={node}>{renderedChildren}</CardContainer>;

      case 'tabs':
        return <TabsContainer node={node}>{renderedChildren}</TabsContainer>;

      case 'tab-panel':
        return <div className="space-y-4 w-full">{renderedChildren}</div>;

      default:
        return <div className="space-y-4 w-full">{renderedChildren}</div>;
    }
  }

  // Handle Input Fields
  if (isFieldNode(node)) {
    switch (node.type) {
      case 'text':
      case 'textarea':
      case 'number':
      case 'date':
        return <TextInput field={node} disabled={isDisabled} />;

      case 'select':
        return <SelectInput field={node} disabled={isDisabled} />;

      case 'radio':
        return <RadioInput field={node} disabled={isDisabled} />;

      case 'checkbox':
        return <CheckboxInput field={node} disabled={isDisabled} />;

      case 'switch':
        return <SwitchInput field={node} disabled={isDisabled} />;

      case 'file':
        return <FileInput field={node} disabled={isDisabled} />;

      // Presentational
      case 'heading':
        return <HeadingNode node={node} />;

      case 'paragraph':
        return <ParagraphNode node={node} />;

      case 'divider':
        return <DividerNode node={node} />;

      default:
        return null;
    }
  }

  return null;
}
