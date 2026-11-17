import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { encryptSecret, maskSecret } from '@/lib/secrets-vault';
import { ApiAuthType } from '@prisma/client';

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

    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const secrets = await prisma.apiSecret.findMany({
      where: { formId: form.id },
      select: {
        id: true,
        fieldId: true,
        authType: true,
        headerName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      formId: form.id,
      secrets: secrets.map((s) => ({
        ...s,
        hasSecret: true,
        maskedSecret: '••••••••••••',
      })),
    });
  } catch (err: any) {
    console.error('[SecretsAPI] GET failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch secrets' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      fieldId,
      authType = 'bearer',
      headerName = 'Authorization',
      secret,
    } = body;

    if (!fieldId || typeof fieldId !== 'string') {
      return NextResponse.json({ error: 'Target fieldId is required' }, { status: 400 });
    }

    if (!secret || typeof secret !== 'string') {
      return NextResponse.json({ error: 'Secret value is required' }, { status: 400 });
    }

    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Encrypt secret using AES-256-GCM
    const { encryptedSecret, iv, authTag } = encryptSecret(secret.trim());

    const chosenAuthType: ApiAuthType = (
      ['bearer', 'api_key', 'basic'].includes(authType) ? authType : 'bearer'
    ) as ApiAuthType;

    // 2. Upsert in PostgreSQL api_secrets table
    const saved = await prisma.apiSecret.upsert({
      where: {
        formId_fieldId: {
          formId: form.id,
          fieldId: fieldId.trim(),
        },
      },
      update: {
        authType: chosenAuthType,
        headerName: headerName.trim() || 'Authorization',
        encryptedSecret,
        iv,
        authTag,
      },
      create: {
        id: crypto.randomUUID(),
        formId: form.id,
        fieldId: fieldId.trim(),
        authType: chosenAuthType,
        headerName: headerName.trim() || 'Authorization',
        encryptedSecret,
        iv,
        authTag,
      },
    });

    return NextResponse.json({
      success: true,
      fieldId: saved.fieldId,
      authType: saved.authType,
      headerName: saved.headerName,
      maskedSecret: maskSecret(secret),
      message: 'Secret key successfully encrypted with AES-256-GCM and stored in vault!',
    });
  } catch (err: any) {
    console.error('[SecretsAPI] POST failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to save secret' }, { status: 500 });
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
    const body = await request.json();
    const { fieldId } = body;

    if (!fieldId) {
      return NextResponse.json({ error: 'Target fieldId is required' }, { status: 400 });
    }

    const form = isUuid(id)
      ? await prisma.form.findUnique({ where: { id } })
      : await prisma.form.findFirst({ where: { slug: id } });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const hasOrgAccess = user.organizations.some((o) => o.id === form.orgId);
    if (!hasOrgAccess && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.apiSecret.deleteMany({
      where: {
        formId: form.id,
        fieldId,
      },
    });

    return NextResponse.json({ success: true, message: 'Secret removed from vault' });
  } catch (err: any) {
    console.error('[SecretsAPI] DELETE failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete secret' }, { status: 500 });
  }
}
