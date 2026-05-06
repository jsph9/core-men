import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error("No admin");

    const cat = await prisma.category.findFirst();
    const fab = await prisma.fabricAttribute.findFirst();
    const size = await prisma.sizeAttribute.findFirst();

    if (!cat || !fab || !size) throw new Error("Missing attributes");

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: "Test API Script",
          basePrice: 10.50,
          categoryId: cat.id,
          fabricId: fab.id,
        }
      });

      await tx.productVariant.createMany({
        data: [{
          productId: product.id,
          sizeId: size.id,
          color: "Rojo",
          stock: 10,
          price: null
        }]
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true }
      });
    });

    console.log("Created successfully:", newProduct);

    // Try logging audit which might be the cause
    await prisma.auditLog.create({
      data: {
        type: 'STOCK_ADJUST',
        userId: admin.id,
        entityType: 'Product',
        entityId: newProduct!.id,
        newValue: newProduct as any
      }
    });
    console.log("Audit log created successfully");

  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
