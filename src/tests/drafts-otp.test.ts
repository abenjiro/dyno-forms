/**
 * Milestone 8: Frictionless Draft Auto-Save, Magic Links & 6-Digit OTP Recovery Tests
 * Run with: npx tsx src/tests/drafts-otp.test.ts
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import prisma from '../lib/db';
import { POST as saveDraftHandler } from '../app/api/forms/[id]/drafts/route';
import { GET as getDraftHandler, DELETE as deleteDraftHandler } from '../app/api/forms/[id]/drafts/[token]/route';
import { POST as requestOtpHandler } from '../app/api/forms/[id]/drafts/otp-request/route';
import { POST as verifyOtpHandler } from '../app/api/forms/[id]/drafts/otp-verify/route';
import { NextRequest } from 'next/server';

console.log('--- RUNNING DYNO FORMS DRAFTS & OTP RECOVERY TESTS ---');

async function runDraftsOtpTests() {
  let testOrg: any = null;
  let testForm: any = null;
  let testDraftToken: string | null = null;

  try {
    // 1. Setup Test Form
    console.log('1. Setting up Test Form in PostgreSQL...');
    testOrg = await prisma.organization.create({
      data: {
        name: 'Drafts Automation Org',
        slug: `draft-org-${Date.now()}`,
        owner: {
          create: {
            email: `draft-owner-${Date.now()}@dynoforms.test`,
            passwordHash: 'dummyhash123',
            fullName: 'Draft Admin',
          },
        },
      },
      include: { owner: true },
    });

    testForm = await prisma.form.create({
      data: {
        orgId: testOrg.id,
        createdById: testOrg.owner.id,
        title: 'Master Admissions Application (Draft Test)',
        slug: `admissions-draft-${Date.now()}`,
        status: 'published',
        schema: {
          id: 'admissions-schema',
          title: 'Master Admissions Application',
          root: {
            id: 'root',
            type: 'canvas',
            name: 'canvas',
            isContainer: true,
            children: [],
          },
        },
        settings: {
          enableDrafts: true,
          theme: 'light',
        },
      },
    });
    console.log(`  ✓ Test form created: ${testForm.id}`);

    // 2. Test Draft Saving with Auto-Detected Email & Phone
    console.log('2. Testing Draft Saving with Auto-Detected Email & Phone...');
    const testValues = {
      fullName: 'Alice Walker',
      email: 'alice.walker@university.edu',
      phone: '+1-555-839-2019',
      department: 'Computer Science',
      statementOfPurpose: 'Excited to contribute to machine learning research.',
    };

    const saveRequest = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: testValues,
          progress: 45,
        }),
      }
    );

    const saveResponse = await saveDraftHandler(saveRequest, {
      params: Promise.resolve({ id: testForm.id }),
    });

    assert.strictEqual(saveResponse.status, 200, 'Draft save must return HTTP 200');
    const saveData = await saveResponse.json();

    assert.strictEqual(saveData.success, true);
    assert(saveData.resumeToken.startsWith('dft_'), 'Resume token must start with dft_');
    assert.strictEqual(saveData.email, 'alice.walker@university.edu');
    assert.strictEqual(saveData.phone, '+1-555-839-2019');
    assert.strictEqual(saveData.progress, 45);

    testDraftToken = saveData.resumeToken;

    // Verify in PostgreSQL database
    const dbDraft = await prisma.draft.findUnique({
      where: { resumeToken: testDraftToken! },
    });
    assert(dbDraft, 'Draft must be persisted in PostgreSQL drafts table');
    assert.strictEqual((dbDraft!.values as any).fullName, 'Alice Walker');
    console.log('  ✓ Draft saved to PostgreSQL and resume token issued:', testDraftToken);

    // 3. Test Direct Tokenized Magic Link Retrieval
    console.log('3. Testing Draft Loading via Tokenized Magic Link...');
    const loadRequest = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/${testDraftToken}`
    );
    const loadResponse = await getDraftHandler(loadRequest, {
      params: Promise.resolve({ id: testForm.id, token: testDraftToken! }),
    });

    assert.strictEqual(loadResponse.status, 200);
    const loadData = await loadResponse.json();
    assert.strictEqual(loadData.values.fullName, 'Alice Walker');
    assert.strictEqual(loadData.values.department, 'Computer Science');
    console.log('  ✓ Draft retrieved successfully via tokenized link');

    // 4. Test 6-Digit OTP Request (Email)
    console.log('4. Testing 6-Digit OTP Generation for Email Recovery...');
    const otpReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-request`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'alice.walker@university.edu' }),
      }
    );
    const otpReqRes = await requestOtpHandler(otpReq, {
      params: Promise.resolve({ id: testForm.id }),
    });

    assert.strictEqual(otpReqRes.status, 200);
    const otpReqData = await otpReqRes.json();
    assert.strictEqual(otpReqData.success, true);
    assert(otpReqData.maskedTarget.includes('@university.edu'));
    assert(otpReqData.devOtp, 'Development OTP should be present in test environment');
    const generatedOtp = otpReqData.devOtp;
    assert.strictEqual(generatedOtp.length, 6, 'OTP must be 6 digits');

    // Verify hashed at rest
    const draftAfterOtp = await prisma.draft.findUnique({
      where: { resumeToken: testDraftToken! },
    });
    assert(draftAfterOtp?.otpHash, 'OTP hash must be present in database');
    assert.notStrictEqual(draftAfterOtp?.otpHash, generatedOtp, 'OTP must NEVER be stored in plaintext');
    assert.strictEqual(draftAfterOtp?.otpHash?.length, 64, 'OTP hash must be 64-character SHA-256');
    console.log('  ✓ 6-digit OTP generated, hashed with SHA-256, and masked for respondent');

    // 5. Test Invalid OTP & Expired OTP Rejection
    console.log('5. Testing Invalid & Expired OTP Rejection...');
    const invalidVerifyReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'alice.walker@university.edu',
          otp: '999999', // Wrong code
        }),
      }
    );
    const invalidVerifyRes = await verifyOtpHandler(invalidVerifyReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(invalidVerifyRes.status, 400, 'Invalid OTP code must be rejected');

    // Simulate expired OTP
    await prisma.draft.update({
      where: { id: draftAfterOtp!.id },
      data: { otpExpiresAt: new Date(Date.now() - 60 * 1000) }, // Expired 1 min ago
    });

    const expiredVerifyReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'alice.walker@university.edu',
          otp: generatedOtp,
        }),
      }
    );
    const expiredVerifyRes = await verifyOtpHandler(expiredVerifyReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(expiredVerifyRes.status, 400, 'Expired OTP must be rejected');
    console.log('  ✓ Incorrect code and expired code properly rejected with HTTP 400');

    // 6. Test Successful Verification & Single-Use Enforcement
    console.log('6. Testing Successful OTP Verification & Single-Use Replay Protection...');
    // Request fresh code
    const freshReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-request`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'alice.walker@university.edu' }),
      }
    );
    const freshRes = await requestOtpHandler(freshReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    const freshData = await freshRes.json();
    const freshOtp = freshData.devOtp;

    // Verify valid fresh code
    const validVerifyReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'alice.walker@university.edu',
          otp: freshOtp,
        }),
      }
    );
    const validVerifyRes = await verifyOtpHandler(validVerifyReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(validVerifyRes.status, 200, 'Valid OTP must return HTTP 200');
    const validVerifyData = await validVerifyRes.json();
    assert.strictEqual(validVerifyData.success, true);
    assert.strictEqual(validVerifyData.values.fullName, 'Alice Walker');
    assert.strictEqual(validVerifyData.resumeToken, testDraftToken);

    // Verify OTP was consumed (single-use)
    const draftAfterVerify = await prisma.draft.findUnique({
      where: { resumeToken: testDraftToken! },
    });
    assert.strictEqual(draftAfterVerify?.otpHash, null, 'OTP hash must be cleared upon successful verification');
    assert.strictEqual(draftAfterVerify?.otpExpiresAt, null, 'OTP expiry must be cleared');

    // Replay attempt must fail
    const replayReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'alice.walker@university.edu',
          otp: freshOtp,
        }),
      }
    );
    const replayVerifyRes = await verifyOtpHandler(replayReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(replayVerifyRes.status, 400, 'Replay of consumed OTP code must be rejected');
    console.log('  ✓ OTP verified, draft restored, and single-use consumption confirmed');

    // 7. Test Phone Number OTP Recovery
    console.log('7. Testing Phone Number Draft OTP Recovery...');
    const phoneOtpReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-request`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '+1-555-839-2019' }),
      }
    );
    const phoneOtpRes = await requestOtpHandler(phoneOtpReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    const phoneOtpData = await phoneOtpRes.json();
    assert.strictEqual(phoneOtpData.success, true);

    const phoneVerifyReq = new NextRequest(
      `http://localhost:3050/api/forms/${testForm.id}/drafts/otp-verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: '+1-555-839-2019',
          otp: phoneOtpData.devOtp,
        }),
      }
    );
    const phoneVerifyRes = await verifyOtpHandler(phoneVerifyReq, {
      params: Promise.resolve({ id: testForm.id }),
    });
    assert.strictEqual(phoneVerifyRes.status, 200);
    const phoneVerifyData = await phoneVerifyRes.json();
    assert.strictEqual(phoneVerifyData.values.fullName, 'Alice Walker');
    console.log('  ✓ Phone number draft recovery verified successfully');

  } finally {
    // 8. Cleanup
    console.log('8. Cleaning up test artifacts...');
    if (testDraftToken) {
      await prisma.draft.deleteMany({ where: { resumeToken: testDraftToken } });
    }
    if (testForm) {
      await prisma.draft.deleteMany({ where: { formId: testForm.id } });
      await prisma.form.deleteMany({ where: { id: testForm.id } });
    }
    if (testOrg) {
      await prisma.organization.deleteMany({ where: { id: testOrg.id } });
      await prisma.user.deleteMany({ where: { id: testOrg.owner.id } });
    }
    console.log('  ✓ Database test artifacts cleaned up');
  }

  console.log('--- ALL DRAFTS & OTP RECOVERY TESTS PASSED SUCCESSFULLY! ---');
}

runDraftsOtpTests().catch((err) => {
  console.error('Drafts OTP test execution failed:', err);
  process.exit(1);
});
