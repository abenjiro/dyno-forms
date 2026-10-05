import { z, ZodTypeAny } from 'zod';
import { ContainerNode, FieldNode, FormSchema, isFieldNode } from '../types/schema';
import { flattenTree } from '../store/treeMutations';

/**
 * Builds a dynamic Zod validation schema based on the AST field definitions
 */
export function buildZodSchema(schemaOrRoot: FormSchema | ContainerNode): z.ZodObject<Record<string, ZodTypeAny>> {
  const root = 'root' in schemaOrRoot ? schemaOrRoot.root : schemaOrRoot;
  const allNodes = flattenTree(root);
  const fieldNodes = allNodes.filter(
    (node): node is FieldNode => isFieldNode(node) && typeof node.name === 'string' && node.name.length > 0
  );

  const shape: Record<string, ZodTypeAny> = {};

  for (const field of fieldNodes) {
    const { name, type, validation = {}, label } = field;
    const displayName = label || name;
    const reqMsg = validation.requiredMessage || `${displayName} is required`;

    let fieldSchema: ZodTypeAny;

    switch (type) {
      case 'number': {
        if (validation.required) {
          fieldSchema = z.preprocess((val) => {
            if (val === '' || val === null || val === undefined) return undefined;
            const num = Number(val);
            return isNaN(num) ? undefined : num;
          }, z.number({ required_error: reqMsg, invalid_type_error: `${displayName} must be a number` }));

          if (typeof validation.min === 'number') {
            fieldSchema = (fieldSchema as z.ZodNumber).min(
              validation.min,
              `${displayName} must be at least ${validation.min}`
            );
          }
          if (typeof validation.max === 'number') {
            fieldSchema = (fieldSchema as z.ZodNumber).max(
              validation.max,
              `${displayName} must be at most ${validation.max}`
            );
          }
        } else {
          fieldSchema = z.preprocess((val) => {
            if (val === '' || val === null || val === undefined) return undefined;
            const num = Number(val);
            return isNaN(num) ? undefined : num;
          }, z.number().optional());

          if (typeof validation.min === 'number') {
            fieldSchema = z.preprocess((val) => {
              if (val === '' || val === null || val === undefined) return undefined;
              const num = Number(val);
              return isNaN(num) ? undefined : num;
            }, z.number().min(validation.min, `${displayName} must be at least ${validation.min}`).optional());
          }
          if (typeof validation.max === 'number') {
            fieldSchema = z.preprocess((val) => {
              if (val === '' || val === null || val === undefined) return undefined;
              const num = Number(val);
              return isNaN(num) ? undefined : num;
            }, z.number().max(validation.max, `${displayName} must be at most ${validation.max}`).optional());
          }
        }
        break;
      }

      case 'checkbox': {
        if (validation.required) {
          fieldSchema = z.boolean().refine((val) => val === true, {
            message: reqMsg,
          });
        } else {
          fieldSchema = z.boolean().optional().default(false);
        }
        break;
      }

      case 'switch': {
        fieldSchema = z.boolean().optional().default(false);
        break;
      }

      case 'file': {
        if (validation.required) {
          fieldSchema = z.any().refine(
            (val) => {
              if (!val) return false;
              if (val instanceof FileList) return val.length > 0;
              if (Array.isArray(val)) return val.length > 0;
              return true;
            },
            { message: reqMsg }
          );
        } else {
          fieldSchema = z.any().optional();
        }
        break;
      }

      case 'text':
      case 'textarea':
      case 'select':
      case 'radio':
      case 'date':
      default: {
        let strSchema = z.string();

        if (validation.required) {
          strSchema = strSchema.min(1, reqMsg);
        }

        if (validation.email) {
          strSchema = strSchema.email(validation.patternMessage || 'Must be a valid email address');
        }

        if (typeof validation.minLength === 'number' && validation.minLength > 0) {
          strSchema = strSchema.min(
            validation.minLength,
            `${displayName} must be at least ${validation.minLength} characters`
          );
        }

        if (typeof validation.maxLength === 'number' && validation.maxLength > 0) {
          strSchema = strSchema.max(
            validation.maxLength,
            `${displayName} must not exceed ${validation.maxLength} characters`
          );
        }

        if (validation.pattern) {
          try {
            const regex = new RegExp(validation.pattern);
            strSchema = strSchema.regex(regex, validation.patternMessage || 'Invalid format');
          } catch {
            // Ignore malformed regex pattern gracefully
          }
        }

        if (!validation.required) {
          fieldSchema = strSchema.optional().or(z.literal(''));
        } else {
          fieldSchema = strSchema;
        }
        break;
      }
    }

    shape[name] = fieldSchema;
  }

  return z.object(shape);
}
