import { ConditionalOperator, ConditionalRule, ConditionalVisibility, FormNode } from '../types/schema';

/**
 * Evaluate a single conditional rule against current form values
 */
export function evaluateRule(rule: ConditionalRule, formValues: Record<string, any>): boolean {
  const currentVal = formValues[rule.fieldId];
  const targetVal = rule.value;

  switch (rule.operator) {
    case 'equals':
      // Loose comparison handles string vs number coercions (e.g. "123" == 123)
      return String(currentVal ?? '') === String(targetVal ?? '');

    case 'not_equals':
      return String(currentVal ?? '') !== String(targetVal ?? '');

    case 'contains': {
      if (Array.isArray(currentVal)) {
        return currentVal.includes(targetVal);
      }
      return String(currentVal ?? '')
        .toLowerCase()
        .includes(String(targetVal ?? '').toLowerCase());
    }

    case 'greater_than': {
      const numCurrent = Number(currentVal);
      const numTarget = Number(targetVal);
      if (isNaN(numCurrent) || isNaN(numTarget)) return false;
      return numCurrent > numTarget;
    }

    case 'less_than': {
      const numCurrent = Number(currentVal);
      const numTarget = Number(targetVal);
      if (isNaN(numCurrent) || isNaN(numTarget)) return false;
      return numCurrent < numTarget;
    }

    case 'is_empty':
      return (
        currentVal === undefined ||
        currentVal === null ||
        currentVal === '' ||
        (Array.isArray(currentVal) && currentVal.length === 0)
      );

    case 'is_not_empty':
      return (
        currentVal !== undefined &&
        currentVal !== null &&
        currentVal !== '' &&
        (!Array.isArray(currentVal) || currentVal.length > 0)
      );

    default:
      return true;
  }
}

/**
 * Evaluate a complete ConditionalVisibility definition against current form values.
 * Returns true if the node should be shown in the UI.
 */
export function shouldShowNode(node: FormNode, formValues: Record<string, any>): boolean {
  if (!('conditions' in node) || !node.conditions || !node.conditions.rules || node.conditions.rules.length === 0) {
    return true;
  }

  const { action, matchType, rules } = node.conditions;

  const ruleResults = rules.map((rule) => evaluateRule(rule, formValues));
  const conditionMatched =
    matchType === 'all'
      ? ruleResults.every((res) => res === true)
      : ruleResults.some((res) => res === true);

  if (action === 'show') {
    return conditionMatched;
  }

  if (action === 'hide') {
    return !conditionMatched;
  }

  return true;
}

/**
 * Evaluate if node should be disabled based on conditional logic
 */
export function isNodeDisabled(node: FormNode, formValues: Record<string, any>): boolean {
  if (!('conditions' in node) || !node.conditions || !node.conditions.rules || node.conditions.rules.length === 0) {
    return false;
  }

  const { action, matchType, rules } = node.conditions;

  const ruleResults = rules.map((rule) => evaluateRule(rule, formValues));
  const conditionMatched =
    matchType === 'all'
      ? ruleResults.every((res) => res === true)
      : ruleResults.some((res) => res === true);

  if (action === 'disable') {
    return conditionMatched;
  }

  if (action === 'enable') {
    return !conditionMatched;
  }

  return false;
}
