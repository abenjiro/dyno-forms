import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { sampleFormSchema } from '../src/data/initialSchema';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING DYNO FORMS POSTGRESQL DATABASE ---');

  // 1. Create or upsert Demo Creator User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const demoUser = await prisma.user.upsert({
    where: { email: 'creator@dynoforms.dev' },
    update: {},
    create: {
      email: 'creator@dynoforms.dev',
      passwordHash,
      fullName: 'Dr. Jane Dyno',
      role: 'creator',
    },
  });
  console.log(`  ✓ Creator user created: ${demoUser.email} (id: ${demoUser.id})`);

  // 2. Create or upsert Default Organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Dyno Forms Demo Workspace',
      slug: 'demo-org',
      ownerId: demoUser.id,
      members: {
        create: {
          userId: demoUser.id,
          role: 'owner',
        },
      },
    },
  });
  console.log(`  ✓ Demo organization created: ${demoOrg.name} (${demoOrg.slug})`);

  // 3. Create sample Form Group: "2025/2026 Admissions"
  const formGroup = await prisma.formGroup.upsert({
    where: {
      orgId_slug: {
        orgId: demoOrg.id,
        slug: 'admissions-2026',
      },
    },
    update: {},
    create: {
      orgId: demoOrg.id,
      name: '2025/2026 Academic Admissions',
      slug: 'admissions-2026',
      description: 'Undergraduate and Postgraduate admission application cohort for 2025/2026.',
    },
  });
  console.log(`  ✓ Form cohort group created: ${formGroup.name}`);

  // 4. Seed sample form
  const sampleForm = await prisma.form.upsert({
    where: { id: sampleFormSchema.id },
    update: {
      schema: sampleFormSchema as any,
      settings: sampleFormSchema.settings as any,
      title: sampleFormSchema.title,
    },
    create: {
      id: sampleFormSchema.id,
      orgId: demoOrg.id,
      groupId: formGroup.id,
      createdById: demoUser.id,
      title: sampleFormSchema.title,
      slug: 'vendor-partner-application',
      description: sampleFormSchema.description,
      status: 'published',
      schema: sampleFormSchema as any,
      settings: sampleFormSchema.settings as any,
      pricingConfig: {
        accessMode: 'free',
        basePrice: 0,
        currency: 'USD',
      },
    },
  });
  console.log(`  ✓ Sample form seeded and published: ${sampleForm.title} (ID: ${sampleForm.id})`);

  // 5. Seed sample voucher
  const voucherCode = 'ADM-2026-DEMO';
  const codeHash = crypto.createHash('sha256').update(voucherCode.toUpperCase().trim()).digest('hex');

  const sampleVoucher = await prisma.voucher.upsert({
    where: { codeHash },
    update: {},
    create: {
      formId: sampleForm.id,
      groupId: formGroup.id,
      codeHash,
      codeMasked: 'ADM-***-DEMO',
      batchName: 'Orientation Welcome Vouchers',
      discountType: 'full_waiver',
      discountValue: 100,
      maxUses: 10,
      timesUsed: 0,
      status: 'active',
    },
  });
  console.log(`  ✓ Sample voucher created: ${voucherCode} (Active, 10 uses)`);

  console.log('--- DATABASE SEEDING COMPLETED SUCCESSFULLY! ---');
}

main()
  .catch((e) => {
    console.error('Database seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
