/**
 * Dyno Forms — Draft & Auto-Save Manager
 * Hybrid Local (localStorage) + Remote Resume Token API
 */

export interface LocalDraftData {
  formId: string;
  values: Record<string, any>;
  progress: number;
  savedAt: string;
}

const DRAFT_PREFIX = 'dyno_form_draft_';

/**
 * Save draft state to client local storage
 */
export async function saveLocalDraft(
  formId: string,
  values: Record<string, any>,
  progress: number
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const payload: LocalDraftData = {
      formId,
      values,
      progress,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(`${DRAFT_PREFIX}${formId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn('[DraftManager] Failed to save local draft:', err);
  }
}

/**
 * Load draft state from client local storage
 */
export async function loadLocalDraft(formId: string): Promise<LocalDraftData | null> {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${formId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LocalDraftData;
  } catch (err) {
    console.warn('[DraftManager] Failed to load local draft:', err);
    return null;
  }
}

/**
 * Clear local draft
 */
export async function clearLocalDraft(formId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${formId}`);
  } catch (err) {
    console.warn('[DraftManager] Failed to clear local draft:', err);
  }
}

/**
 * Save draft state to server API to generate a shareable resume link
 */
export async function saveServerDraft(
  formId: string,
  values: Record<string, any>
): Promise<{ draftId: string; resumeToken: string; resumeUrl: string; savedAt: string }> {
  const response = await fetch(`/api/forms/${encodeURIComponent(formId)}/drafts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Server responded with ${response.status}`);
  }

  return response.json();
}

/**
 * Load saved draft state from server by resume token
 */
export async function loadServerDraft(
  formId: string,
  resumeToken: string
): Promise<{ values: Record<string, any>; savedAt: string } | null> {
  const response = await fetch(
    `/api/forms/${encodeURIComponent(formId)}/drafts/${encodeURIComponent(resumeToken)}`
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to load server draft: HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    values: data.values || {},
    savedAt: data.savedAt,
  };
}
