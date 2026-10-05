import { NextRequest, NextResponse } from 'next/server';
import { saveDraft } from '@/runtime/serverDraftStorage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body || typeof body.values !== 'object') {
      return NextResponse.json({ error: 'Request body must contain a "values" object.' }, { status: 400 });
    }

    const draft = saveDraft(id, body.values, body.resumeToken);

    return NextResponse.json({
      draftId: draft.draftId,
      resumeToken: draft.resumeToken,
      resumeUrl: `/f/${id}?resume=${draft.resumeToken}`,
      savedAt: draft.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
