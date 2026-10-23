/**
 * Server-side Form Schema Persistence Store
 * Global in-memory storage with file-backed persistence for Docker/Dev environments
 */

import fs from 'node:fs';
import path from 'node:path';
import { FormSchema } from '@/types/schema';
import { sampleFormSchema } from '@/data/initialSchema';

declare global {
  // eslint-disable-next-line no-var
  var __dyno_schemas_store: Map<string, FormSchema> | undefined;
}

const schemasMap: Map<string, FormSchema> =
  global.__dyno_schemas_store || (global.__dyno_schemas_store = new Map());

const STORAGE_FILE = path.join(process.cwd(), '.next', 'schemas-cache.json');

function loadPersistedSchemas() {
  try {
    // Seed default sample form
    if (!schemasMap.has(sampleFormSchema.id)) {
      schemasMap.set(sampleFormSchema.id, sampleFormSchema);
    }

    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.id && item.root) {
            schemasMap.set(item.id, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SchemaStorage] Failed to read cached schemas:', err);
  }
}

function savePersistedSchemas() {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(schemasMap.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SchemaStorage] Failed to write cached schemas:', err);
  }
}

// Initial load
loadPersistedSchemas();

/**
 * Save or update a form schema in the server store
 */
export function saveFormSchema(schema: FormSchema): FormSchema {
  if (!schema || !schema.id) {
    throw new Error('Invalid form schema: schema must have a valid id');
  }

  schemasMap.set(schema.id, schema);
  savePersistedSchemas();
  return schema;
}

/**
 * Get a form schema by its ID
 */
export function getFormSchema(formId: string): FormSchema | null {
  if (!formId) return null;

  // Handle demo alias
  if (formId === 'demo') {
    return schemasMap.get('demo') || sampleFormSchema;
  }

  const schema = schemasMap.get(formId);
  if (schema) return schema;

  // If matching sample schema id
  if (formId === sampleFormSchema.id) {
    return sampleFormSchema;
  }

  return null;
}

/**
 * List all saved form schemas
 */
export function listFormSchemas(): FormSchema[] {
  return Array.from(schemasMap.values());
}

/**
 * Delete a form schema by ID
 */
export function deleteFormSchema(formId: string): boolean {
  if (!formId || formId === sampleFormSchema.id) return false;
  const deleted = schemasMap.delete(formId);
  if (deleted) {
    savePersistedSchemas();
  }
  return deleted;
}
