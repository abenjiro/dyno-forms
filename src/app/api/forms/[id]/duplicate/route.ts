import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { saveFormSchema } from '@/runtime/serverSchemaStorage';
import { FormSchema } from '@/types/schema';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const source = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!source) {
      return NextResponse.json({ error: `Source form ${id} not found` }, { status: 404 });
    }

    const newId = crypto.randomUUID();
    const newTitle = `${source.title} (Copy)`;
    const newSlug = `${source.slug}-copy-${Math.random().toString(36).substring(2, 6)}`;

    // Deep clone schema
    const clonedSchema: FormSchema = JSON.parse(JSON.stringify(source.schema));
    clonedSchema.id = newId;
    clonedSchema.title = newTitle;

    const duplicated = await prisma.form.create({
      data: {
        id: newId,
        orgId: user?.activeOrg?.id || source.orgId,
        createdById: user?.id || source.createdById,
        groupId: source.groupId,
        title: newTitle,
        slug: newSlug,
        description: source.description,
        status: 'draft',
        currentVersion: 1,
        schema: clonedSchema as any,
        settings: source.settings as any,
        pricingConfig: source.pricingConfig as any,
        expiresAt: source.expiresAt,
        submissionLimit: source.submissionLimit,
        submissionCount: 0,
      },
      include: {
        group: true,
      },
    });

    // Sync to memory cache
    saveFormSchema(clonedSchema);

    return NextResponse.json({
      success: true,
      form: duplicated,
      message: 'Form cloned successfully',
    }, { status: 201 });
  } catch (err: any) {
    console.error('[FormsAPI] Duplicate failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to duplicate form' }, { status: 500 });
  }
}
