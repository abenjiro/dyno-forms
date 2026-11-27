import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

/**
 * POST /api/forms/[id]/drafts/otp-verify
 *
 * Verifies a 6-digit OTP code against the hashed token in PostgreSQL.
 * On success, consumes the OTP and restores the draft values and schema snapshot.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { identifier, otp } = body;

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { error: 'Email address or phone number is required' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json(
        { error: 'A valid 6-digit verification code is required' },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();
    const cleanOtp = otp.trim();

    // 1. Resolve form
    let form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id }, select: { id: true, title: true } })
      : await prisma.form.findFirst({ where: { slug: id }, select: { id: true, title: true } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // 2. Query draft record
    const draft = await prisma.draft.findFirst({
      where: {
        formId: form.id,
        OR: [
          { email: { equals: cleanIdentifier.toLowerCase(), mode: 'insensitive' } },
          { phone: cleanIdentifier },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!draft) {
      return NextResponse.json(
        { error: 'No draft found for this email address or phone number' },
        { status: 404 }
      );
    }

    if (!draft.otpHash || !draft.otpExpiresAt) {
      return NextResponse.json(
        {
          error:
            'No active verification code was requested for this draft. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // 3. Check expiration
    if (new Date() > new Date(draft.otpExpiresAt)) {
      return NextResponse.json(
        {
          error:
            'Verification code has expired (15-minute limit). Please request a new code.',
        },
        { status: 400 }
      );
    }

    // 4. Constant-time hash comparison
    const candidateHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    const expectedBuffer = Buffer.from(draft.otpHash, 'hex');
    const candidateBuffer = Buffer.from(candidateHash, 'hex');

    if (
      expectedBuffer.length !== candidateBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, candidateBuffer)
    ) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please check and try again.' },
        { status: 400 }
      );
    }

    // 5. Invalidate OTP upon successful redemption (single-use protection)
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      draftId: draft.id,
      resumeToken: draft.resumeToken,
      resumeUrl: `/f/${id}?resume=${draft.resumeToken}`,
      values: draft.values || {},
      schema: draft.schema,
      progress: draft.progress,
      savedAt: draft.updatedAt.toISOString(),
      message: 'Draft successfully verified and restored!',
    });
  } catch (err: any) {
    console.error('[DraftOTPVerifyAPI] POST failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to verify draft OTP' },
      { status: 500 }
    );
  }
}
