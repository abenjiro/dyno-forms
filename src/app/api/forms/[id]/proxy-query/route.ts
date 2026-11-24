import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { decryptSecret } from '@/lib/secrets-vault';
import { validateUrlForSsrf } from '@/lib/ssrf';
import { getNestedValue } from '@/runtime/useDynamicApiResolver';
import { getFormSchema } from '@/runtime/serverSchemaStorage';
import { findNodeById } from '@/store/treeMutations';
import { ContainerNode, StaticOption } from '@/types/schema';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

/**
 * GET /api/forms/[id]/proxy-query?fieldId=...&[cascadingParams]
 *
 * Secure server-side proxy for dynamic form fields (select, radio).
 * Resolves external API requests without leaking credentials or secret tokens
 * to client browsers, and enforces SSRF protection.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get('fieldId');

    if (!fieldId || typeof fieldId !== 'string') {
      return NextResponse.json(
        { error: "Target 'fieldId' query parameter is required" },
        { status: 400 }
      );
    }

    // 1. Resolve form record (DB first, fallback to memory/file storage)
    let formRecord: { id: string; schema: any } | null = null;

    if (isUuid(id)) {
      formRecord = await prisma.form.findUnique({
        where: { id },
        select: { id: true, schema: true },
      });
    }

    if (!formRecord) {
      formRecord = await prisma.form.findFirst({
        where: { slug: id },
        select: { id: true, schema: true },
      });
    }

    // Fallback for demo or in-memory forms
    if (!formRecord) {
      const memorySchema = getFormSchema(id);
      if (memorySchema) {
        formRecord = { id: memorySchema.id, schema: memorySchema };
      }
    }

    if (!formRecord) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const schema = formRecord.schema;
    const rootNode = schema?.root as ContainerNode | undefined;

    if (!rootNode) {
      return NextResponse.json({ error: 'Form has an invalid schema structure' }, { status: 400 });
    }

    // 2. Locate target field in AST schema
    const targetNode = findNodeById(rootNode, fieldId);
    if (!targetNode) {
      return NextResponse.json(
        { error: `Field '${fieldId}' not found in form schema` },
        { status: 404 }
      );
    }

    const dataSource = (targetNode as any).dataSource;
    if (dataSource?.type !== 'api' || !dataSource?.api?.url) {
      return NextResponse.json(
        { error: `Field '${fieldId}' is not configured with an API data source` },
        { status: 400 }
      );
    }

    const apiConfig = dataSource.api;

    // 3. Retrieve and decrypt secret credentials from PostgreSQL vault if present
    const authHeaders: Record<string, string> = {};

    if (isUuid(formRecord.id)) {
      const secretRecord = await prisma.apiSecret.findUnique({
        where: {
          formId_fieldId: {
            formId: formRecord.id,
            fieldId,
          },
        },
      });

      if (secretRecord) {
        try {
          const decrypted = decryptSecret(
            secretRecord.encryptedSecret,
            secretRecord.iv,
            secretRecord.authTag
          );

          const headerName = secretRecord.headerName || (secretRecord.authType === 'api_key' ? 'X-API-Key' : 'Authorization');

          if (secretRecord.authType === 'bearer') {
            authHeaders[headerName] = `Bearer ${decrypted}`;
          } else if (secretRecord.authType === 'api_key') {
            authHeaders[headerName] = decrypted;
          } else if (secretRecord.authType === 'basic') {
            const encoded = decrypted.includes(':')
              ? Buffer.from(decrypted).toString('base64')
              : decrypted;
            authHeaders[headerName] = `Basic ${encoded}`;
          }
        } catch (decryptErr) {
          console.error('[ProxyQueryAPI] Failed to decrypt vault secret:', decryptErr);
          return NextResponse.json(
            { error: 'Failed to decrypt credentials from secure vault' },
            { status: 500 }
          );
        }
      }
    }

    // 4. Construct outbound target URL with cascading parameters
    let targetUrlString = apiConfig.url.trim();

    // Convert relative URLs to absolute
    if (targetUrlString.startsWith('/')) {
      const host = request.headers.get('host') || 'localhost:3050';
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      targetUrlString = `${proto}://${host}${targetUrlString}`;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrlString);
    } catch {
      return NextResponse.json({ error: 'Invalid upstream target URL format' }, { status: 400 });
    }

    // Forward cascading dependency parameters if configured
    const dependsOnField = apiConfig.dependsOnField;
    const dependencyParamKey = apiConfig.dependencyParamKey || dependsOnField || 'parent';

    searchParams.forEach((value, key) => {
      if (key === 'fieldId') return;
      if (key === 'parent' && dependencyParamKey) {
        parsedUrl.searchParams.set(dependencyParamKey, value);
      } else {
        parsedUrl.searchParams.set(key, value);
      }
    });

    // 5. Enforce Server-Side Request Forgery (SSRF) validation
    const isLocalAllowed = Boolean(
      process.env.NODE_ENV === 'test' || process.env.ALLOW_DEV_SSRF === 'true'
    );
    const ssrfResult = validateUrlForSsrf(parsedUrl.toString(), { allowLocal: isLocalAllowed });

    if (!ssrfResult.allowed) {
      return NextResponse.json(
        { error: `SSRF validation failed: ${ssrfResult.reason}` },
        { status: 400 }
      );
    }

    // 6. Execute server-side upstream request
    const outboundHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(apiConfig.headers || {}),
      ...authHeaders,
    };

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(parsedUrl.toString(), {
        method: apiConfig.method || 'GET',
        headers: outboundHeaders,
        signal: AbortSignal.timeout(10000), // 10 second timeout protection
      });
    } catch (fetchErr: any) {
      console.error('[ProxyQueryAPI] Outbound fetch failed:', fetchErr);
      return NextResponse.json(
        { error: `Upstream request failed: ${fetchErr.message || 'Network error'}` },
        { status: 502 }
      );
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Upstream service returned HTTP ${upstreamResponse.status}` },
        { status: 502 }
      );
    }

    const rawData = await upstreamResponse.json();

    // 7. Extract data array from upstream response
    let rawArray: any[] = [];
    if (apiConfig.dataArrayPath) {
      const extracted = getNestedValue(rawData, apiConfig.dataArrayPath);
      rawArray = Array.isArray(extracted) ? extracted : [];
    } else if (Array.isArray(rawData)) {
      rawArray = rawData;
    } else if (rawData && typeof rawData === 'object') {
      const arrayProp = Object.values(rawData).find((v) => Array.isArray(v));
      rawArray = (arrayProp as any[]) || [];
    }

    // 8. Normalize into standard { label, value } options
    const normalizedOptions: StaticOption[] = rawArray.map((item, idx) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return { label: String(item), value: item };
      }
      const label = apiConfig.labelPath ? getNestedValue(item, apiConfig.labelPath) : undefined;
      const value = apiConfig.valuePath ? getNestedValue(item, apiConfig.valuePath) : undefined;

      return {
        label: String(label !== undefined ? label : item.name || item.title || item.label || `Option ${idx + 1}`),
        value: value !== undefined ? value : item.id || item.code || item.value || `option_${idx + 1}`,
      };
    });

    return NextResponse.json({
      success: true,
      fieldId,
      count: normalizedOptions.length,
      options: normalizedOptions,
    });
  } catch (err: any) {
    console.error('[ProxyQueryAPI] Handler failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error in API proxy query' },
      { status: 500 }
    );
  }
}
