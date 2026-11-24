/**
 * Milestone 7: Encrypted Secrets Vault & Server-Side API Proxy Integration Tests
 * Run with: npx tsx src/tests/secrets-proxy.test.ts
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import http from 'node:http';
import prisma from '../lib/db';
import { encryptSecret, decryptSecret, maskSecret } from '../lib/secrets-vault';
import { validateUrlForSsrf } from '../lib/ssrf';
import { GET as proxyQueryHandler } from '../app/api/forms/[id]/proxy-query/route';
import { NextRequest } from 'next/server';

console.log('--- RUNNING DYNO FORMS SECRETS VAULT & API PROXY TESTS ---');

async function runSecretsProxyTests() {
  // 1. AES-256-GCM Encryption & Decryption
  console.log('1. Testing AES-256-GCM Encryption, Decryption & Masking...');
  const testSecret = 'sk_live_secure_production_secret_key_99882211';
  const encryptedPayload = encryptSecret(testSecret);

  assert(encryptedPayload.encryptedSecret, 'Ciphertext should be present');
  assert.strictEqual(encryptedPayload.iv.length, 24, 'IV should be 12 bytes (24 hex characters)');
  assert.strictEqual(encryptedPayload.authTag.length, 32, 'Auth tag should be 16 bytes (32 hex characters)');

  // Decryption verification
  const decrypted = decryptSecret(
    encryptedPayload.encryptedSecret,
    encryptedPayload.iv,
    encryptedPayload.authTag
  );
  assert.strictEqual(decrypted, testSecret, 'Decrypted text must match original secret');

  // Tamper detection: altered auth tag must throw
  let tamperCaught = false;
  try {
    const tamperedTag = encryptedPayload.authTag.slice(0, -2) + 'aa';
    decryptSecret(encryptedPayload.encryptedSecret, encryptedPayload.iv, tamperedTag);
  } catch {
    tamperCaught = true;
  }
  assert.strictEqual(tamperCaught, true, 'Decryption must fail if auth tag is tampered');

  // Secret masking
  assert.strictEqual(maskSecret(testSecret), 'sk_l••••2211');
  assert.strictEqual(maskSecret('short'), '••••••••');
  console.log('  ✓ AES-256-GCM authenticated encryption and tamper resistance verified');

  // 2. SSRF Protection Validator
  console.log('2. Testing Server-Side Request Forgery (SSRF) Protection...');
  
  // Block loopback & localhost
  const local1 = validateUrlForSsrf('http://localhost:3000/admin');
  assert.strictEqual(local1.allowed, false, 'localhost must be blocked');
  
  const local2 = validateUrlForSsrf('http://127.0.0.1:8080/metrics');
  assert.strictEqual(local2.allowed, false, '127.0.0.1 must be blocked');

  // Block private RFC1918 addresses
  const priv10 = validateUrlForSsrf('http://10.0.0.5/internal');
  assert.strictEqual(priv10.allowed, false, '10.0.0.0/8 must be blocked');

  const priv192 = validateUrlForSsrf('http://192.168.1.1/router');
  assert.strictEqual(priv192.allowed, false, '192.168.0.0/16 must be blocked');

  // Block cloud metadata services (AWS/GCP/Azure)
  const meta = validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
  assert.strictEqual(meta.allowed, false, 'Cloud metadata service IP must be blocked');

  // Block non-HTTP protocols
  const fileProto = validateUrlForSsrf('file:///etc/passwd');
  assert.strictEqual(fileProto.allowed, false, 'file:// protocol must be blocked');

  // Block embedded credentials
  const embedCreds = validateUrlForSsrf('https://admin:password@api.example.com/data');
  assert.strictEqual(embedCreds.allowed, false, 'Embedded user:pass in URL must be blocked');

  // Allow legitimate public HTTPS endpoints
  const validPublic = validateUrlForSsrf('https://api.github.com/users/octocat');
  assert.strictEqual(validPublic.allowed, true, 'Valid public HTTPS endpoint must be allowed');

  // Allow internal relative endpoints
  const validRelative = validateUrlForSsrf('/api/mock/countries');
  assert.strictEqual(validRelative.allowed, true, 'Relative internal endpoints must be allowed');

  console.log('  ✓ SSRF validator successfully blocks loopbacks, private CIDRs, metadata IPs & credentials');

  // 3. Setup Mock Upstream Service with Bearer Authentication
  console.log('3. Setting up Mock Upstream Third-Party Service...');
  const mockPort = 9876;
  let receivedAuthHeader: string | null = null;
  let receivedQueryParam: string | null = null;

  const mockServer = http.createServer((req, res) => {
    receivedAuthHeader = req.headers['authorization'] || null;
    const urlObj = new URL(req.url || '/', `http://localhost:${mockPort}`);
    receivedQueryParam = urlObj.searchParams.get('country');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'success',
        results: [
          { code: 'ENG', department_name: 'Engineering & Technology' },
          { code: 'MED', department_name: 'School of Medicine' },
          { code: 'BUS', department_name: 'Business Administration' },
        ],
      })
    );
  });

  await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve));
  console.log(`  ✓ Mock upstream service listening on port ${mockPort}`);

  let testOrg: any = null;
  let testForm: any = null;

  try {
    // 4. Create Database Test Form and Encrypted Secret Record
    console.log('4. Creating Test Form and Vaulted API Secret in PostgreSQL...');
    testOrg = await prisma.organization.create({
      data: {
        name: 'Secrets Proxy Test Org',
        slug: `proxy-test-org-${Date.now()}`,
        owner: {
          create: {
            email: `vault-owner-${Date.now()}@dynoforms.test`,
            passwordHash: 'dummyhash123',
            fullName: 'Vault Admin',
          },
        },
      },
      include: { owner: true },
    });

    const targetFieldId = 'field_dept_lookup';
    const privateSecret = 'secret_bearer_token_xyz_9988';
    const encryptedSecret = encryptSecret(privateSecret);

    testForm = await prisma.form.create({
      data: {
        orgId: testOrg.id,
        createdById: testOrg.owner.id,
        title: 'Proxy Query Verification Form',
        slug: `proxy-form-${Date.now()}`,
        status: 'published',
        schema: {
          id: 'proxy-form-schema',
          title: 'Proxy Query Verification Form',
          root: {
            id: 'canvas_root',
            type: 'canvas',
            name: 'canvas',
            isContainer: true,
            children: [
              {
                id: targetFieldId,
                type: 'select',
                name: 'department',
                label: 'Department',
                isContainer: false,
                dataSource: {
                  type: 'api',
                  api: {
                    url: `http://localhost:${mockPort}/api/departments`,
                    dataArrayPath: 'results',
                    labelPath: 'department_name',
                    valuePath: 'code',
                    useProxy: true,
                    dependsOnField: 'country_selection',
                    dependencyParamKey: 'country',
                  },
                },
              },
            ],
          },
        },
        settings: {
          submitUrl: '/api/submit',
          theme: 'light',
        },
      },
    });

    // Save encrypted secret into PostgreSQL api_secrets table
    await prisma.apiSecret.create({
      data: {
        formId: testForm.id,
        fieldId: targetFieldId,
        authType: 'bearer',
        headerName: 'Authorization',
        encryptedSecret: encryptedSecret.encryptedSecret,
        iv: encryptedSecret.iv,
        authTag: encryptedSecret.authTag,
      },
    });

    console.log('  ✓ Test form and encrypted secret successfully written to database');

    // 5. Test Server-Side Proxy Execution via /api/forms/[id]/proxy-query
    console.log('5. Testing /api/forms/[id]/proxy-query execution...');
    
    // Enable local testing for SSRF validator
    process.env.ALLOW_DEV_SSRF = 'true';

    const proxyRequest = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/proxy-query?fieldId=${targetFieldId}&parent=GH`
    );

    const proxyResponse = await proxyQueryHandler(proxyRequest, {
      params: Promise.resolve({ id: testForm.id }),
    });

    assert.strictEqual(proxyResponse.status, 200, 'Proxy query must return HTTP 200');
    const proxyData = await proxyResponse.json();

    assert.strictEqual(proxyData.success, true, 'Response must indicate success');
    assert.strictEqual(proxyData.fieldId, targetFieldId);
    assert.strictEqual(proxyData.count, 3, 'Should extract 3 options from results array');
    assert.deepStrictEqual(proxyData.options, [
      { label: 'Engineering & Technology', value: 'ENG' },
      { label: 'School of Medicine', value: 'MED' },
      { label: 'Business Administration', value: 'BUS' },
    ]);

    // Verify upstream mock server received the decrypted secret header
    assert.strictEqual(
      receivedAuthHeader,
      `Bearer ${privateSecret}`,
      'Upstream mock server must receive decrypted Bearer authorization header'
    );

    // Verify cascading parent dependency parameter was forwarded
    assert.strictEqual(
      receivedQueryParam,
      'GH',
      'Cascading parameter "country=GH" must be forwarded to upstream query'
    );

    // Verify secret is NOT leaked in the proxy response payload
    const responseString = JSON.stringify(proxyData);
    assert.strictEqual(
      responseString.includes(privateSecret),
      false,
      'Private secret MUST NEVER leak into the client proxy response'
    );

    console.log('  ✓ Server-side proxy decrypted credentials and queried upstream securely');
    console.log('  ✓ Dot-path data normalization verified: [{ label, value }]');
    console.log('  ✓ Cascading dependency parameter properly mapped and forwarded');
    console.log('  ✓ Client response sanitization verified (zero token leakage)');

    // 6. Test Error Handling & SSRF runtime rejection
    console.log('6. Testing Proxy Validation Error Cases...');
    
    // Disable dev SSRF to verify runtime blocking
    delete process.env.ALLOW_DEV_SSRF;

    const ssrfBlockReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/proxy-query?fieldId=${targetFieldId}`
    );
    const ssrfBlockRes = await proxyQueryHandler(ssrfBlockReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(ssrfBlockRes.status, 400, 'Must block localhost upstream query when SSRF is active');

    // Missing fieldId
    const missingFieldReq = new NextRequest(`http://localhost:3050/api/forms/${testForm.id}/proxy-query`);
    const missingFieldRes = await proxyQueryHandler(missingFieldReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(missingFieldRes.status, 400);

    // Non-existent fieldId
    const nonExistentReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/proxy-query?fieldId=non_existent_field`
    );
    const nonExistentRes = await proxyQueryHandler(nonExistentReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(nonExistentRes.status, 404);

    console.log('  ✓ Error handling verified: SSRF block, missing fieldId, and 404 field lookup');

  } finally {
    // 7. Cleanup
    console.log('7. Cleaning up test artifacts and shutting down mock server...');
    if (testForm) {
      await prisma.apiSecret.deleteMany({ where: { formId: testForm.id } });
      await prisma.form.deleteMany({ where: { id: testForm.id } });
    }
    if (testOrg) {
      await prisma.organization.deleteMany({ where: { id: testOrg.id } });
      await prisma.user.deleteMany({ where: { id: testOrg.owner.id } });
    }
    mockServer.close();
    console.log('  ✓ Test resources cleaned up');
  }

  console.log('--- ALL SECRETS VAULT & API PROXY TESTS PASSED SUCCESSFULLY! ---');
}

runSecretsProxyTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
