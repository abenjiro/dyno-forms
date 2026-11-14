import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { saveFormSchema, listFormSchemas } from '@/runtime/serverSchemaStorage';
import { FormSchema, FormSettings } from '@/types/schema';
import { sampleFormSchema } from '@/data/initialSchema';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (user?.activeOrg?.id) {
      // Authenticated with active organization: query PostgreSQL via Prisma
      const whereClause: any = {
        orgId: user.activeOrg.id,
      };

      if (status && status !== 'all') {
        whereClause.status = status;
      } else {
        whereClause.status = { not: 'soft_deleted' };
      }

      if (groupId) {
        whereClause.groupId = groupId === 'null' ? null : groupId;
      }

      if (search && search.trim()) {
        const query = search.trim();
        whereClause.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      const dbForms = await prisma.form.findMany({
        where: whereClause,
        include: {
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              submissions: true,
              vouchers: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({
        forms: dbForms.map((f) => ({
          id: f.id,
          orgId: f.orgId,
          groupId: f.groupId,
          group: f.group,
          title: f.title,
          slug: f.slug,
          description: f.description,
          status: f.status,
          currentVersion: f.currentVersion,
          expiresAt: f.expiresAt,
          submissionLimit: f.submissionLimit,
          submissionCount: f.submissionCount || f._count.submissions,
          voucherCount: f._count.vouchers,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          schema: f.schema,
          settings: f.settings,
          pricingConfig: f.pricingConfig,
        })),
        total: dbForms.length,
      });
    }

    // Fallback for unauthenticated or local development without session
    const cachedForms = listFormSchemas();
    return NextResponse.json({
      forms: cachedForms.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.id,
        description: s.description || null,
        status: 'published',
        currentVersion: 1,
        submissionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schema: s,
        settings: s.settings,
      })),
      total: cachedForms.length,
    });
  } catch (err: any) {
    console.error('[FormsAPI] Failed to retrieve forms:', err);
    return NextResponse.json({ error: err.message || 'Failed to list forms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // Check if body is a direct schema payload or form creation payload
    const title = body.title || body.schema?.title || 'Untitled Form';
    const slugBase = (body.slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase || 'form'}-${Math.random().toString(36).substring(2, 6)}`;
    const isValidUuid = (val?: string) =>
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
    const id = isValidUuid(body.id) ? body.id : crypto.randomUUID();
    const description = body.description || body.schema?.description || null;
    const groupId = body.groupId || null;

    // Build or extract AST schema
    let formSchema: FormSchema = body.schema;
    if (!formSchema || !formSchema.root) {
      if (body.template === 'vendor') {
        formSchema = {
          ...sampleFormSchema,
          id,
          title,
          description: description || sampleFormSchema.description,
        };
      } else {
        // Blank canvas default
        formSchema = {
          id,
          version: '1.0.0',
          title,
          description: description || undefined,
          root: {
            id: 'root-canvas',
            type: 'canvas',
            name: 'canvas',
            isContainer: true,
            children: [],
          },
          settings: {
            submitUrl: '/api/forms/submit',
            submitMethod: 'POST',
            submitLabel: 'Submit Form',
            showReset: true,
            theme: { primaryColor: '#2563eb', borderRadius: 'md', density: 'comfortable' },
            layoutMode: 'single-page',
          },
        };
      }
    } else {
      formSchema.id = id;
      formSchema.title = title;
    }

    const formSettings: FormSettings = {
      submitUrl: '/api/forms/submit',
      submitMethod: 'POST',
      submitLabel: 'Submit Form',
      theme: { primaryColor: '#2563eb', borderRadius: 'md', density: 'comfortable' },
      layoutMode: 'single-page',
      ...(formSchema.settings || {}),
      ...(body.settings || {}),
    };

    if (user?.activeOrg?.id) {
      // Save directly to database
      const created = await prisma.form.create({
        data: {
          id,
          orgId: user.activeOrg.id,
          createdById: user.id,
          groupId: groupId || undefined,
          title,
          slug,
          description,
          status: body.status || 'published',
          currentVersion: 1,
          schema: formSchema as any,
          settings: formSettings as any,
          pricingConfig: body.pricingConfig || undefined,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          submissionLimit: body.submissionLimit ? parseInt(body.submissionLimit, 10) : undefined,
        },
        include: {
          group: true,
        },
      });

      // Also persist to serverSchemaStorage for fast SSR lookups
      saveFormSchema(formSchema);

      return NextResponse.json({ success: true, form: created, schema: formSchema }, { status: 201 });
    }

    // Unauthenticated fallback: save to serverSchemaStorage
    const saved = saveFormSchema(formSchema);
    return NextResponse.json({
      success: true,
      form: {
        id,
        title,
        slug,
        description,
        status: 'draft',
        schema: saved,
      },
      schema: saved,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[FormsAPI] Failed to create form:', err);
    return NextResponse.json({ error: err.message || 'Failed to create form' }, { status: 500 });
  }
}
