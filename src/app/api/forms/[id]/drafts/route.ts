import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';
import { saveDraft as saveMemoryDraft } from '@/runtime/serverDraftStorage';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

/**
 * POST /api/forms/[id]/drafts
 *
 * Saves or updates a form response draft in PostgreSQL and in-memory cache.
 * Supports tokenized resume URLs and associates email/phone for OTP recovery.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body || typeof body.values !== 'object') {
      return NextResponse.json(
        { error: 'Request body must contain a "values" object.' },
        { status: 400 }
      );
    }

    const {
      values,
      schema,
      progress = 0,
      existingToken,
      resumeToken: providedToken,
    } = body;

    const resumeToken =
      providedToken ||
      existingToken ||
      `dft_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

    // Auto-detect email & phone from explicit body or form values
    let email: string | undefined = body.email;
    let phone: string | undefined = body.phone;

    if (!email && values) {
      const emailKey = Object.keys(values).find((k) =>
        /email/i.test(k) && typeof values[k] === 'string' && values[k].includes('@')
      );
      if (emailKey) {
        email = String(values[emailKey]).trim().toLowerCase();
      }
    }

    if (!phone && values) {
      const phoneKey = Object.keys(values).find((k) =>
        /phone|mobile|tel/i.test(k) && typeof values[k] === 'string' && values[k].trim().length >= 6
      );
      if (phoneKey) {
        phone = String(values[phoneKey]).trim();
      }
    }

    // 1. Resolve form in PostgreSQL if available
    let dbForm: { id: string } | null = null;
    if (isUuid(id)) {
      dbForm = await prisma.form.findUnique({
        where: { id },
        select: { id: true },
      });
    }

    if (!dbForm) {
      dbForm = await prisma.form.findFirst({
        where: { slug: id },
        select: { id: true },
      });
    }

    let savedDraftId: string = crypto.randomUUID();
    let savedUpdatedAt: string = new Date().toISOString();

    // 2. Persist to PostgreSQL if form exists in DB
    if (dbForm) {
      const existingDbDraft = await prisma.draft.findUnique({
        where: { resumeToken },
      });

      if (existingDbDraft) {
        const updated = await prisma.draft.update({
          where: { id: existingDbDraft.id },
          data: {
            values,
            schema: schema || existingDbDraft.schema || undefined,
            progress: Number(progress) || 0,
            email: email || existingDbDraft.email,
            phone: phone || existingDbDraft.phone,
            updatedAt: new Date(),
          },
        });
        savedDraftId = updated.id;
        savedUpdatedAt = updated.updatedAt.toISOString();
      } else {
        const created = await prisma.draft.create({
          data: {
            id: savedDraftId,
            formId: dbForm.id,
            resumeToken,
            values,
            schema: schema || undefined,
            progress: Number(progress) || 0,
            email: email || null,
            phone: phone || null,
          },
        });
        savedDraftId = created.id;
        savedUpdatedAt = created.updatedAt.toISOString();
      }
    }

    // 3. Persist to in-memory/file storage cache as fallback
    const memDraft = saveMemoryDraft(id, values, resumeToken, schema);
    if (!dbForm) {
      savedDraftId = memDraft.draftId;
      savedUpdatedAt = memDraft.updatedAt;
    }

    return NextResponse.json({
      success: true,
      draftId: savedDraftId,
      resumeToken,
      resumeUrl: `/f/${id}?resume=${resumeToken}`,
      savedAt: savedUpdatedAt,
      email: email || null,
      phone: phone || null,
      progress: Number(progress) || 0,
    });
  } catch (err: any) {
    console.error('[DraftsAPI] POST draft failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while saving draft' },
      { status: 500 }
    );
  }
}
