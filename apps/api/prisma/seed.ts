import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CoreMen database...');

  const passwordHash = await bcrypt.hash('Admin1234!', 12);

  // 1. Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@coremen.pe' },
    update: {},
    create: {
      email: 'admin@coremen.pe',
      name: 'Admin CoreMen',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

  // 2. Create Merchant user
  const merchant = await prisma.user.upsert({
    where: { email: 'ventas@coremen.pe' },
    update: {},
    create: {
      email: 'ventas@coremen.pe',
      name: 'Vendedor Gamarra',
      passwordHash,
      role: 'MERCHANT',
      whatsappNumber: '51999999999',
    },
  });
  console.log(`  ✅ Merchant: ${merchant.email}`);

  // 3. Create Categories
  const categories = ['Polos', 'Poleras', 'Casacas'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ✅ Categories: ${categories.join(', ')}`);

  // 4. Create Fabric Attributes
  const fabrics = ['Algodón', 'Piqué', 'Dry Fit', 'Jersey', 'Franela'];
  for (const value of fabrics) {
    const existing = await prisma.fabricAttribute.findFirst({ where: { value } });
    if (!existing) {
      await prisma.fabricAttribute.create({ data: { value } });
    }
  }
  console.log(`  ✅ Fabrics: ${fabrics.join(', ')}`);

  // 5. Create Size Attributes
  const sizes = ['S', 'M', 'L', 'XL', 'XXL', 'Oversize'];
  for (const value of sizes) {
    const existing = await prisma.sizeAttribute.findFirst({ where: { value } });
    if (!existing) {
      await prisma.sizeAttribute.create({ data: { value } });
    }
  }
  console.log(`  ✅ Sizes: ${sizes.join(', ')}`);

  // 6. Create Volume Discount Rules
  await prisma.discountRule.createMany({
    data: [
      { minQuantity: 50, maxQuantity: 100, percentage: 5.0, description: '5% para 50-100 unidades' },
      { minQuantity: 101, maxQuantity: 500, percentage: 10.0, description: '10% para 101-500 unidades' },
      { minQuantity: 501, maxQuantity: null, percentage: 15.0, description: '15% para 501+ unidades' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ Volume discount rules created');

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
