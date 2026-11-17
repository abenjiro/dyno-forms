/**
 * Milestone 6: Payments Engine, Split Monetization & Paywalls Unit & Integration Tests
 * Run with: npx tsx src/tests/payments.test.ts
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import prisma from '../lib/db';
import {
  calculateFeeBreakdown,
  formatMoney,
  PricingConfig,
} from '../lib/payments';
import {
  createPrepaidUnlockToken,
  verifyPrepaidUnlockToken,
} from '../lib/payments-server';
import {
  POST as verifyPaymentHandler,
} from '../app/api/forms/[id]/payments/verify/route';
import { POST as initPaymentHandler } from '../app/api/forms/[id]/payments/initialize/route';
import { POST as webhookPaymentHandler } from '../app/api/forms/[id]/payments/webhook/route';
import { NextRequest } from 'next/server';

console.log('--- RUNNING DYNO FORMS MONETIZATION & PAYMENTS ENGINE TESTS ---');

async function runPaymentsTests() {
  // 1. Fee Breakdown Calculations (Client Bears Fees)
  console.log('1. Testing Fee Breakdown: Client Bears Fees...');
  const breakdownClient = calculateFeeBreakdown(100.0, 'USD', 'client', 5.0, 2.5);
  assert.strictEqual(breakdownClient.basePrice, 100.0);
  assert.strictEqual(breakdownClient.platformFee, 5.0, 'Platform fee should be 5% of 100 = $5.00');
  assert.strictEqual(breakdownClient.gatewayFee, 2.5, 'Gateway fee should be 2.5% of 100 = $2.50');
  assert.strictEqual(breakdownClient.totalCharged, 107.5, 'Client total charged must be $107.50');
  assert.strictEqual(breakdownClient.creatorNet, 100.0, 'Creator net must remain 100% of base price ($100.00)');
  console.log('  ✓ Client fee bearer calculation verified (Total: $107.50, Creator Net: $100.00)');

  // 2. Fee Breakdown Calculations (Creator Absorbs Fees)
  console.log('2. Testing Fee Breakdown: Creator Absorbs Fees...');
  const breakdownCreator = calculateFeeBreakdown(100.0, 'USD', 'creator', 5.0, 2.5);
  assert.strictEqual(breakdownCreator.basePrice, 100.0);
  assert.strictEqual(breakdownCreator.platformFee, 5.0);
  assert.strictEqual(breakdownCreator.gatewayFee, 2.5);
  assert.strictEqual(breakdownCreator.totalCharged, 100.0, 'Client pays exact base price ($100.00)');
  assert.strictEqual(breakdownCreator.creatorNet, 92.5, 'Creator receives 100 - 7.50 = $92.50');
  console.log('  ✓ Creator fee bearer calculation verified (Total: $100.00, Creator Net: $92.50)');

  // 3. Currency Symbols & Formatting
  console.log('3. Testing Multi-Currency Symbols & Formatting...');
  assert.strictEqual(formatMoney(25.5, 'USD'), '$25.50');
  assert.strictEqual(formatMoney(150.0, 'GHS'), 'GH₵150.00');
  assert.strictEqual(formatMoney(5000.0, 'NGN'), '₦5000.00');
  assert.strictEqual(formatMoney(120.0, 'EUR'), '€120.00');
  assert.strictEqual(formatMoney(85.0, 'GBP'), '£85.00');
  assert.strictEqual(formatMoney(2500.0, 'KES'), 'KSh2500.00');
  console.log('  ✓ Currency formatting for global and African currencies verified');

  // 4. Prepaid HMAC Unlock Token Verification
  console.log('4. Testing Prepaid Cryptographic Unlock Tokens...');
  const formId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const token = createPrepaidUnlockToken(formId, paymentId);
  assert(token.length > 20, 'Unlock token should be valid base64url string');

  const isValid = verifyPrepaidUnlockToken(formId, token);
  assert.strictEqual(isValid, true, 'Valid token must be verified successfully');

  const isInvalidForm = verifyPrepaidUnlockToken(crypto.randomUUID(), token);
  assert.strictEqual(isInvalidForm, false, 'Token with wrong form ID must be rejected');

  const isTampered = verifyPrepaidUnlockToken(formId, token + 'tampered');
  assert.strictEqual(isTampered, false, 'Tampered token must be rejected');
  console.log('  ✓ Cryptographic unlock token creation & tamper resistance verified');

  // 5. Database Integration Tests if PostgreSQL is reachable
  let dbAvailable = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch (err) {
    console.log('  ℹ Database server not reachable in current sandbox; skipping direct DB integration.');
  }

  if (dbAvailable) {
    console.log('5. Testing Database-backed Payment Lifecycle & Webhooks...');
    const user = await prisma.user.findFirst({
      where: { email: 'creator@dynoforms.dev' },
      include: { ownedOrganizations: true },
    });
    assert(user !== null, 'Creator user must exist');
    const org = user.ownedOrganizations[0];

    const testFormId = crypto.randomUUID();
    const testForm = await prisma.form.create({
      data: {
        id: testFormId,
        orgId: org.id,
        createdById: user.id,
        title: 'Monetized Test Form',
        slug: `monetized-form-${Date.now()}`,
        status: 'published',
        settings: {},
        pricingConfig: {
          accessMode: 'postpaid',
          basePrice: 50.0,
          currency: 'USD',
          feeBearer: 'client',
          platformFeePercent: 5.0,
          gatewayFeePercent: 2.5,
          enabledGateways: ['stripe', 'paystack', 'momo'],
        },
        schema: { id: testFormId, title: 'Monetized Test Form' } as any,
      },
    });

    // Initialize Payment
    const initReq = new NextRequest(`http://localhost:3050/api/forms/${testForm.id}/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gateway: 'stripe',
        payerEmail: 'payer@example.com',
      }),
    });
    const initRes = await initPaymentHandler(initReq, { params: Promise.resolve({ id: testForm.id }) });
    const initData = await initRes.json();
    assert.strictEqual(initData.success, true);
    assert.strictEqual(initData.totalCharged, 53.75, '50 + 5% + 2.5% = 53.75');
    assert(initData.reference.startsWith('DF-PAY-'), 'Reference should follow standard format');
    console.log(`  ✓ Payment initialized with reference: ${initData.reference}`);

    // Verify Payment
    const verifyReq = new NextRequest(`http://localhost:3050/api/forms/${testForm.id}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: initData.paymentId,
        reference: initData.reference,
      }),
    });
    const verifyRes = await verifyPaymentHandler(verifyReq, { params: Promise.resolve({ id: testForm.id }) });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.success, true);
    assert.strictEqual(verifyData.status, 'paid');
    assert(Boolean(verifyData.unlockToken), 'Must return unlock token');
    console.log('  ✓ Payment verified and marked as paid in database');

    // Test Webhook idempotency
    const webhookReq = new NextRequest(`http://localhost:3050/api/forms/${testForm.id}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: initData.reference,
        event: 'charge.success',
      }),
    });
    const webhookRes = await webhookPaymentHandler(webhookReq, { params: Promise.resolve({ id: testForm.id }) });
    const webhookData = await webhookRes.json();
    assert.strictEqual(webhookData.received, true);
    console.log('  ✓ Webhook idempotent callback processed cleanly');

    // Clean up
    await prisma.payment.deleteMany({ where: { formId: testForm.id } });
    await prisma.form.delete({ where: { id: testForm.id } });
    console.log('  ✓ Database test artifacts cleaned up');
  }

  console.log('--- ALL PAYMENT & MONETIZATION TESTS COMPLETED SUCCESSFULLY! ---');
}

runPaymentsTests().catch((err) => {
  console.error('Payment tests failed:', err);
  process.exit(1);
});
