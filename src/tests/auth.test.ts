import assert from 'node:assert';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '../lib/auth';
import prisma from '../lib/db';

console.log('--- RUNNING DYNO FORMS AUTH & MULTI-TENANCY TESTS ---');

async function runAuthTests() {
  // 1. Password Hashing Tests
  console.log('1. Testing Password Hashing & Verification...');
  const password = 'SuperSecretPassword2026!';
  const hash = await hashPassword(password);
  assert(hash !== password, 'Hash should not match plaintext');
  assert(await verifyPassword(password, hash) === true, 'Valid password should verify');
  assert(await verifyPassword('WrongPassword', hash) === false, 'Invalid password should fail');
  console.log('  ✓ Password hashing and verification passed');

  // 2. JWT Session Token Tests
  console.log('2. Testing JWT Session Token Lifecycle...');
  const testPayload = {
    userId: 'usr_test_123',
    email: 'test@dynoforms.dev',
    role: 'creator',
    orgId: 'org_test_999',
  };

  const token = await signSessionToken(testPayload);
  assert(typeof token === 'string' && token.length > 20, 'JWT token should be signed string');

  const decoded = await verifySessionToken(token);
  assert(decoded !== null, 'Valid JWT should decode');
  assert(decoded.userId === testPayload.userId, 'Decoded userId should match');
  assert(decoded.email === testPayload.email, 'Decoded email should match');
  assert(decoded.orgId === testPayload.orgId, 'Decoded orgId should match');

  const invalidDecoded = await verifySessionToken('invalid.token.string');
  assert(invalidDecoded === null, 'Malformed JWT should return null');
  console.log('  ✓ JWT signing and verification passed');

  // 3. Database User & Multi-Tenancy Registration Flow
  console.log('3. Testing User & Workspace Registration in Database...');
  const testEmail = `test_creator_${Date.now()}@dynoforms.test`;
  const testUserPass = await hashPassword('CreatorPass123!');

  const createdData = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: testEmail,
        passwordHash: testUserPass,
        fullName: 'Test Automation Creator',
        role: 'creator',
      },
    });

    const org = await tx.organization.create({
      data: {
        name: 'Automation Test Org',
        slug: `auto-org-${Date.now()}`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    return { user, org };
  });

  assert(createdData.user.id !== '', 'User should be created');
  assert(createdData.org.ownerId === createdData.user.id, 'Org owner should match user ID');
  console.log(`  ✓ Created user and default workspace: ${createdData.org.name}`);

  // Clean up test user & org (cascade deletes org and members)
  await prisma.user.delete({ where: { id: createdData.user.id } });
  console.log('  ✓ Test user & workspace cleaned up');

  console.log('--- ALL AUTH & MULTI-TENANCY TESTS PASSED SUCCESSFULLY! ---');
}

runAuthTests()
  .catch((err) => {
    console.error('Auth test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
