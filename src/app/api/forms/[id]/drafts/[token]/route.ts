import { NextRequest, NextResponse } from 'next/server';
import { getDraft, deleteDraft } from '@/runtime/serverDraftStorage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  try {
    const { id, token } = await params;
    const draft = getDraft(id, token);

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found or expired' }, { status: 404 });
    }

    return NextResponse.json({
      draftId: draft.draftId,
      formId: draft.formId,
      resumeToken: draft.resumeToken,
      values: draft.values,
      savedAt: draft.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  try {
    const { id, token } = await params;
    const deleted = deleteDraft(id, token);

    if (!deleted) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
