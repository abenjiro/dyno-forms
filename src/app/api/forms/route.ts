import { NextRequest, NextResponse } from 'next/server';
import { saveFormSchema, listFormSchemas } from '@/runtime/serverSchemaStorage';
import { FormSchema } from '@/types/schema';

export async function GET() {
  try {
    const forms = listFormSchemas();
    return NextResponse.json({ forms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list forms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schemaToSave: FormSchema = body.schema || body;

    if (!schemaToSave || !schemaToSave.id || !schemaToSave.root) {
      return NextResponse.json(
        { error: 'Invalid form schema payload: schema must include an id and root container' },
        { status: 400 }
      );
    }

    const saved = saveFormSchema(schemaToSave);
    return NextResponse.json({ success: true, schema: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save form schema' }, { status: 500 });
  }
}
