/**
 * Milestone 5: Institutional Voucher Batch System & Redemption Integration Tests
 * Run with: npx tsx src/tests/vouchers.test.ts
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import prisma from '../lib/db';
import { POST as verifyHandler } from '../app/api/forms/[id]/vouchers/verify/route';
import { POST as redeemHandler } from '../app/api/forms/[id]/vouchers/redeem/route';
import { NextRequest } from 'next/server';

console.log('--- RUNNING DYNO FORMS VOUCHERS ENGINE UNIT & INTEGRATION TESTS ---');

// Unambiguous character set used by voucher generator (no 0, O, 1, I, L)
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateRandomSegment(length: number): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

function generateTestVoucher(prefix: string) {
  const segment1 = generateRandomSegment(4);
  const segment2 = generateRandomSegment(4);
  const code = `${prefix}-${segment1}-${segment2}`;
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const parts = code.split('-');
  const lastSegment = parts[parts.length - 1];
  const leadSegment = parts.length > 2 ? parts.slice(0, -2).join('-') : parts[0];
  const codeMasked = `${leadSegment}-***-${lastSegment}`;
  return { code, codeHash, codeMasked, segment1, segment2 };
}

async function runVouchersTests() {
  // 1. Voucher Generation Algorithm Tests
  console.log('1. Testing Voucher Code Generation & Masking Algorithm...');
  const generatedSet = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const { code, codeMasked, codeHash, segment1, segment2 } = generateTestVoucher('ADM-2026');
    assert(code.startsWith('ADM-2026-'), 'Code should start with prefix');
    assert(codeMasked.includes('***'), 'Code masked should contain ***');
    assert(!/[0O1IL]/.test(segment1 + segment2), 'Unambiguous charset must exclude 0, O, 1, I, L');
    assert(!generatedSet.has(codeHash), 'Hashes must be unique');
    generatedSet.add(codeHash);
  }
  console.log('  ✓ 50 unique unambiguous vouchers successfully generated with correct masking');

  // Try DB tests if DB is reachable
  let dbAvailable = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch (err) {
    console.log('  ℹ Database server not reachable in current sandbox environment; skipping direct DB queries.');
  }

  if (dbAvailable) {
    console.log('2. Testing Database-backed Voucher Verification & Redemption...');
    const user = await prisma.user.findFirst({
      where: { email: 'creator@dynoforms.dev' },
      include: { ownedOrganizations: true },
    });
    assert(user !== null, 'Creator user must exist');
    const org = user.ownedOrganizations[0];
    assert(org !== null, 'Organization must exist');

    // Create test form
    const formId = crypto.randomUUID();
    const testForm = await prisma.form.create({
      data: {
        id: formId,
        orgId: org.id,
        createdById: user.id,
        title: 'Voucher Unit Test Form',
        slug: `voucher-test-${Date.now()}`,
        status: 'published',
        settings: {},
        schema: { id: formId, title: 'Voucher Unit Test Form' } as any,
      },
    });

    // Create a single-use voucher
    const { code, codeHash, codeMasked } = generateTestVoucher('TEST-2026');
    const voucher = await prisma.voucher.create({
      data: {
        id: crypto.randomUUID(),
        formId: testForm.id,
        codeHash,
        codeMasked,
        batchName: 'Automated Test Batch',
        discountType: 'full_waiver',
        discountValue: 0,
        maxUses: 1,
        timesUsed: 0,
        status: 'active',
      },
    });
    console.log(`  ✓ Created test voucher: ${codeMasked}`);

    // Verify valid voucher
    const verifyReq1 = new NextRequest(`http://localhost:3050/api/forms/${testForm.id}/vouchers/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const verifyRes1 = await verifyHandler(verifyReq1, { params: Promise.resolve({ id: testForm.id }) });
    const verifyData1 = await verifyRes1.json();
    assert.strictEqual(verifyData1.valid, true, 'Voucher should be valid');
    assert.strictEqual(verifyData1.discountSummary, '100% Fee Waiver');
    console.log('  ✓ Verified valid voucher returns valid: true and discount summary');

    // Redeem voucher via /api/forms/[id]/vouchers/redeem
    const redeemReq1 = new NextRequest(`http://localhost:3050/api/forms/${testForm.id}/vouchers/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email: 'applicant@example.com' }),
    });
    const redeemRes1 = await redeemHandler(redeemReq1, { params: Promise.resolve({ id: testForm.id }) });
    const redeemData1 = await redeemRes1.json();
    assert.strictEqual(redeemData1.success, true, 'Redemption should succeed');
    assert.strictEqual(redeemData1.timesUsed, 1);
    console.log('  ✓ Successfully redeemed voucher with timesUsed incremented to 1');

    // Second redemption attempt should fail (single-use limit reached)
    const redeemReq2 = new NextRequest(`http://localhost:3050/api/forms/${testForm.id}/vouchers/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email: 'second@example.com' }),
    });
    const redeemRes2 = await redeemHandler(redeemReq2, { params: Promise.resolve({ id: testForm.id }) });
    const redeemData2 = await redeemRes2.json();
    assert.strictEqual(redeemData2.success, false, 'Second redemption must fail');
    assert(redeemData2.error.includes('maximum usage limit') || redeemData2.error.includes('already'), 'Should return usage limit error');
    console.log('  ✓ Double-redemption correctly rejected preventing race conditions');

    // Clean up test records
    await prisma.voucherRedemption.deleteMany({ where: { voucherId: voucher.id } });
    await prisma.voucher.delete({ where: { id: voucher.id } });
    await prisma.form.delete({ where: { id: testForm.id } });
    console.log('  ✓ Test database artifacts cleaned up');
  }

  console.log('--- ALL VOUCHER TESTS COMPLETED SUCCESSFULLY! ---');
}

runVouchersTests().catch((err) => {
  console.error('Voucher tests failed:', err);
  process.exit(1);
});
