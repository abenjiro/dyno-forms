/**
 * Server-side Draft Persistence Store
 * In-memory map with file-backed persistence for Docker/Dev environments
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ServerDraft {
  draftId: string;
  formId: string;
  resumeToken: string;
  values: Record<string, any>;
  savedAt: string;
  updatedAt: string;
}

// Global in-memory storage to preserve across hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __dyno_drafts_store: Map<string, ServerDraft> | undefined;
}

const draftsMap: Map<string, ServerDraft> =
  global.__dyno_drafts_store || (global.__dyno_drafts_store = new Map());

const STORAGE_FILE = path.join(process.cwd(), '.next', 'drafts-cache.json');

// Helper to load cache from file if available
function loadPersistedDrafts() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          draftsMap.set(item.resumeToken, item);
        }
      }
    }
  } catch {
    // Graceful fallback to memory
  }
}

function savePersistedDrafts() {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(draftsMap.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Graceful fallback to memory
  }
}

// Initial load
loadPersistedDrafts();

export function saveDraft(formId: string, values: Record<string, any>, existingToken?: string): ServerDraft {
  const resumeToken = existingToken || `dft_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
  const draftId = `draft_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const existing = draftsMap.get(resumeToken);
  const draft: ServerDraft = {
    draftId: existing ? existing.draftId : draftId,
    formId,
    resumeToken,
    values,
    savedAt: existing ? existing.savedAt : now,
    updatedAt: now,
  };

  draftsMap.set(resumeToken, draft);
  savePersistedDrafts();

  return draft;
}

export function getDraft(formId: string, resumeToken: string): ServerDraft | null {
  const draft = draftsMap.get(resumeToken);
  if (!draft) return null;
  if (draft.formId !== formId) return null;
  return draft;
}

export function deleteDraft(formId: string, resumeToken: string): boolean {
  const draft = draftsMap.get(resumeToken);
  if (!draft || draft.formId !== formId) return false;
  draftsMap.delete(resumeToken);
  savePersistedDrafts();
  return true;
}
