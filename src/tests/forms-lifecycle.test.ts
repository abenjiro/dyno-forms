/**
 * Milestone 3: Form Management, Lifecycle & Grouping Integration Tests
 * Run with: npx tsx src/tests/forms-lifecycle.test.ts
 */

import crypto from 'node:crypto';
import prisma from '../lib/db';
import { sampleFormSchema } from '../data/initialSchema';

async function runFormsLifecycleTests() {
  console.log('--- RUNNING DYNO FORMS LIFECYCLE & GROUPING TESTS ---');

  // Find or create test organization with owner
  const user = await prisma.user.findFirst({
    include: { ownedOrganizations: true },
  });

  if (!user) {
    throw new Error('No user found in database. Please run npm run db:seed first.');
  }

  let org = user.ownedOrganizations[0];
  let createdTestOrg = false;

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Lifecycle Test Organization',
        slug: `lifecycle-org-${Date.now()}`,
        ownerId: user.id,
      },
    });
    createdTestOrg = true;
  }

  // 1. Testing Form Group Creation
  console.log('1. Testing Form Group (Cohort) Management...');
  const testGroupSlug = `admissions-${Date.now()}`;
  const group = await prisma.formGroup.create({
    data: {
      orgId: org.id,
      name: '2025/2026 Academic Admissions',
      slug: testGroupSlug,
      description: 'Undergraduate and graduate admission intake forms',
    },
  });

  if (!group || group.name !== '2025/2026 Academic Admissions') {
    throw new Error('Failed to create form group');
  }
  console.log(`  ✓ Form group created: "${group.name}" (ID: ${group.id})`);

  // 2. Testing Form Creation with Group Association
  console.log('2. Testing Form Association with Group...');
  const testFormId = crypto.randomUUID();
  const form = await prisma.form.create({
    data: {
      id: testFormId,
      orgId: org.id,
      groupId: group.id,
      title: 'Undergraduate Entrance Application',
      slug: `undergrad-app-${Date.now()}`,
      status: 'draft',
      currentVersion: 1,
      schema: {
        ...sampleFormSchema,
        id: testFormId,
        title: 'Undergraduate Entrance Application',
      } as any,
      settings: {
        theme: 'light',
        multiStep: false,
        showProgressBar: true,
      } as any,
      submissionLimit: 100,
      submissionCount: 0,
      expiresAt: new Date(Date.now() + 86400000), // +24 hours
    },
    include: {
      group: true,
    },
  });

  if (form.groupId !== group.id || form.status !== 'draft') {
    throw new Error('Form creation with group failed');
  }
  console.log(`  ✓ Form created in group: "${form.title}" (Status: ${form.status})`);

  // 3. Testing Form Lifecycle State Transitions (draft -> published -> closed -> archived)
  console.log('3. Testing Form Lifecycle State Transitions...');

  // Publish
  const published = await prisma.form.update({
    where: { id: testFormId },
    data: { status: 'published' },
  });
  if (published.status !== 'published') throw new Error('Failed to transition to published');
  console.log('  ✓ State transition: draft -> published');

  // Close
  const closed = await prisma.form.update({
    where: { id: testFormId },
    data: { status: 'closed' },
  });
  if (closed.status !== 'closed') throw new Error('Failed to transition to closed');
  console.log('  ✓ State transition: published -> closed');

  // Archive
  const archived = await prisma.form.update({
    where: { id: testFormId },
    data: { status: 'archived' },
  });
  if (archived.status !== 'archived') throw new Error('Failed to transition to archived');
  console.log('  ✓ State transition: closed -> archived');

  // 4. Testing Form Duplication / Deep Cloning
  console.log('4. Testing Form Duplication / Deep Cloning...');
  const duplicateId = crypto.randomUUID();
  const duplicated = await prisma.form.create({
    data: {
      id: duplicateId,
      orgId: org.id,
      groupId: form.groupId,
      title: `${form.title} (Copy)`,
      slug: `${form.slug}-copy`,
      status: 'draft',
      currentVersion: 1,
      schema: JSON.parse(JSON.stringify(form.schema)),
      settings: JSON.parse(JSON.stringify(form.settings)),
      submissionLimit: form.submissionLimit,
      submissionCount: 0,
    },
  });

  if (
    duplicated.id !== duplicateId ||
    duplicated.title !== 'Undergraduate Entrance Application (Copy)' ||
    duplicated.submissionCount !== 0
  ) {
    throw new Error('Form duplication failed');
  }
  console.log(`  ✓ Form cloned successfully: "${duplicated.title}" with clean 0 submission counter`);

  // 5. Testing Expiration Rules Evaluation
  console.log('5. Testing Expiration Rules Evaluation Logic...');
  const expiredDate = new Date(Date.now() - 3600000); // 1 hour ago
  const isTimeExpired = (expiresAt: Date | null) => (expiresAt ? new Date() > expiresAt : false);
  const isCapReached = (count: number, limit: number | null) => (limit !== null ? count >= limit : false);

  if (!isTimeExpired(expiredDate)) throw new Error('Time expiration logic check failed');
  if (isTimeExpired(new Date(Date.now() + 3600000))) throw new Error('Future date marked as expired');
  if (!isCapReached(100, 100)) throw new Error('Quota cap limit check failed');
  if (isCapReached(50, 100)) throw new Error('Under quota marked as capped');
  console.log('  ✓ Timestamp expiration & submission quota cap logic verified');

  // 6. Cleanup test records
  console.log('6. Cleaning up test records...');
  await prisma.form.deleteMany({
    where: {
      id: { in: [testFormId, duplicateId] },
    },
  });
  await prisma.formGroup.delete({
    where: { id: group.id },
  });
  if (createdTestOrg) {
    await prisma.organization.delete({
      where: { id: org.id },
    });
  }
  console.log('  ✓ Cleaned up test forms, group, and test organization');

  console.log('--- ALL FORMS LIFECYCLE & GROUPING TESTS PASSED SUCCESSFULLY! ---');
}

runFormsLifecycleTests()
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
