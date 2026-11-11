import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getFormSchema, saveFormSchema, deleteFormSchema } from '@/runtime/serverSchemaStorage';
import { FormSchema } from '@/types/schema';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Try PostgreSQL lookup (by UUID or slug)
    const dbForm = isUuid(id)
      ? await prisma.form.findUnique({
          where: { id },
          include: {
            group: true,
            _count: {
              select: {
                submissions: true,
                vouchers: true,
              },
            },
          },
        })
      : await prisma.form.findFirst({
          where: { slug: id },
          include: {
            group: true,
            _count: {
              select: {
                submissions: true,
                vouchers: true,
              },
            },
          },
        });

    if (dbForm) {
      // Sync schema to in-memory cache for fast SSR
      if (dbForm.schema) {
        saveFormSchema(dbForm.schema as unknown as FormSchema);
      }

      return NextResponse.json({
        form: {
          id: dbForm.id,
          orgId: dbForm.orgId,
          groupId: dbForm.groupId,
          group: dbForm.group,
          title: dbForm.title,
          slug: dbForm.slug,
          description: dbForm.description,
          status: dbForm.status,
          currentVersion: dbForm.currentVersion,
          expiresAt: dbForm.expiresAt,
          submissionLimit: dbForm.submissionLimit,
          submissionCount: dbForm.submissionCount || dbForm._count.submissions,
          voucherCount: dbForm._count.vouchers,
          createdAt: dbForm.createdAt,
          updatedAt: dbForm.updatedAt,
          pricingConfig: dbForm.pricingConfig,
        },
        schema: dbForm.schema,
        settings: dbForm.settings,
      });
    }

    // 2. Fallback to serverSchemaStorage
    const schema = getFormSchema(id);
    if (!schema) {
      return NextResponse.json({ error: `Form not found for ID: ${id}` }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        id: schema.id,
        title: schema.title,
        slug: schema.id,
        description: schema.description || null,
        status: 'published',
        currentVersion: 1,
        submissionCount: 0,
      },
      schema,
      settings: schema.settings,
    });
  } catch (err: any) {
    console.error('[FormsAPI] GET [id] failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.groupId !== undefined) updateData.groupId = body.groupId === null || body.groupId === '' ? null : body.groupId;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.submissionLimit !== undefined) updateData.submissionLimit = body.submissionLimit ? parseInt(body.submissionLimit, 10) : null;
    if (body.pricingConfig !== undefined) updateData.pricingConfig = body.pricingConfig;
    if (body.settings !== undefined) updateData.settings = body.settings;

    if (body.schema !== undefined) {
      updateData.schema = body.schema;
      updateData.currentVersion = { increment: 1 };
      saveFormSchema(body.schema);
    }

    // Try updating database
    const existing = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });
    if (existing) {
      const updated = await prisma.form.update({
        where: { id: existing.id },
        data: updateData,
        include: { group: true },
      });
      return NextResponse.json({ success: true, form: updated });
    }

    // If not in database but in schema storage
    if (body.schema) {
      saveFormSchema(body.schema);
      return NextResponse.json({ success: true, schema: body.schema });
    }

    return NextResponse.json({ error: `Form ${id} not found` }, { status: 404 });
  } catch (err: any) {
    console.error('[FormsAPI] PATCH [id] failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to update form' }, { status: 500 });
  }
}

// POST endpoint preserves backward compatibility with Studio auto-save
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const schemaToSave: FormSchema = body.schema || body;

    if (!schemaToSave || !schemaToSave.root) {
      return NextResponse.json({ error: 'Invalid form schema payload' }, { status: 400 });
    }

    schemaToSave.id = id;
    const saved = saveFormSchema(schemaToSave);

    // Sync to database if record exists
    try {
      const existing = isUuid(id)
        ? await prisma.form.findUnique({ where: { id } })
        : await prisma.form.findFirst({ where: { slug: id } });
      if (existing) {
        await prisma.form.update({
          where: { id: existing.id },
          data: {
            title: schemaToSave.title || existing.title,
            schema: schemaToSave as any,
            settings: (schemaToSave.settings || existing.settings) as any,
            currentVersion: { increment: 1 },
          },
        });
      }
    } catch (e) {
      // Continue even if DB sync fails
      console.warn('[FormsAPI] DB sync skipped in POST:', e);
    }

    return NextResponse.json({ success: true, schema: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save schema' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete in database first
    const existing = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });
    if (existing) {
      await prisma.form.update({
        where: { id: existing.id },
        data: { status: 'soft_deleted' },
      });
      deleteFormSchema(id);
      return NextResponse.json({ success: true, message: 'Form archived and soft-deleted' });
    }

    // Fallback to cache deletion
    const deleted = deleteFormSchema(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Form schema not found or cannot be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete schema' }, { status: 500 });
  }
}
