import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';

    // 1. Locate Form & verify tenant access
    const form = isUuid(id)
      ? await prisma.form.findUnique({
          where: { id },
          include: { group: true },
        })
      : await prisma.form.findFirst({
          where: { slug: id },
          include: { group: true },
        });

    if (!form) {
      return NextResponse.json({ error: `Form ${id} not found` }, { status: 404 });
    }

    // Verify user belongs to the form's organization
    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized access to this form' }, { status: 403 });
    }

    // 2. Build where filter
    const where: any = {
      formId: form.id,
    };

    if (status && status !== 'all') {
      where.paymentStatus = status;
    }

    // 3. Query submissions with pagination
    const skip = (page - 1) * limit;

    let submissions = await prisma.submission.findMany({
      where,
      orderBy: { submittedAt: sort },
      skip,
      take: limit,
      include: {
        submitter: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        voucher: {
          select: {
            id: true,
            codeMasked: true,
            batchName: true,
            discountType: true,
          },
        },
      },
    });

    let total = await prisma.submission.count({ where });

    // 4. In-memory fuzzy filter if search string provided
    if (search) {
      const lowerSearch = search.toLowerCase();
      submissions = submissions.filter((sub) => {
        if (sub.id.toLowerCase().includes(lowerSearch)) return true;
        if (sub.voucherCode && sub.voucherCode.toLowerCase().includes(lowerSearch)) return true;
        if (sub.submitter?.email?.toLowerCase().includes(lowerSearch)) return true;
        if (sub.submitter?.fullName?.toLowerCase().includes(lowerSearch)) return true;

        // Search in JSON payload values
        const dataValues = JSON.stringify(sub.data).toLowerCase();
        return dataValues.includes(lowerSearch);
      });
    }

    return NextResponse.json({
      submissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      form: {
        id: form.id,
        title: form.title,
        slug: form.slug,
        status: form.status,
        currentVersion: form.currentVersion,
        submissionCount: form.submissionCount,
        submissionLimit: form.submissionLimit,
        expiresAt: form.expiresAt,
        group: form.group,
        schema: form.schema,
      },
    });
  } catch (err: any) {
    console.error('[SubmissionsAPI] GET failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch submissions' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId query parameter' }, { status: 400 });
    }

    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Delete submission and decrement count safely
    await prisma.$transaction(async (tx) => {
      await tx.submission.delete({
        where: { id: submissionId },
      });

      await tx.form.update({
        where: { id: form.id },
        data: {
          submissionCount: {
            decrement: 1,
          },
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Submission deleted successfully' });
  } catch (err: any) {
    console.error('[SubmissionsAPI] DELETE failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete submission' }, { status: 500 });
  }
}
