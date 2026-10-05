/**
 * Dyno Forms — Abstract Syntax Tree (AST) Schema Definitions
 * 100% Strictly Typed TypeScript Interfaces
 */

export type NodeType =
  // Structural Containers
  | 'canvas'
  | 'section'
  | 'grid'
  | 'column'
  | 'card'
  | 'tabs'
  | 'tab-panel'
  // Input Controls
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'file'
  // Presentational Elements
  | 'heading'
  | 'paragraph'
  | 'divider';

export interface BaseNode {
  id: string;
  type: NodeType;
  label?: string;
  description?: string;
  name?: string; // Form key name in react-hook-form
  placeholder?: string;
  helperText?: string;
  defaultValue?: any;
  customClass?: string;
  treeDepth?: number;
}

export interface ContainerLayoutProps {
  columns?: number; // 1, 2, 3, 4 column grid
  gap?: number;
  collapsible?: boolean;
  cardStyle?: 'bordered' | 'shadow' | 'flat';
  activeTab?: string;
  tabs?: Array<{ id: string; label: string }>;
}

export interface ContainerNode extends BaseNode {
  isContainer: true;
  children: FormNode[];
  layoutProps?: ContainerLayoutProps;
}

export interface StaticOption {
  label: string;
  value: string | number;
}

export interface ApiDataSourceConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  dataArrayPath?: string; // Dot path into response (e.g. 'data.results' or '' if root array)
  labelPath: string;      // Dot path for display label (e.g. 'name.common')
  valuePath: string;      // Dot path for value (e.g. 'cca2')
  dependsOnField?: string; // Cascading parent field name
  dependencyParamKey?: string; // Query param key for dependency (e.g. 'country_code')
  cacheTimeMs?: number;
}

export interface DataSourceConfig {
  type: 'static' | 'api';
  staticOptions?: StaticOption[];
  api?: ApiDataSourceConfig;
}

export interface ValidationConfig {
  required?: boolean;
  requiredMessage?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  email?: boolean;
}

export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export interface ConditionalRule {
  fieldId: string; // ID or name of the target field
  operator: ConditionalOperator;
  value?: any;
}

export interface ConditionalVisibility {
  action: 'show' | 'hide' | 'enable' | 'disable';
  matchType: 'all' | 'any'; // AND vs OR
  rules: ConditionalRule[];
}

export interface FieldNode extends BaseNode {
  isContainer?: false;
  name: string; // Form key in react-hook-form
  dataSource?: DataSourceConfig;
  validation?: ValidationConfig;
  conditions?: ConditionalVisibility;
  fieldProps?: Record<string, any>;
}

export type FormNode = ContainerNode | FieldNode;

export interface FormSettings {
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  submitUrl?: string;
  submitMethod?: 'POST' | 'PUT';
  enableDrafts?: boolean;
  draftAutoSaveIntervalMs?: number;
  theme?: {
    primaryColor?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    density?: 'compact' | 'comfortable' | 'spacious';
  };
}

export interface FormSchema {
  id: string;
  version: string;
  title: string;
  description?: string;
  settings: FormSettings;
  root: ContainerNode;
}

// Drag and drop helper types
export type DropZonePosition = 'before' | 'after' | 'inside';

export interface DragItemData {
  id: string;
  type: NodeType;
  isPaletteItem?: boolean;
  isContainer?: boolean;
  treeDepth?: number;
  node?: FormNode;
}
