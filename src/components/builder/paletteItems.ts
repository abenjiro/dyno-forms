import { FormNode, NodeType, PaletteItemMeta } from '@/types/schema';

export const PALETTE_ITEMS: PaletteItemMeta[] = [
  // Layout Containers
  {
    type: 'section',
    label: 'Section',
    category: 'layout',
    description: 'Collapsible grouped container with header & description',
    iconName: 'LayoutGrid',
    isContainer: true,
  },
  {
    type: 'grid',
    label: '2-Column Grid',
    category: 'layout',
    description: 'Side-by-side responsive multi-column layout',
    iconName: 'Columns2',
    isContainer: true,
  },
  {
    type: 'card',
    label: 'Card Container',
    category: 'layout',
    description: 'Elevated or bordered visual panel container',
    iconName: 'SquareDashed',
    isContainer: true,
  },
  {
    type: 'tabs',
    label: 'Tabs Container',
    category: 'layout',
    description: 'Multi-step tab navigation with tab switching',
    iconName: 'Folder',
    isContainer: true,
  },

  // Form Inputs
  {
    type: 'text',
    label: 'Single-line Text',
    category: 'inputs',
    description: 'Standard single-line text input field',
    iconName: 'CaseUpper',
    isContainer: false,
  },
  {
    type: 'textarea',
    label: 'Multi-line Textarea',
    category: 'inputs',
    description: 'Multi-line rich text or notes area',
    iconName: 'AlignLeft',
    isContainer: false,
  },
  {
    type: 'number',
    label: 'Number Input',
    category: 'inputs',
    description: 'Numeric input with min, max, and step boundaries',
    iconName: 'Binary',
    isContainer: false,
  },
  {
    type: 'select',
    label: 'Dropdown Select',
    category: 'inputs',
    description: 'Static choices or live dynamic REST API data options',
    iconName: 'ChevronDownSquare',
    isContainer: false,
  },
  {
    type: 'radio',
    label: 'Radio Choices',
    category: 'inputs',
    description: 'Single-select radio group with static or API options',
    iconName: 'CheckCircle2',
    isContainer: false,
  },
  {
    type: 'checkbox',
    label: 'Single Checkbox',
    category: 'inputs',
    description: 'Terms consent, confirmation, or boolean flag',
    iconName: 'CheckSquare',
    isContainer: false,
  },
  {
    type: 'switch',
    label: 'Toggle Switch',
    category: 'inputs',
    description: 'Boolean on/off sliding switch control',
    iconName: 'ToggleRight',
    isContainer: false,
  },
  {
    type: 'date',
    label: 'Date Picker',
    category: 'inputs',
    description: 'Calendar date selection field',
    iconName: 'Calendar',
    isContainer: false,
  },
  {
    type: 'file',
    label: 'File Upload',
    category: 'inputs',
    description: 'File upload zone supporting drag and drop',
    iconName: 'UploadCloud',
    isContainer: false,
  },

  // Presentational Elements
  {
    type: 'heading',
    label: 'Heading Title',
    category: 'presentational',
    description: 'Section headline or sub-header text',
    iconName: 'Heading',
    isContainer: false,
  },
  {
    type: 'paragraph',
    label: 'Paragraph Text',
    category: 'presentational',
    description: 'Informational descriptive instructional text block',
    iconName: 'Pilcrow',
    isContainer: false,
  },
  {
    type: 'divider',
    label: 'Divider Line',
    category: 'presentational',
    description: 'Subtle horizontal rule with optional divider label',
    iconName: 'Minus',
    isContainer: false,
  },
];

/**
 * Creates a new FormNode instance with initialized defaults when dragged onto canvas
 */
export function createNewNodeFromType(type: NodeType): FormNode {
  const uniqueSuffix = Math.random().toString(36).substring(2, 7);
  const id = `${type}_${uniqueSuffix}`;

  switch (type) {
    // Structural Containers
    case 'section':
      return {
        id,
        type: 'section',
        label: 'New Section',
        description: 'Provide section instructions or details here',
        isContainer: true,
        children: [],
        layoutProps: {
          collapsible: true,
        },
      };

    case 'grid':
      return {
        id,
        type: 'grid',
        isContainer: true,
        children: [],
        layoutProps: {
          columns: 2,
          gap: 4,
        },
      };

    case 'card':
      return {
        id,
        type: 'card',
        label: 'Card Panel',
        isContainer: true,
        children: [],
        layoutProps: {
          cardStyle: 'bordered',
        },
      };

    case 'tabs':
      return {
        id,
        type: 'tabs',
        isContainer: true,
        children: [
          {
            id: `tab_1_${uniqueSuffix}`,
            type: 'section',
            label: 'Tab 1',
            isContainer: true,
            children: [],
          },
          {
            id: `tab_2_${uniqueSuffix}`,
            type: 'section',
            label: 'Tab 2',
            isContainer: true,
            children: [],
          },
        ],
        layoutProps: {
          tabs: [
            { id: `tab_1_${uniqueSuffix}`, label: 'Step 1' },
            { id: `tab_2_${uniqueSuffix}`, label: 'Step 2' },
          ],
        },
      };

    // Form Inputs
    case 'text':
      return {
        id,
        type: 'text',
        name: `field_${uniqueSuffix}`,
        label: 'Text Field',
        placeholder: 'Enter text...',
        validation: {
          required: false,
        },
      };

    case 'textarea':
      return {
        id,
        type: 'textarea',
        name: `field_${uniqueSuffix}`,
        label: 'Detailed Notes',
        placeholder: 'Write your notes or feedback here...',
        validation: {
          required: false,
        },
        fieldProps: {
          rows: 3,
        },
      };

    case 'number':
      return {
        id,
        type: 'number',
        name: `field_${uniqueSuffix}`,
        label: 'Quantity / Amount',
        placeholder: '0',
        validation: {
          required: false,
        },
      };

    case 'select':
      return {
        id,
        type: 'select',
        name: `field_${uniqueSuffix}`,
        label: 'Select Option',
        placeholder: 'Choose an option...',
        dataSource: {
          type: 'static',
          staticOptions: [
            { label: 'Option A', value: 'option_a' },
            { label: 'Option B', value: 'option_b' },
            { label: 'Option C', value: 'option_c' },
          ],
        },
        validation: {
          required: false,
        },
      };

    case 'radio':
      return {
        id,
        type: 'radio',
        name: `field_${uniqueSuffix}`,
        label: 'Select One',
        dataSource: {
          type: 'static',
          staticOptions: [
            { label: 'Choice 1', value: 'choice_1' },
            { label: 'Choice 2', value: 'choice_2' },
          ],
        },
        validation: {
          required: false,
        },
      };

    case 'checkbox':
      return {
        id,
        type: 'checkbox',
        name: `field_${uniqueSuffix}`,
        label: 'I accept and agree to the specified conditions',
        validation: {
          required: false,
        },
      };

    case 'switch':
      return {
        id,
        type: 'switch',
        name: `field_${uniqueSuffix}`,
        label: 'Enable Feature Notification',
        description: 'Send automated status updates',
      };

    case 'date':
      return {
        id,
        type: 'date',
        name: `field_${uniqueSuffix}`,
        label: 'Select Date',
        validation: {
          required: false,
        },
      };

    case 'file':
      return {
        id,
        type: 'file',
        name: `field_${uniqueSuffix}`,
        label: 'Attach Document',
        description: 'Upload supporting proof or certificate (PDF / PNG)',
        validation: {
          required: false,
        },
      };

    // Presentational Elements
    case 'heading':
      return {
        id,
        name: id,
        type: 'heading',
        label: 'Section Heading',
        description: 'Optional subheader text',
      };

    case 'paragraph':
      return {
        id,
        name: id,
        type: 'paragraph',
        description: 'This is an informative text block explaining requirements or next steps.',
      };

    case 'divider':
      return {
        id,
        name: id,
        type: 'divider',
        label: '',
      };

    default:
      return {
        id,
        type: 'text',
        name: `field_${uniqueSuffix}`,
        label: 'New Field',
      };
  }
}
