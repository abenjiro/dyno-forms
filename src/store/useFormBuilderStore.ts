import { create } from 'zustand';
import { produce } from 'immer';
import {
  DragItemData,
  DropZonePosition,
  FormNode,
  FormSchema,
  FormSettings,
} from '../types/schema';
import { sampleFormSchema } from '../data/initialSchema';
import {
  findNodeById,
  insertNode as insertNodeInTree,
  moveNode as moveNodeInTree,
  removeNode as removeNodeFromTree,
  updateNodeProps as updateNodePropsInTree,
  duplicateNode as duplicateNodeInTree,
  validateTreeIntegrity,
  getAllFieldNames as getFieldNamesFromTree,
} from './treeMutations';

const MAX_HISTORY_STEPS = 50;

export interface FormBuilderState {
  // Schema State
  schema: FormSchema;
  isDirty: boolean;

  // Selection & Hover State
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Active Drag State
  draggedItem: DragItemData | null;
  dropIndicator: {
    targetId: string;
    position: DropZonePosition;
  } | null;

  // Studio UI View State
  previewMode: 'edit' | 'preview';
  deviceView: 'desktop' | 'tablet' | 'mobile';
  paletteSearchTerm: string;
  selectedPaletteCategory: string;

  // History Stacks (Undo / Redo)
  past: FormSchema[];
  future: FormSchema[];

  // Actions: Selection & UI
  selectNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setDraggedItem: (item: DragItemData | null) => void;
  setDropIndicator: (indicator: { targetId: string; position: DropZonePosition } | null) => void;
  setPreviewMode: (mode: 'edit' | 'preview') => void;
  setDeviceView: (view: 'desktop' | 'tablet' | 'mobile') => void;
  setPaletteSearch: (term: string) => void;
  setPaletteCategory: (category: string) => void;

  // Actions: Tree Mutations (with Undo History)
  insertNode: (targetId: string, position: DropZonePosition, newNode: FormNode) => void;
  moveNode: (activeId: string, targetId: string, position: DropZonePosition) => void;
  removeNode: (id: string) => void;
  updateNodeProps: (id: string, updates: Partial<FormNode>, addToHistory?: boolean) => void;
  duplicateNode: (id: string) => void;

  // Actions: Form Meta & Settings
  updateFormSettings: (settings: Partial<FormSettings>) => void;
  updateFormMeta: (meta: { title?: string; description?: string }) => void;

  // Actions: History Management
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions: Schema Lifecycle
  setSchema: (schema: FormSchema) => void;
  resetSchema: () => void;
  exportSchemaJson: () => string;
  importSchemaJson: (jsonString: string) => { success: boolean; error?: string };

  // Selectors / Helpers
  getSelectedNode: () => FormNode | null;
  getNodeById: (id: string) => FormNode | null;
  getAllFieldNames: () => string[];
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  // Initial State
  schema: sampleFormSchema,
  isDirty: false,
  selectedNodeId: null,
  hoveredNodeId: null,
  draggedItem: null,
  dropIndicator: null,
  previewMode: 'edit',
  deviceView: 'desktop',
  paletteSearchTerm: '',
  selectedPaletteCategory: 'all',
  past: [],
  future: [],

  // UI Selection
  selectNode: (id) => set({ selectedNodeId: id }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setDraggedItem: (item) => set({ draggedItem: item }),
  setDropIndicator: (indicator) => set({ dropIndicator: indicator }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  setDeviceView: (view) => set({ deviceView: view }),
  setPaletteSearch: (term) => set({ paletteSearchTerm: term }),
  setPaletteCategory: (category) => set({ selectedPaletteCategory: category }),

  // Tree Mutation: Insert Node
  insertNode: (targetId, position, newNode) => {
    const { schema, past } = get();
    const newRoot = insertNodeInTree(schema.root, targetId, position, newNode);

    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: {
        ...schema,
        root: newRoot,
      },
      selectedNodeId: newNode.id,
      isDirty: true,
      dropIndicator: null,
      draggedItem: null,
    });
  },

  // Tree Mutation: Move Node
  moveNode: (activeId, targetId, position) => {
    const { schema, past } = get();
    const newRoot = moveNodeInTree(schema.root, activeId, targetId, position);

    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: {
        ...schema,
        root: newRoot,
      },
      selectedNodeId: activeId,
      isDirty: true,
      dropIndicator: null,
      draggedItem: null,
    });
  },

  // Tree Mutation: Remove Node
  removeNode: (id) => {
    const { schema, past, selectedNodeId } = get();
    const newRoot = removeNodeFromTree(schema.root, id);

    // If removed node or one of its descendants was selected, clear selection
    const stillExists = findNodeById(newRoot, selectedNodeId || '');

    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: {
        ...schema,
        root: newRoot,
      },
      selectedNodeId: stillExists ? selectedNodeId : null,
      isDirty: true,
    });
  },

  // Tree Mutation: Update Node Props
  updateNodeProps: (id, updates, addToHistory = true) => {
    const { schema, past } = get();
    const newRoot = updateNodePropsInTree(schema.root, id, updates);

    if (addToHistory) {
      set({
        past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
        future: [],
        schema: {
          ...schema,
          root: newRoot,
        },
        isDirty: true,
      });
    } else {
      set({
        schema: {
          ...schema,
          root: newRoot,
        },
        isDirty: true,
      });
    }
  },

  // Tree Mutation: Duplicate Node
  duplicateNode: (id) => {
    const { schema, past } = get();
    const newRoot = duplicateNodeInTree(schema.root, id);

    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: {
        ...schema,
        root: newRoot,
      },
      isDirty: true,
    });
  },

  // Form Settings & Meta
  updateFormSettings: (settingsUpdates) => {
    const { schema, past } = get();
    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: {
        ...schema,
        settings: {
          ...schema.settings,
          ...settingsUpdates,
        },
      },
      isDirty: true,
    });
  },

  updateFormMeta: ({ title, description }) => {
    const { schema, past } = get();
    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: {
        ...schema,
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
      isDirty: true,
    });
  },

  // History: Undo
  undo: () => {
    const { past, future, schema } = get();
    if (past.length === 0) return;

    const previousSchema = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      past: newPast,
      future: [schema, ...future],
      schema: previousSchema,
      isDirty: true,
    });
  },

  // History: Redo
  redo: () => {
    const { past, future, schema } = get();
    if (future.length === 0) return;

    const nextSchema = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, schema],
      future: newFuture,
      schema: nextSchema,
      isDirty: true,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  // Lifecycle
  setSchema: (newSchema) => {
    const { schema, past } = get();
    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: newSchema,
      selectedNodeId: null,
      isDirty: false,
    });
  },

  resetSchema: () => {
    const { schema, past } = get();
    set({
      past: [...past.slice(-MAX_HISTORY_STEPS + 1), schema],
      future: [],
      schema: sampleFormSchema,
      selectedNodeId: null,
      isDirty: false,
    });
  },

  exportSchemaJson: () => {
    return JSON.stringify(get().schema, null, 2);
  },

  importSchemaJson: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as FormSchema;
      if (!parsed || !parsed.root || typeof parsed.root !== 'object') {
        return { success: false, error: 'Invalid schema format: missing root canvas object.' };
      }

      const integrity = validateTreeIntegrity(parsed.root);
      if (!integrity.valid) {
        return {
          success: false,
          error: `Schema integrity validation failed: ${integrity.errors.join('; ')}`,
        };
      }

      get().setSchema(parsed);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `JSON parse error: ${err.message || 'Malformed JSON syntax'}`,
      };
    }
  },

  // Selectors
  getSelectedNode: () => {
    const { schema, selectedNodeId } = get();
    if (!selectedNodeId) return null;
    return findNodeById(schema.root, selectedNodeId);
  },

  getNodeById: (id: string) => {
    const { schema } = get();
    return findNodeById(schema.root, id);
  },

  getAllFieldNames: () => {
    const { schema } = get();
    return getFieldNamesFromTree(schema.root);
  },
}));
