import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDraft as getMemoryDraft, deleteDraft as deleteMemoryDraft } from '@/runtime/serverDraftStorage';

/**
 * GET /api/forms/[id]/drafts/[token]
 * Resolves a draft by resumeToken (checking PostgreSQL then in-memory cache)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  try {
    const { id, token } = await params;

    // 1. Check PostgreSQL first
    const dbDraft = await prisma.draft.findUnique({
      where: { resumeToken: token },
    });

    if (dbDraft) {
      return NextResponse.json({
        success: true,
        draftId: dbDraft.id,
        formId: dbDraft.formId,
        resumeToken: dbDraft.resumeToken,
        values: dbDraft.values || {},
        schema: dbDraft.schema,
        email: dbDraft.email,
        phone: dbDraft.phone,
        progress: dbDraft.progress,
        savedAt: dbDraft.updatedAt.toISOString(),
      });
    }

    // 2. Fallback to in-memory/file storage cache
    const memDraft = getMemoryDraft(id, token);
    if (!memDraft) {
      return NextResponse.json({ error: 'Draft not found or expired' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      draftId: memDraft.draftId,
      formId: memDraft.formId,
      resumeToken: memDraft.resumeToken,
      values: memDraft.values || {},
      schema: memDraft.schema,
      savedAt: memDraft.updatedAt,
    });
  } catch (err: any) {
    console.error('[DraftsTokenAPI] GET failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/forms/[id]/drafts/[token]
 * Deletes a draft upon submission or cancellation
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  try {
    const { id, token } = await params;

    let deletedAny = false;

    // 1. Delete from PostgreSQL
    try {
      const dbDraft = await prisma.draft.findUnique({
        where: { resumeToken: token },
      });
      if (dbDraft) {
        await prisma.draft.delete({ where: { id: dbDraft.id } });
        deletedAny = true;
      }
    } catch (dbErr) {
      console.warn('[DraftsTokenAPI] DB delete warning:', dbErr);
    }

    // 2. Delete from in-memory cache
    const memDeleted = deleteMemoryDraft(id, token);
    if (memDeleted) {
      deletedAny = true;
    }

    if (!deletedAny) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Draft cleared successfully' });
  } catch (err: any) {
    console.error('[DraftsTokenAPI] DELETE failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
