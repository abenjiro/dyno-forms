import { NextRequest, NextResponse } from 'next/server';
import { getFormSchema, saveFormSchema, deleteFormSchema } from '@/runtime/serverSchemaStorage';
import { FormSchema } from '@/types/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schema = getFormSchema(id);

    if (!schema) {
      return NextResponse.json({ error: `Form schema not found for ID: ${id}` }, { status: 404 });
    }

    return NextResponse.json({ schema });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

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
    const deleted = deleteFormSchema(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Form schema not found or cannot be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete schema' }, { status: 500 });
  }
}
