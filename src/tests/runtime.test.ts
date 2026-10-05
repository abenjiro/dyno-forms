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
import { FormNode } from '../types/schema';

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
const savedDraft = saveDraft('test_form_id', { companyName: 'Draft Company' });
assert(savedDraft.resumeToken.length > 5, 'Resume token should be generated');
assert(savedDraft.values.companyName === 'Draft Company', 'Draft values should match');

const retrievedDraft = getDraft('test_form_id', savedDraft.resumeToken);
assert(retrievedDraft !== null && retrievedDraft.draftId === savedDraft.draftId, 'Draft should be retrievable by token');
console.log('  ✓ saveDraft & getDraft passed');

const deleted = deleteDraft('test_form_id', savedDraft.resumeToken);
assert(deleted === true, 'Draft should be deleted');
assert(getDraft('test_form_id', savedDraft.resumeToken) === null, 'Deleted draft should not exist');
console.log('  ✓ deleteDraft passed');

console.log('--- ALL UNIT TESTS COMPLETED SUCCESSFULLY! ---');
