import assert from 'node:assert';
import { sampleFormSchema } from '../data/initialSchema';
import {
  findNodeById,
  insertNode,
  moveNode,
  removeNode,
  updateNodeProps,
  duplicateNode,
  flattenTree,
  validateTreeIntegrity,
} from '../store/treeMutations';
import {
  evaluateRule,
  shouldShowNode,
  isNodeDisabled,
} from '../runtime/conditionEvaluator';
import { buildZodSchema } from '../runtime/validationBuilder';
import { saveDraft, getDraft, deleteDraft } from '../runtime/serverDraftStorage';
import { saveFormSchema, getFormSchema, deleteFormSchema } from '../runtime/serverSchemaStorage';
import { FormNode, FormSchema } from '../types/schema';

console.log('--- RUNNING DYNO FORMS CORE UNIT TESTS ---');

// 1. Tree Mutation Tests
console.log('1. Testing Tree Mutations...');
const root = JSON.parse(JSON.stringify(sampleFormSchema.root));

// Test flattenTree
const allNodes = flattenTree(root);
assert(allNodes.length > 5, 'flattenTree should return all nodes');
console.log(`  ✓ flattenTree returned ${allNodes.length} nodes`);

// Test validateTreeIntegrity
const integrity = validateTreeIntegrity(root);
assert(integrity.valid, 'Initial sample tree should have valid integrity');
console.log('  ✓ Tree integrity check passed');

// Test insertNode
const testNewNode: FormNode = {
  id: 'test_field_123',
  type: 'text',
  name: 'testFieldName',
  label: 'Test Input',
};
const rootWithNewNode = insertNode(root, 'sec_company_info', 'inside', testNewNode);
const foundNewNode = findNodeById(rootWithNewNode, 'test_field_123');
assert(foundNewNode !== null, 'Inserted node should be found in tree');
console.log('  ✓ insertNode passed');

// Test updateNodeProps
const rootUpdated = updateNodeProps(rootWithNewNode, 'test_field_123', {
  label: 'Updated Label Here',
});
const updatedNode = findNodeById(rootUpdated, 'test_field_123');
assert(updatedNode?.label === 'Updated Label Here', 'Node props should be updated');
console.log('  ✓ updateNodeProps passed');

// Test duplicateNode
const rootDuplicated = duplicateNode(rootUpdated, 'test_field_123');
const allDuplicatedNodes = flattenTree(rootDuplicated);
assert(allDuplicatedNodes.length === allNodes.length + 2, 'Duplicate should increase node count');
console.log('  ✓ duplicateNode passed');

// Test removeNode
const rootRemoved = removeNode(rootDuplicated, 'test_field_123');
assert(findNodeById(rootRemoved, 'test_field_123') === null, 'Removed node should not exist');
console.log('  ✓ removeNode passed');

// 2. Condition Evaluator Tests
console.log('2. Testing Condition Evaluator...');
const values = {
  country: 'US',
  age: 25,
  skills: ['React', 'TypeScript'],
  bio: '',
};

assert(evaluateRule({ fieldId: 'country', operator: 'equals', value: 'US' }, values) === true);
assert(evaluateRule({ fieldId: 'country', operator: 'equals', value: 'CA' }, values) === false);
assert(evaluateRule({ fieldId: 'age', operator: 'greater_than', value: 18 }, values) === true);
assert(evaluateRule({ fieldId: 'skills', operator: 'contains', value: 'React' }, values) === true);
assert(evaluateRule({ fieldId: 'bio', operator: 'is_empty' }, values) === true);
assert(evaluateRule({ fieldId: 'country', operator: 'is_not_empty' }, values) === true);
console.log('  ✓ evaluateRule operators passed');

const conditionalNode: FormNode = {
  id: 'conditional_field',
  type: 'text',
  name: 'ssn',
  label: 'Social Security Number',
  conditions: {
    action: 'show',
    matchType: 'all',
    rules: [{ fieldId: 'country', operator: 'equals', value: 'US' }],
  },
};
assert(shouldShowNode(conditionalNode, { country: 'US' }) === true);
assert(shouldShowNode(conditionalNode, { country: 'GB' }) === false);
console.log('  ✓ shouldShowNode passed');

// 3. Validation Builder Tests
console.log('3. Testing Dynamic Zod Validation Schema Builder...');
const zodSchema = buildZodSchema(sampleFormSchema);

// Missing required fields
const invalidResult = zodSchema.safeParse({});
assert(!invalidResult.success, 'Schema validation should fail on empty required fields');
console.log('  ✓ Required validation caught missing fields correctly');

// Invalid email
const invalidEmailResult = zodSchema.safeParse({
  companyName: 'Acme Corp',
  taxId: '12345',
  country: 'US',
  stateProvince: 'CA',
  contactName: 'John',
  contactEmail: 'not-an-email',
  organizationType: 'llc',
  termsAgreed: true,
});
assert(!invalidEmailResult.success, 'Invalid email should fail validation');
console.log('  ✓ Email regex validation caught invalid format');

// Valid full payload
const validResult = zodSchema.safeParse({
  companyName: 'Acme Corp',
  taxId: '12345',
  country: 'US',
  stateProvince: 'CA',
  contactName: 'John Doe',
  contactEmail: 'john@acme.com',
  organizationType: 'llc',
  termsAgreed: true,
});
assert(validResult.success, 'Valid payload should succeed');
console.log('  ✓ Valid form payload passed dynamic Zod schema');

// 4. Server Draft Storage Tests
console.log('4. Testing Server Draft Storage...');
const customSchema: FormSchema = {
  id: 'form_custom_test_999',
  version: '1.0.0',
  title: 'Custom Converted Job Application Form',
  description: 'Customized form schema',
  root: {
    id: 'root_canvas',
    type: 'canvas',
    isContainer: true,
    children: [
      {
        id: 'field_candidate_name',
        type: 'text',
        name: 'candidateName',
        label: 'Candidate Full Name',
        validation: { required: true },
      },
    ],
  },
  settings: {
    enableDrafts: true,
    draftAutoSaveIntervalMs: 1500,
  },
};

const savedDraft = saveDraft('form_custom_test_999', { candidateName: 'Alice Smith' }, undefined, customSchema);
assert(savedDraft.resumeToken.length > 5, 'Resume token should be generated');
assert(savedDraft.values.candidateName === 'Alice Smith', 'Draft values should match');
assert(savedDraft.schema?.title === 'Custom Converted Job Application Form', 'Draft should retain custom schema');

const retrievedDraft = getDraft('form_custom_test_999', savedDraft.resumeToken);
assert(retrievedDraft !== null && retrievedDraft.draftId === savedDraft.draftId, 'Draft should be retrievable by token');
assert(retrievedDraft.schema?.id === 'form_custom_test_999', 'Retrieved draft should have custom schema');
console.log('  ✓ saveDraft & getDraft with custom schema passed');

// Test that saving draft with schema also persisted to serverSchemaStorage
const retrievedSchemaFromStore = getFormSchema('form_custom_test_999');
assert(retrievedSchemaFromStore !== null, 'Schema should be automatically stored in serverSchemaStorage');
assert(retrievedSchemaFromStore.title === 'Custom Converted Job Application Form', 'Stored schema title should match');
console.log('  ✓ Draft auto-persisted schema into serverSchemaStorage passed');

// 5. Server Schema Storage Direct Tests
console.log('5. Testing Server Schema Storage Direct Operations...');
const standaloneSchema: FormSchema = {
  ...customSchema,
  id: 'form_standalone_888',
  title: 'Standalone Direct Schema',
};
saveFormSchema(standaloneSchema);
const foundStandalone = getFormSchema('form_standalone_888');
assert(foundStandalone !== null && foundStandalone.title === 'Standalone Direct Schema', 'getFormSchema should retrieve saved schema');
deleteFormSchema('form_standalone_888');
assert(getFormSchema('form_standalone_888') === null, 'deleteFormSchema should remove schema');
console.log('  ✓ saveFormSchema, getFormSchema, deleteFormSchema passed');

const deleted = deleteDraft('form_custom_test_999', savedDraft.resumeToken);
assert(deleted === true, 'Draft should be deleted');
assert(getDraft('form_custom_test_999', savedDraft.resumeToken) === null, 'Deleted draft should not exist');
console.log('  ✓ deleteDraft passed');

console.log('--- ALL UNIT TESTS COMPLETED SUCCESSFULLY! ---');
