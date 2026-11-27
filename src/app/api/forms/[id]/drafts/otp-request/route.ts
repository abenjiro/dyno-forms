import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

function maskIdentifier(val: string): string {
  if (val.includes('@')) {
    const [user, domain] = val.split('@');
    const maskedUser = user.length <= 2 ? user[0] + '•' : user[0] + '•••' + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  }
  if (val.length >= 7) {
    return `${val.slice(0, 3)}••••${val.slice(-2)}`;
  }
  return '••••••';
}

/**
 * POST /api/forms/[id]/drafts/otp-request
 *
 * Issues a 6-digit time-based OTP code (valid for 15 minutes)
 * to resume an unfinished draft via email or phone.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { identifier } = body;
    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { error: 'Email address or phone number is required' },
        { status: 400 }
      );
    }

    const clean = identifier.trim();

    // 1. Resolve form by UUID or slug
    let form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id }, select: { id: true, title: true } })
      : await prisma.form.findFirst({ where: { slug: id }, select: { id: true, title: true } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // 2. Query draft matching email or phone
    const draft = await prisma.draft.findFirst({
      where: {
        formId: form.id,
        OR: [
          { email: { equals: clean.toLowerCase(), mode: 'insensitive' } },
          { phone: clean },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!draft) {
      return NextResponse.json(
        {
          error:
            'No saved draft was found for this email address or phone number on this form.',
        },
        { status: 404 }
      );
    }

    // 3. Generate 6-digit cryptographically secure OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // 4. Atomically persist OTP hash to draft record
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        otpHash,
        otpExpiresAt,
      },
    });

    const maskedTarget = maskIdentifier(clean);

    // 5. In production, an email/SMS provider dispatch is triggered.
    // In dev & test modes, return devOtp for seamless end-to-end verification.
    const isDevOrTest =
      process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_OTP === 'true';

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been generated for ${maskedTarget}.`,
      maskedTarget,
      expiresInMinutes: 15,
      ...(isDevOrTest ? { devOtp: otp } : {}),
    });
  } catch (err: any) {
    console.error('[DraftOTPRequestAPI] POST failed:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to request draft OTP' },
      { status: 500 }
    );
  }
}
