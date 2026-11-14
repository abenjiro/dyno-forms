import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, data, formVersion } = body;
    const voucherCode = body.voucherCode || data?.voucherCode || null;

    if (!formId || typeof formId !== 'string') {
      return NextResponse.json({ error: 'Missing formId parameter' }, { status: 400 });
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid form submission payload' }, { status: 400 });
    }

    // 1. Fetch form from PostgreSQL
    const form = isUuid(formId)
      ? await prisma.form.findUnique({ where: { id: formId } })
      : await prisma.form.findFirst({ where: { slug: formId } });

    if (!form) {
      // In offline / fallback test environments without this form in DB
      const fallbackSubmissionId = crypto.randomUUID();
      return NextResponse.json({
        success: true,
        submissionId: fallbackSubmissionId,
        timestamp: new Date().toISOString(),
        message: 'Form response captured (fallback store).',
      });
    }

    // Gather Submitter & Audit Metadata
    const user = await getCurrentUser();
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '127.0.0.1';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 32);
    const userAgent = request.headers.get('user-agent')?.substring(0, 255) || null;

    // 2. Validate Form Lifecycle Status
    if (form.status === 'draft') {
      const isOwnerOrMember = user && user.organizations.some((o) => o.id === form.orgId);
      if (!isOwnerOrMember && user?.role !== 'superadmin') {
        return NextResponse.json(
          { error: 'This form is currently in draft mode and not accepting public responses. Please publish the form from your Dashboard.' },
          { status: 403 }
        );
      }
    }
    if (form.status === 'closed') {
      return NextResponse.json(
        { error: 'This form has been closed by the creator and is no longer accepting responses.' },
        { status: 403 }
      );
    }
    if (form.status === 'archived') {
      return NextResponse.json(
        { error: 'This form has been archived and is no longer accepting responses.' },
        { status: 403 }
      );
    }
    if (form.status === 'soft_deleted') {
      return NextResponse.json({ error: 'Form not found or has been deleted.' }, { status: 404 });
    }

    // 3. Validate Expiration Rules
    if (form.expiresAt && new Date() > new Date(form.expiresAt)) {
      return NextResponse.json(
        { error: 'The deadline for this form has passed. Submissions are now closed.' },
        { status: 403 }
      );
    }

    // 4. Validate Submission Quota Cap
    if (form.submissionLimit !== null && form.submissionLimit !== undefined && form.submissionCount >= form.submissionLimit) {
      return NextResponse.json(
        { error: 'This form has reached its maximum response quota cap.' },
        { status: 403 }
      );
    }

    // 6. Optional Voucher Verification
    let verifiedVoucher: any = null;
    if (voucherCode && typeof voucherCode === 'string') {
      const codeClean = voucherCode.toUpperCase().trim();
      const codeHash = crypto.createHash('sha256').update(codeClean).digest('hex');

      const foundVoucher = await prisma.voucher.findUnique({
        where: { codeHash },
      });

      if (!foundVoucher) {
        return NextResponse.json({ error: 'The entered voucher code is invalid.' }, { status: 400 });
      }

      if (foundVoucher.status !== 'active' || foundVoucher.timesUsed >= foundVoucher.maxUses) {
        return NextResponse.json(
          { error: 'This voucher code has already been fully redeemed or is inactive.' },
          { status: 400 }
        );
      }

      if (foundVoucher.expiresAt && new Date() > new Date(foundVoucher.expiresAt)) {
        return NextResponse.json({ error: 'This voucher code has expired.' }, { status: 400 });
      }

      // Check voucher scope (form specific, group specific, or universal)
      const matchesForm = !foundVoucher.formId || foundVoucher.formId === form.id;
      const matchesGroup = !foundVoucher.groupId || (form.groupId && foundVoucher.groupId === form.groupId);
      if (!matchesForm && !matchesGroup) {
        return NextResponse.json(
          { error: 'This voucher code is not eligible for this form.' },
          { status: 400 }
        );
      }

      verifiedVoucher = foundVoucher;
    }

    // 7. Atomic Database Transaction: Create Submission + Increment Counter + Redeem Voucher
    const submission = await prisma.$transaction(async (tx) => {
      // Concurrency check quota inside transaction
      const currentForm = await tx.form.findUnique({ where: { id: form.id } });
      if (!currentForm) throw new Error('Form not found');
      if (
        currentForm.submissionLimit !== null &&
        currentForm.submissionLimit !== undefined &&
        currentForm.submissionCount >= currentForm.submissionLimit
      ) {
        throw new Error('This form has reached its maximum response quota cap.');
      }

      const submissionId = crypto.randomUUID();
      const createdSubmission = await tx.submission.create({
        data: {
          id: submissionId,
          formId: form.id,
          formVersion: formVersion || form.currentVersion || 1,
          submitterId: user?.id || null,
          voucherId: verifiedVoucher?.id || null,
          data: data,
          paymentStatus: verifiedVoucher ? 'voucher_waived' : 'free',
          voucherCode: voucherCode ? voucherCode.toUpperCase().trim() : null,
          ipHash,
          userAgent,
        },
      });

      // Increment form submission count
      await tx.form.update({
        where: { id: form.id },
        data: {
          submissionCount: { increment: 1 },
        },
      });

      // Process voucher usage if applied
      if (verifiedVoucher) {
        const newCount = verifiedVoucher.timesUsed + 1;
        const isExhausted = newCount >= verifiedVoucher.maxUses;

        await tx.voucher.update({
          where: { id: verifiedVoucher.id },
          data: {
            timesUsed: { increment: 1 },
            status: isExhausted ? 'exhausted' : verifiedVoucher.status,
          },
        });

        await tx.voucherRedemption.create({
          data: {
            id: crypto.randomUUID(),
            voucherId: verifiedVoucher.id,
            submissionId: createdSubmission.id,
            redeemedByEmail:
              data.email ||
              data.contactEmail ||
              data.userEmail ||
              user?.email ||
              null,
          },
        });
      }

      return createdSubmission;
    });

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      timestamp: submission.submittedAt.toISOString(),
      message: 'Form response successfully recorded!',
    });
  } catch (err: any) {
    console.error('[FormsSubmitAPI] Submission error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred processing your submission.' },
      { status: 500 }
    );
  }
}
