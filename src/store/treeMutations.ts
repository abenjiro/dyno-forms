import { produce } from 'immer';
import {
  ContainerNode,
  DropZonePosition,
  FieldNode,
  FormNode,
  NodeType,
  isContainerNode,
  isFieldNode,
  CONTAINER_NODE_TYPES,
  INPUT_NODE_TYPES,
  PRESENTATIONAL_NODE_TYPES,
  PaletteItemMeta,
} from '../types/schema';

/**
 * Generate a unique ID with optional semantic prefix
 */
export function generateId(prefix = 'node'): string {
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${randomPart}`;
}

/**
 * Deep search for a node by ID in the tree
 */
export function findNodeById(root: ContainerNode, id: string): FormNode | null {
  if (root.id === id) return root;

  for (const child of root.children) {
    if (child.id === id) return child;
    if (isContainerNode(child)) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Find a node, its direct parent container, and its index in parent.children
 */
export function findNodeAndParent(
  root: ContainerNode,
  id: string
): { node: FormNode; parent: ContainerNode; index: number } | null {
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child.id === id) {
      return { node: child, parent: root, index: i };
    }
    if (isContainerNode(child)) {
      const found = findNodeAndParent(child, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Check if targetId is the parent itself or one of its descendants.
 * Crucial to prevent circular tree references when dragging containers.
 */
export function isDescendant(parent: ContainerNode, targetId: string): boolean {
  if (parent.id === targetId) return true;

  for (const child of parent.children) {
    if (child.id === targetId) return true;
    if (isContainerNode(child) && isDescendant(child, targetId)) {
      return true;
    }
  }

  return false;
}

/**
 * Flattens all nodes in the AST into a single list
 */
export function flattenTree(root: ContainerNode): FormNode[] {
  const nodes: FormNode[] = [root];

  function traverse(container: ContainerNode) {
    for (const child of container.children) {
      nodes.push(child);
      if (isContainerNode(child)) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return nodes;
}

/**
 * Collect all active input field names in the form
 */
export function getAllFieldNames(root: ContainerNode): string[] {
  const allNodes = flattenTree(root);
  return allNodes
    .filter((n): n is FieldNode => isFieldNode(n) && typeof n.name === 'string' && n.name.length > 0)
    .map((n) => n.name);
}

/**
 * Generate a guaranteed unique form field name (for react-hook-form)
 */
export function generateUniqueFieldName(baseName: string, existingNames: Set<string>): string {
  let candidate = baseName;
  let counter = 1;
  while (existingNames.has(candidate)) {
    counter++;
    candidate = `${baseName}_${counter}`;
  }
  existingNames.add(candidate);
  return candidate;
}

/**
 * Pure function: recursively recalculate treeDepth on all nodes
 */
export function recalculateTreeDepths(root: ContainerNode, depth = 0): ContainerNode {
  return produce(root, (draft) => {
    function assignDepth(container: ContainerNode, d: number) {
      container.treeDepth = d;
      for (const child of container.children) {
        child.treeDepth = d + 1;
        if (isContainerNode(child)) {
          assignDepth(child, d + 1);
        }
      }
    }

    assignDepth(draft, depth);
  });
}

/**
 * Factory to create default nodes for any NodeType
 */
export function createDefaultNode(type: NodeType, overrides?: Partial<FormNode>): FormNode {
  const id = generateId(type);

  // Presentational Nodes
  if (type === 'heading') {
    return {
      id,
      type: 'heading',
      label: 'Section Heading',
      fieldProps: { level: 2 },
      treeDepth: 0,
      ...overrides,
    } as FieldNode;
  }

  if (type === 'paragraph') {
    return {
      id,
      type: 'paragraph',
      label: 'Enter descriptive text, guidelines, or instructions here.',
      fieldProps: {},
      treeDepth: 0,
      ...overrides,
    } as FieldNode;
  }

  if (type === 'divider') {
    return {
      id,
      type: 'divider',
      label: 'Divider',
      treeDepth: 0,
      ...overrides,
    } as FieldNode;
  }

  // Structural Container Nodes
  if (type === 'section') {
    return {
      id,
      type: 'section',
      isContainer: true,
      label: 'New Section',
      description: 'Configure section properties in the inspector panel',
      children: [],
      layoutProps: {
        cardStyle: 'bordered',
        collapsible: false,
      },
      treeDepth: 0,
      ...overrides,
    } as ContainerNode;
  }

  if (type === 'grid') {
    const col1Id = generateId('col');
    const col2Id = generateId('col');
    return {
      id,
      type: 'grid',
      isContainer: true,
      label: '2-Column Grid Row',
      layoutProps: {
        columns: 2,
        gap: 4,
      },
      children: [
        {
          id: col1Id,
          type: 'column',
          isContainer: true,
          label: 'Column 1',
          children: [],
          treeDepth: 0,
        },
        {
          id: col2Id,
          type: 'column',
          isContainer: true,
          label: 'Column 2',
          children: [],
          treeDepth: 0,
        },
      ],
      treeDepth: 0,
      ...overrides,
    } as ContainerNode;
  }

  if (type === 'column') {
    return {
      id,
      type: 'column',
      isContainer: true,
      label: 'Column',
      children: [],
      treeDepth: 0,
      ...overrides,
    } as ContainerNode;
  }

  if (type === 'card') {
    return {
      id,
      type: 'card',
      isContainer: true,
      label: 'Card Group',
      layoutProps: {
        cardStyle: 'bordered',
      },
      children: [],
      treeDepth: 0,
      ...overrides,
    } as ContainerNode;
  }

  if (type === 'tabs') {
    const tab1Id = generateId('tabpanel');
    const tab2Id = generateId('tabpanel');
    return {
      id,
      type: 'tabs',
      isContainer: true,
      label: 'Tab Group',
      layoutProps: {
        activeTab: tab1Id,
        tabs: [
          { id: tab1Id, label: 'Tab 1' },
          { id: tab2Id, label: 'Tab 2' },
        ],
      },
      children: [
        {
          id: tab1Id,
          type: 'tab-panel',
          isContainer: true,
          label: 'Tab 1 Content',
          children: [],
          treeDepth: 0,
        },
        {
          id: tab2Id,
          type: 'tab-panel',
          isContainer: true,
          label: 'Tab 2 Content',
          children: [],
          treeDepth: 0,
        },
      ],
      treeDepth: 0,
      ...overrides,
    } as ContainerNode;
  }

  // Form Input Controls
  const nameBase = `${type}_${Math.random().toString(36).substring(2, 6)}`;

  switch (type) {
    case 'text':
      return {
        id,
        type: 'text',
        name: nameBase,
        label: 'Text Field',
        placeholder: 'Enter text...',
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'textarea':
      return {
        id,
        type: 'textarea',
        name: nameBase,
        label: 'Multi-line Text Area',
        placeholder: 'Enter long-form text...',
        fieldProps: { rows: 3 },
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'number':
      return {
        id,
        type: 'number',
        name: nameBase,
        label: 'Number Input',
        placeholder: '0',
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'select':
      return {
        id,
        type: 'select',
        name: nameBase,
        label: 'Dropdown Select',
        placeholder: 'Select an option...',
        dataSource: {
          type: 'static',
          staticOptions: [
            { label: 'Option A', value: 'option_a' },
            { label: 'Option B', value: 'option_b' },
            { label: 'Option C', value: 'option_c' },
          ],
        },
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'radio':
      return {
        id,
        type: 'radio',
        name: nameBase,
        label: 'Radio Selection',
        dataSource: {
          type: 'static',
          staticOptions: [
            { label: 'Choice 1', value: 'choice_1' },
            { label: 'Choice 2', value: 'choice_2' },
          ],
        },
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'checkbox':
      return {
        id,
        type: 'checkbox',
        name: nameBase,
        label: 'I acknowledge and agree to the terms',
        defaultValue: false,
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'switch':
      return {
        id,
        type: 'switch',
        name: nameBase,
        label: 'Enable setting',
        defaultValue: false,
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'date':
      return {
        id,
        type: 'date',
        name: nameBase,
        label: 'Select Date',
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    case 'file':
      return {
        id,
        type: 'file',
        name: nameBase,
        label: 'Upload Attachment',
        helperText: 'Max file size 10MB (PDF, PNG, JPG)',
        validation: { required: false },
        treeDepth: 0,
        ...overrides,
      } as FieldNode;

    default:
      return {
        id,
        type: 'text',
        name: nameBase,
        label: 'Field',
        treeDepth: 0,
        ...overrides,
      } as FieldNode;
  }
}

/**
 * Deep clones a node and all descendants, assigning fresh unique IDs and unique field names
 */
export function cloneNodeWithNewIds(node: FormNode, existingNames: Set<string> = new Set()): FormNode {
  const newId = generateId(node.type);

  if (isContainerNode(node)) {
    const clonedChildren = node.children.map((child) => cloneNodeWithNewIds(child, existingNames));
    return {
      ...node,
      id: newId,
      label: node.label ? `${node.label} (Copy)` : undefined,
      children: clonedChildren,
    };
  }

  // Field or Presentational node
  const fieldNode = node as FieldNode;
  const newName = fieldNode.name ? generateUniqueFieldName(`${fieldNode.name}_copy`, existingNames) : undefined;

  return {
    ...fieldNode,
    id: newId,
    name: newName || generateId('field'),
    label: fieldNode.label ? `${fieldNode.label} (Copy)` : undefined,
  };
}

/**
 * Pure immutable insert of a new node relative to targetId
 */
export function insertNode(
  root: ContainerNode,
  targetId: string,
  position: DropZonePosition,
  newNode: FormNode
): ContainerNode {
  const updatedRoot = produce(root, (draft) => {
    // 1. If target is the root canvas
    if (draft.id === targetId) {
      if (position === 'before') {
        draft.children.unshift(newNode);
      } else {
        draft.children.push(newNode);
      }
      return;
    }

    // 2. If dropping inside a container
    if (position === 'inside') {
      const targetNode = findNodeById(draft, targetId);
      if (targetNode && isContainerNode(targetNode)) {
        targetNode.children.push(newNode);
        return;
      }
    }

    // 3. Dropping before or after a target node
    const found = findNodeAndParent(draft, targetId);
    if (!found) {
      // Fallback: append to root
      draft.children.push(newNode);
      return;
    }

    const { parent, index } = found;
    if (position === 'before') {
      parent.children.splice(index, 0, newNode);
    } else {
      parent.children.splice(index + 1, 0, newNode);
    }
  });

  return recalculateTreeDepths(updatedRoot);
}

/**
 * Pure immutable move of an existing node to targetId with given position
 */
export function moveNode(
  root: ContainerNode,
  activeId: string,
  targetId: string,
  position: DropZonePosition
): ContainerNode {
  // Disallow moving root or dropping on self
  if (activeId === root.id || activeId === targetId) {
    return root;
  }

  const activeNode = findNodeById(root, activeId);
  if (!activeNode) return root;

  // Disallow dropping a container inside one of its own descendants!
  if (isContainerNode(activeNode) && isDescendant(activeNode, targetId)) {
    return root;
  }

  const updatedRoot = produce(root, (draft) => {
    // 1. Locate and extract activeNode from current parent
    const activeLoc = findNodeAndParent(draft, activeId);
    if (!activeLoc) return;

    const [extracted] = activeLoc.parent.children.splice(activeLoc.index, 1);
    if (!extracted) return;

    // 2. Insert into new location
    if (draft.id === targetId) {
      if (position === 'before') {
        draft.children.unshift(extracted);
      } else {
        draft.children.push(extracted);
      }
      return;
    }

    if (position === 'inside') {
      const targetNode = findNodeById(draft, targetId);
      if (targetNode && isContainerNode(targetNode)) {
        targetNode.children.push(extracted);
        return;
      }
    }

    // Target before or after
    const targetLoc = findNodeAndParent(draft, targetId);
    if (!targetLoc) {
      draft.children.push(extracted);
      return;
    }

    const { parent, index } = targetLoc;
    if (position === 'before') {
      parent.children.splice(index, 0, extracted);
    } else {
      parent.children.splice(index + 1, 0, extracted);
    }
  });

  return recalculateTreeDepths(updatedRoot);
}

/**
 * Pure immutable removal of a node by ID
 */
export function removeNode(root: ContainerNode, id: string): ContainerNode {
  if (root.id === id) return root; // Cannot remove root canvas

  const updatedRoot = produce(root, (draft) => {
    const found = findNodeAndParent(draft, id);
    if (found) {
      found.parent.children.splice(found.index, 1);
    }
  });

  return recalculateTreeDepths(updatedRoot);
}

/**
 * Pure immutable update of node properties
 */
export function updateNodeProps(
  root: ContainerNode,
  id: string,
  updates: Partial<FormNode>
): ContainerNode {
  return produce(root, (draft) => {
    const node = findNodeById(draft, id);
    if (!node) return;

    Object.assign(node, updates);
  });
}

/**
 * Pure immutable duplicate of a node, inserted as a sibling right after it
 */
export function duplicateNode(root: ContainerNode, id: string): ContainerNode {
  if (root.id === id) return root; // Cannot duplicate root canvas

  const existingNames = new Set(getAllFieldNames(root));

  const updatedRoot = produce(root, (draft) => {
    const found = findNodeAndParent(draft, id);
    if (!found) return;

    const cloned = cloneNodeWithNewIds(found.node, existingNames);
    found.parent.children.splice(found.index + 1, 0, cloned);
  });

  return recalculateTreeDepths(updatedRoot);
}

/**
 * Tree Integrity Validator
 * Checks for duplicate IDs, duplicate form keys, and invalid container structures
 */
export function validateTreeIntegrity(root: ContainerNode): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  if (root.type !== 'canvas') {
    errors.push(`Root node must be of type 'canvas', found '${root.type}'`);
  }

  function checkNode(node: FormNode, path: string) {
    if (seenIds.has(node.id)) {
      errors.push(`Duplicate ID detected: '${node.id}' at ${path}`);
    } else {
      seenIds.add(node.id);
    }

    if (isFieldNode(node) && node.name) {
      if (seenNames.has(node.name)) {
        errors.push(`Duplicate form field name: '${node.name}' at ${path}`);
      } else {
        seenNames.add(node.name);
      }
    }

    if (isContainerNode(node)) {
      if (!Array.isArray(node.children)) {
        errors.push(`Container '${node.id}' children must be an array at ${path}`);
      } else {
        node.children.forEach((child, idx) => checkNode(child, `${path}.children[${idx}]`));
      }
    }
  }

  checkNode(root, 'root');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Palette Items Definition for Studio Drag-and-Drop
 */
export const PALETTE_ITEMS: PaletteItemMeta[] = [
  // Layout Containers
  {
    type: 'section',
    label: 'Section',
    category: 'layout',
    description: 'Group fields under an expandable or framed section',
    iconName: 'Layout',
    isContainer: true,
  },
  {
    type: 'grid',
    label: '2-Column Grid',
    category: 'layout',
    description: 'Horizontal multi-column row with responsive stacking',
    iconName: 'Columns',
    isContainer: true,
  },
  {
    type: 'card',
    label: 'Card Group',
    category: 'layout',
    description: 'Enclosed card container with borders and padding',
    iconName: 'CreditCard',
    isContainer: true,
  },
  {
    type: 'tabs',
    label: 'Tabs Panel',
    category: 'layout',
    description: 'Multi-tabbed container for tabbed step forms',
    iconName: 'FolderTab',
    isContainer: true,
  },

  // Form Inputs
  {
    type: 'text',
    label: 'Text Field',
    category: 'inputs',
    description: 'Single-line text input with custom placeholder and validation',
    iconName: 'Type',
    isContainer: false,
  },
  {
    type: 'textarea',
    label: 'Text Area',
    category: 'inputs',
    description: 'Multi-line text area for notes and long responses',
    iconName: 'AlignLeft',
    isContainer: false,
  },
  {
    type: 'number',
    label: 'Number',
    category: 'inputs',
    description: 'Numeric input with min, max, and step boundaries',
    iconName: 'Hash',
    isContainer: false,
  },
  {
    type: 'select',
    label: 'Dropdown Select',
    category: 'inputs',
    description: 'Searchable dropdown powered by static options or live REST API',
    iconName: 'ChevronDown',
    isContainer: false,
  },
  {
    type: 'radio',
    label: 'Radio Group',
    category: 'inputs',
    description: 'Single-selection radio button list (static or REST API)',
    iconName: 'CheckCircle',
    isContainer: false,
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    category: 'inputs',
    description: 'Boolean checkbox for agreements and single toggles',
    iconName: 'CheckSquare',
    isContainer: false,
  },
  {
    type: 'switch',
    label: 'Toggle Switch',
    category: 'inputs',
    description: 'Interactive toggle switch for binary options',
    iconName: 'ToggleRight',
    isContainer: false,
  },
  {
    type: 'date',
    label: 'Date Picker',
    category: 'inputs',
    description: 'Calendar date picker with format options',
    iconName: 'Calendar',
    isContainer: false,
  },
  {
    type: 'file',
    label: 'File Upload',
    category: 'inputs',
    description: 'File attachment dropzone with size and MIME filters',
    iconName: 'Paperclip',
    isContainer: false,
  },

  // Presentational Elements
  {
    type: 'heading',
    label: 'Heading',
    category: 'presentational',
    description: 'H1, H2, or H3 typography for titles and headers',
    iconName: 'Heading',
    isContainer: false,
  },
  {
    type: 'paragraph',
    label: 'Paragraph Text',
    category: 'presentational',
    description: 'Rich informational text or disclaimer paragraphs',
    iconName: 'Pilcrow',
    isContainer: false,
  },
  {
    type: 'divider',
    label: 'Divider Line',
    category: 'presentational',
    description: 'Horizontal separator line between form blocks',
    iconName: 'Minus',
    isContainer: false,
  },
];
