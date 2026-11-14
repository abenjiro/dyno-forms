import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { FormNode, ContainerNode, FormSchema } from '@/types/schema';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

interface ExtractedField {
  id: string;
  name: string;
  label: string;
}

function extractFieldsFromAst(schema: FormSchema): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();

  function walk(node: FormNode) {
    if (!node) return;

    if (node.isContainer && Array.isArray((node as ContainerNode).children)) {
      for (const child of (node as ContainerNode).children) {
        walk(child);
      }
    } else {
      // Leaf form control
      const fieldKey = node.name || node.id;
      if (!seen.has(fieldKey)) {
        seen.add(fieldKey);
        fields.push({
          id: node.id,
          name: fieldKey,
          label: (node as any).label || (node as any).fieldProps?.label || fieldKey,
        });
      }
    }
  }

  if (schema?.root) {
    walk(schema.root);
  }

  return fields;
}

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }
  const stringVal = String(value);
  const escaped = stringVal.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Fetch form
    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Verify tenant authorization
    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Fetch all submissions
    const submissions = await prisma.submission.findMany({
      where: { formId: form.id },
      orderBy: { submittedAt: 'desc' },
      include: {
        submitter: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    // 3. Extract AST field columns
    const schema = form.schema as unknown as FormSchema;
    const astFields = extractFieldsFromAst(schema);

    // If no schema fields found, extract union of all keys in submissions
    const extraKeys = new Set<string>();
    for (const sub of submissions) {
      if (sub.data && typeof sub.data === 'object') {
        for (const k of Object.keys(sub.data as Record<string, any>)) {
          if (!astFields.some((f) => f.name === k || f.id === k)) {
            extraKeys.add(k);
          }
        }
      }
    }

    for (const key of extraKeys) {
      astFields.push({ id: key, name: key, label: key });
    }

    // 4. Construct CSV Header
    const headers = [
      'Submission ID',
      'Submitted At (UTC)',
      'Payment Status',
      'Voucher Code',
      'Submitter Email',
      'Submitter Name',
      ...astFields.map((f) => f.label),
      'IP Hash',
    ];

    const csvRows: string[] = [headers.map(escapeCsvCell).join(',')];

    // 5. Construct CSV Data Rows
    for (const sub of submissions) {
      const data = (sub.data || {}) as Record<string, any>;

      const fieldValues = astFields.map((field) => {
        const val = data[field.name] !== undefined ? data[field.name] : data[field.id];
        return escapeCsvCell(val);
      });

      const row = [
        escapeCsvCell(sub.id),
        escapeCsvCell(sub.submittedAt.toISOString()),
        escapeCsvCell(sub.paymentStatus),
        escapeCsvCell(sub.voucherCode || ''),
        escapeCsvCell(sub.submitter?.email || ''),
        escapeCsvCell(sub.submitter?.fullName || ''),
        ...fieldValues,
        escapeCsvCell(sub.ipHash || ''),
      ];

      csvRows.push(row.join(','));
    }

    const csvOutput = csvRows.join('\r\n');
    const filename = `${form.slug || 'form'}-submissions-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('[SubmissionsExportAPI] Export failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to export submissions' }, { status: 500 });
  }
}
