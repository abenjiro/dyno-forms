import assert from 'node:assert';
import prisma from '../lib/db';
import crypto from 'node:crypto';
import { sampleFormSchema } from '../data/initialSchema';

console.log('--- RUNNING DYNO FORMS POSTGRESQL & PRISMA INTEGRATION TESTS ---');

async function runDbTests() {
  // 1. Verify User & Org query
  console.log('1. Testing User & Organization Persistence...');
  const user = await prisma.user.findUnique({
    where: { email: 'creator@dynoforms.dev' },
    include: { ownedOrganizations: true },
  });
  assert(user !== null, 'Seeded creator user should exist in database');
  assert(user.ownedOrganizations.length > 0, 'User should own at least one organization');
  console.log(`  ✓ Found user: ${user.fullName} with organization: ${user.ownedOrganizations[0].name}`);

  // 2. Test Form retrieval with JSONB schema
  console.log('2. Testing Form JSONB Schema Querying...');
  const form = await prisma.form.findUnique({
    where: { id: sampleFormSchema.id },
    include: { group: true, org: true },
  });
  assert(form !== null, 'Seeded form should exist in database');
  assert(form.status === 'published', 'Form status should be published');
  assert(typeof form.schema === 'object' && form.schema !== null, 'Form schema should be JSON object');
  assert((form.schema as any).id === sampleFormSchema.id, 'Form schema AST ID should match');
  assert(form.group?.name === '2025/2026 Academic Admissions', 'Form should belong to 2025/2026 cohort');
  console.log(`  ✓ Form retrieved with AST schema: "${form.title}" (Group: ${form.group?.name})`);

  // 3. Test Submission Creation with JSONB payload
  console.log('3. Testing Submission Record Creation & JSONB Indexing...');
  const testSubId = crypto.randomUUID();
  const submission = await prisma.submission.create({
    data: {
      id: testSubId,
      formId: form.id,
      formVersion: 1,
      submitterId: user.id,
      data: {
        companyName: 'Acme Global Testing Corp',
        contactEmail: 'contact@acmeglobal.test',
        annualRevenue: 5000000,
        tags: ['enterprise', 'high-priority'],
      },
      paymentStatus: 'paid',
    },
  });
  assert(submission.id === testSubId, 'Created submission should match ID');
  assert((submission.data as any).companyName === 'Acme Global Testing Corp', 'JSONB submission data should match');
  console.log(`  ✓ Submission successfully recorded: ${submission.id}`);

  // Clean up test submission
  await prisma.submission.delete({ where: { id: testSubId } });
  console.log('  ✓ Test submission cleaned up');

  // 4. Test Voucher Retrieval & Verification
  console.log('4. Testing Voucher System...');
  const codeHash = crypto.createHash('sha256').update('ADM-2026-DEMO').digest('hex');
  const voucher = await prisma.voucher.findUnique({
    where: { codeHash },
  });
  assert(voucher !== null, 'Seeded voucher should be retrievable by SHA-256 hash');
  assert(voucher.discountType === 'full_waiver', 'Voucher discount should be full_waiver');
  assert(voucher.timesUsed < voucher.maxUses, 'Voucher should have remaining uses');
  console.log(`  ✓ Voucher verified: ${voucher.codeMasked} (${voucher.discountType}, ${voucher.maxUses - voucher.timesUsed} uses left)`);

  console.log('--- ALL PRISMA DATABASE TESTS PASSED SUCCESSFULLY! ---');
}

runDbTests()
  .catch((err) => {
    console.error('Database test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
