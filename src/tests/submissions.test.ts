/**
 * Milestone 4: Submissions Persistence, Quotas, Voucher Redemption & CSV Export Integration Tests
 * Run with: npx tsx src/tests/submissions.test.ts
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import prisma from '../lib/db';
import { sampleFormSchema } from '../data/initialSchema';
import { POST as submitHandler } from '../app/api/forms/submit/route';

console.log('--- RUNNING DYNO FORMS SUBMISSIONS ENGINE INTEGRATION TESTS ---');

async function runSubmissionsTests() {
  // 1. Get creator user and organization
  const user = await prisma.user.findFirst({
    where: { email: 'creator@dynoforms.dev' },
    include: { ownedOrganizations: true },
  });
  assert(user !== null, 'Creator user should exist');
  const org = user.ownedOrganizations[0];
  assert(org !== null, 'Organization should exist');

  // 2. Setup a test published form with quota limit of 2
  console.log('1. Setting up test form with submission cap...');
  const testFormId = crypto.randomUUID();
  const testForm = await prisma.form.create({
    data: {
      id: testFormId,
      orgId: org.id,
      createdById: user.id,
      title: 'Annual Tech Fellowship Application',
      slug: `fellowship-app-${Date.now()}`,
      status: 'published',
      currentVersion: 1,
      submissionLimit: 2, // Quota of 2 submissions
      submissionCount: 0,
      schema: {
        ...sampleFormSchema,
        id: testFormId,
        title: 'Annual Tech Fellowship Application',
      } as any,
      settings: sampleFormSchema.settings as any,
    },
  });
  console.log(`  ✓ Test form created: "${testForm.title}" (Cap: 2)`);

  // 3. Setup a test voucher
  console.log('2. Creating institutional discount voucher...');
  const voucherCode = `FELLOW-2026-${Date.now()}`;
  const codeHash = crypto.createHash('sha256').update(voucherCode.toUpperCase().trim()).digest('hex');
  const voucher = await prisma.voucher.create({
    data: {
      id: crypto.randomUUID(),
      formId: testForm.id,
      codeHash,
      codeMasked: 'FELLOW-***-2026',
      discountType: 'full_waiver',
      discountValue: 100,
      maxUses: 1,
      timesUsed: 0,
      status: 'active',
    },
  });
  console.log(`  ✓ Voucher created: ${voucherCode} (1 single use)`);

  // 4. Test normal submission #1
  console.log('3. Testing First Submission via /api/forms/submit handler...');
  const req1 = new Request('http://localhost:3050/api/forms/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.168.1.50' },
    body: JSON.stringify({
      formId: testForm.id,
      data: {
        applicantName: 'Ada Lovelace',
        email: 'ada@computing.org',
        yearsOfExperience: 5,
        portfolioUrl: 'https://ada.dev',
      },
    }),
  });

  const res1 = await submitHandler(req1 as any);
  const json1 = await res1.json();
  assert.strictEqual(res1.status, 200, 'First submission should succeed with 200 OK');
  assert.strictEqual(json1.success, true, 'Result should be success true');
  assert(json1.submissionId, 'Should return a generated UUID submission ID');
  console.log(`  ✓ First submission saved: ID ${json1.submissionId}`);

  // Verify DB state after submission #1
  const updatedForm1 = await prisma.form.findUnique({ where: { id: testForm.id } });
  assert.strictEqual(updatedForm1?.submissionCount, 1, 'Form submissionCount should be incremented to 1');

  const subDb1 = await prisma.submission.findUnique({ where: { id: json1.submissionId } });
  assert(subDb1 !== null, 'Submission record should exist in PostgreSQL');
  assert.strictEqual((subDb1.data as any).applicantName, 'Ada Lovelace');
  assert.strictEqual(subDb1.paymentStatus, 'free');
  assert(subDb1.ipHash, 'IP hash should be recorded');
  console.log(`  ✓ PostgreSQL persistence & counter increment verified`);

  // 5. Test submission #2 using Voucher Code
  console.log('4. Testing Second Submission with Institutional Voucher Redemption...');
  const req2 = new Request('http://localhost:3050/api/forms/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formId: testForm.id,
      voucherCode: voucherCode,
      data: {
        applicantName: 'Alan Turing',
        email: 'alan@bletchley.ac.uk',
        yearsOfExperience: 8,
      },
    }),
  });

  const res2 = await submitHandler(req2 as any);
  const json2 = await res2.json();
  assert.strictEqual(res2.status, 200, 'Voucher submission should succeed with 200 OK');
  assert(json2.submissionId, 'Should return submissionId');

  const subDb2 = await prisma.submission.findUnique({
    where: { id: json2.submissionId },
    include: { voucher: true, voucherRedemptions: true },
  });
  assert.strictEqual(subDb2?.paymentStatus, 'voucher_waived', 'Payment status should be voucher_waived');
  assert.strictEqual(subDb2?.voucherId, voucher.id, 'Submission should link to voucher ID');
  assert.strictEqual(subDb2?.voucherRedemptions.length, 1, 'VoucherRedemption record should be created');

  const updatedVoucher = await prisma.voucher.findUnique({ where: { id: voucher.id } });
  assert.strictEqual(updatedVoucher?.timesUsed, 1, 'Voucher timesUsed should be incremented to 1');
  assert.strictEqual(updatedVoucher?.status, 'exhausted', 'Voucher status should transition to exhausted');
  console.log('  ✓ Voucher redemption atomically recorded and voucher status updated to exhausted');

  // 6. Test submission #3: Exceeding Quota Cap (Cap is 2)
  console.log('5. Testing Quota Cap Enforcement (Attempting 3rd submission on cap of 2)...');
  const req3 = new Request('http://localhost:3050/api/forms/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formId: testForm.id,
      data: { applicantName: 'Grace Hopper' },
    }),
  });

  const res3 = await submitHandler(req3 as any);
  const json3 = await res3.json();
  assert.strictEqual(res3.status, 403, 'Should reject submission exceeding quota with 403 Forbidden');
  assert(json3.error.includes('quota'), 'Error message should mention quota limit');
  console.log(`  ✓ Quota cap successfully enforced: "${json3.error}"`);

  // 7. Test Lifecycle Status Enforcement (Closed Form)
  console.log('6. Testing Lifecycle Status Enforcement on Closed Form...');
  await prisma.form.update({
    where: { id: testForm.id },
    data: { status: 'closed', submissionLimit: null },
  });

  const reqClosed = new Request('http://localhost:3050/api/forms/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formId: testForm.id,
      data: { applicantName: 'Tim Berners-Lee' },
    }),
  });

  const resClosed = await submitHandler(reqClosed as any);
  const jsonClosed = await resClosed.json();
  assert.strictEqual(resClosed.status, 403, 'Should reject submission to closed form with 403');
  assert(jsonClosed.error.includes('closed'), 'Error message should mention closed status');
  console.log(`  ✓ Form lifecycle state transition enforced: "${jsonClosed.error}"`);

  // 8. Clean up test records
  console.log('7. Cleaning up test submissions, voucher, and test form...');
  await prisma.voucherRedemption.deleteMany({
    where: { voucherId: voucher.id },
  });
  await prisma.submission.deleteMany({
    where: { formId: testForm.id },
  });
  await prisma.voucher.delete({
    where: { id: voucher.id },
  });
  await prisma.form.delete({
    where: { id: testForm.id },
  });
  console.log('  ✓ Test resources cleaned up');

  console.log('--- ALL SUBMISSIONS ENGINE INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

runSubmissionsTests()
  .catch((err) => {
    console.error('Submissions test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
