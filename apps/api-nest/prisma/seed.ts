import { PrismaClient, Role, ClientType, DesignPlacement, QuoteMacroStatus, ViabilityStatus, FormalizationStatus } from '@prisma/client';
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
      firstName: 'Admin',
      lastName: 'CoreMen',
      passwordHash,
      role: Role.ADMIN,
      clientType: ClientType.NATURAL,
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

  // 2. Create Merchant user
  const merchant = await prisma.user.upsert({
    where: { email: 'ventas@coremen.pe' },
    update: {},
    create: {
      email: 'ventas@coremen.pe',
      firstName: 'Vendedor',
      lastName: 'Gamarra',
      passwordHash,
      role: Role.MERCHANT,
      clientType: ClientType.NATURAL,
      whatsappNumber: '51999999999',
    },
  });
  console.log(`  ✅ Merchant: ${merchant.email}`);

  // 3. Create Categories
  const categoriesList = ['Polos', 'Poleras', 'Casacas'];
  const seededCategories: any[] = [];
  for (const name of categoriesList) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    seededCategories.push(cat);
  }
  console.log(`  ✅ Categories: ${categoriesList.join(', ')}`);

  // 4. Create Fabric Attributes
  const fabricsList = ['Algodón', 'Piqué', 'Dry Fit', 'Jersey', 'Franela'];
  const seededFabrics: any[] = [];
  for (const value of fabricsList) {
    let fab = await prisma.fabricAttribute.findFirst({ where: { value } });
    if (!fab) {
      fab = await prisma.fabricAttribute.create({ data: { value, price: 0 } });
    }
    seededFabrics.push(fab);
  }
  console.log(`  ✅ Fabrics: ${fabricsList.join(', ')}`);

  // 5. Create Size Attributes
  const sizesList = [
    { abbreviation: 'S', value: 'Small' },
    { abbreviation: 'M', value: 'Medium' },
    { abbreviation: 'L', value: 'Large' },
    { abbreviation: 'XL', value: 'Extra Large' },
    { abbreviation: 'XXL', value: 'Double Extra Large' }
  ];
  const seededSizes: any[] = [];
  for (const size of sizesList) {
    let sz = await prisma.sizeAttribute.findFirst({ where: { abbreviation: size.abbreviation } });
    if (!sz) {
      sz = await prisma.sizeAttribute.create({ data: { abbreviation: size.abbreviation, value: size.value } });
    }
    seededSizes.push(sz);
  }
  console.log(`  ✅ Sizes: ${sizesList.map(s => s.abbreviation).join(', ')}`);

  // 6. Create Colors
  const colorsList = [
    { name: 'Azul Marino', hexCode: '#1e3a8a' },
    { name: 'Negro', hexCode: '#09090b' },
    { name: 'Rojo', hexCode: '#ef4444' },
    { name: 'Blanco', hexCode: '#ffffff' }
  ];
  const seededColors: any[] = [];
  for (const col of colorsList) {
    let color = await prisma.color.findFirst({ where: { name: col.name } });
    if (!color) {
      color = await prisma.color.create({ data: { name: col.name, hexCode: col.hexCode } });
    }
    seededColors.push(color);
  }
  console.log(`  ✅ Colors: ${colorsList.map(c => c.name).join(', ')}`);

  // 7. Create Techniques
  const techniquesList = [
    { name: 'Bordado', description: 'Personalización clásica con hilos' },
    { name: 'Sublimado', description: 'Impresión digital por transferencia térmica' },
    { name: 'Serigrafía', description: 'Impresión con tintas tradicionales' },
    { name: 'DTF', description: 'Direct to Film' }
  ];
  const seededTechniques: any[] = [];
  for (const tech of techniquesList) {
    const t = await prisma.technique.upsert({
      where: { name: tech.name },
      update: {},
      create: { name: tech.name, description: tech.description },
    });
    seededTechniques.push(t);
  }
  console.log(`  ✅ Techniques: ${techniquesList.map(t => t.name).join(', ')}`);

  // 8. Create Volume Discount Rules
  await prisma.discountRule.createMany({
    data: [
      { minQuantity: 50, maxQuantity: 100, percentage: 5.0, description: '5% para 50-100 unidades' },
      { minQuantity: 101, maxQuantity: 500, percentage: 10.0, description: '10% para 101-500 unidades' },
      { minQuantity: 501, maxQuantity: null, percentage: 15.0, description: '15% para 501+ unidades' },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ Volume discount rules created');

  // 9. Crear un Cliente de Prueba
  const testClient = await prisma.user.upsert({
    where: { email: 'cliente@coremen.pe' },
    update: {},
    create: {
      email: 'cliente@coremen.pe',
      firstName: 'Cliente',
      lastName: 'Prueba Gamarra',
      passwordHash,
      role: Role.CLIENT,
      clientType: ClientType.NATURAL,
    },
  });
  console.log(`  ✅ Client: ${testClient.email}`);

  // 10. Create Products and Variants (essential for linking quotes)
  const productData = [
    {
      name: 'Polo Cuello Camisero',
      description: 'Polo clásico piqué de alta calidad',
      basePrice: 35.00,
      fiberComposition: '100% Algodón',
      careInstructions: 'Lavar a máquina en frío',
      categoryId: seededCategories.find(c => c.name === 'Polos').id,
      fabricId: seededFabrics.find(f => f.value === 'Piqué').id,
    },
    {
      name: 'Polera Oversize',
      description: 'Polera oversize con franela perchada',
      basePrice: 55.00,
      fiberComposition: '80% Algodón / 20% Poliéster',
      careInstructions: 'No secar en secadora',
      categoryId: seededCategories.find(c => c.name === 'Poleras').id,
      fabricId: seededFabrics.find(f => f.value === 'Franela').id,
    }
  ];

  const seededProducts: any[] = [];
  for (const prod of productData) {
    const existing = await prisma.product.findFirst({ where: { name: prod.name } });
    if (!existing) {
      const p = await prisma.product.create({
        data: {
          ...prod,
          supportedTechniques: {
            create: seededTechniques.map(t => ({
              techniqueId: t.id
            }))
          }
        }
      });
      seededProducts.push(p);

      // Create variants for all sizes and black/navy colors
      for (const size of seededSizes) {
        for (const color of seededColors.slice(0, 2)) {
          await prisma.productVariant.create({
            data: {
              productId: p.id,
              sizeId: size.id,
              colorId: color.id,
              stock: 100,
              price: prod.basePrice
            }
          });
        }
      }
    } else {
      seededProducts.push(existing);
    }
  }
  console.log('  ✅ Products and variants created');

  // 11. Crear Cotizaciones (Mock Data)
  // Encontrar variantes para asociar
  const poloVariant = await prisma.productVariant.findFirst({
    where: { product: { name: 'Polo Cuello Camisero' } }
  });
  const poleraVariant = await prisma.productVariant.findFirst({
    where: { product: { name: 'Polera Oversize' } }
  });

  // Limpiar cotizaciones existentes antes de crearlas para evitar conflictos de UUIDs
  const existingQuotes = await prisma.quote.findMany({ where: { clientId: testClient.id }, select: { id: true } });
  const quoteIds = existingQuotes.map(q => q.id);
  await prisma.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
  await prisma.design.deleteMany({ where: { quoteId: { in: quoteIds } } });
  await prisma.paymentQuote.deleteMany({ where: { quoteId: { in: quoteIds } } });
  await prisma.quoteStatusHistory.deleteMany({ where: { quoteId: { in: quoteIds } } });
  await prisma.quote.deleteMany({ where: { clientId: testClient.id } });

  // Quote 1: PENDING
  await prisma.quote.create({
    data: {
      clientId: testClient.id,
      totalQuantity: 100,
      message: 'Necesito 100 polos con logo bordado en el pecho para un evento corporativo.',
      status: QuoteMacroStatus.PENDING,
      items: poloVariant ? {
        create: [{
          productVariantId: poloVariant.id,
          quantity: 100
        }]
      } : undefined,
      designs: {
        create: [{
          placement: DesignPlacement.FRONT,
          techniqueId: seededTechniques.find(t => t.name === 'Bordado').id,
          baseGarmentUrl: '/prenda-base.png',
          logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          positionX: 45,
          positionY: 35,
          width: 80,
          height: 45,
          rotation: 0,
          canvasWidth: 500,
          canvasHeight: 500
        }]
      },
      statusHistory: {
        create: [{
          changedField: 'STATUS',
          oldValue: null,
          newValue: 'PENDING',
          changedBy: testClient.id,
          note: 'Cotización creada por el cliente'
        }]
      }
    }
  });

  // Quote 2: IN_REVIEW (estimado)
  await prisma.quote.create({
    data: {
      clientId: testClient.id,
      totalQuantity: 50,
      message: 'Poleras pesadas para marca streetwear, diseño centrado en la espalda.',
      status: QuoteMacroStatus.IN_REVIEW,
      estimatedPrice: 45.50,
      totalEstimatedPrice: 2275.00,
      merchantMessage: 'Podemos hacerlo. El precio unitario sería 45.50 soles por 50 unidades. Tiempo de confección: 7 días útiles.',
      items: poleraVariant ? {
        create: [{
          productVariantId: poleraVariant.id,
          quantity: 50
        }]
      } : undefined,
      designs: {
        create: [{
          placement: DesignPlacement.BACK,
          techniqueId: seededTechniques.find(t => t.name === 'DTF').id,
          baseGarmentUrl: '/prenda-base2.png',
          logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          positionX: 50,
          positionY: 40,
          width: 200,
          height: 200,
          rotation: 0,
          canvasWidth: 500,
          canvasHeight: 500
        }]
      },
      statusHistory: {
        create: [
          {
            changedField: 'STATUS',
            oldValue: null,
            newValue: 'PENDING',
            changedBy: testClient.id,
            note: 'Cotización creada por el cliente'
          },
          {
            changedField: 'STATUS',
            oldValue: 'PENDING',
            newValue: 'IN_REVIEW',
            changedBy: merchant.id,
            note: 'Comerciante respondió con un precio unitario de 45.50'
          }
        ]
      }
    }
  });

  // Quote 3: WAITING_PAYMENT (Aprobado / Formalizado)
  await prisma.quote.create({
    data: {
      clientId: testClient.id,
      totalQuantity: 200,
      message: 'Cotización para promoción de colegio, tallas variadas.',
      status: QuoteMacroStatus.WAITING_PAYMENT,
      estimatedPrice: 65.00,
      totalEstimatedPrice: 13000.00,
      finalPrice: 65.00,
      formalizationStatus: FormalizationStatus.CONFIRMED,
      merchantMessage: 'Precio especial por volumen aplicado. Empezamos producción tras confirmar el adelanto.',
      items: poloVariant ? {
        create: [{
          productVariantId: poloVariant.id,
          quantity: 200
        }]
      } : undefined,
      designs: {
        create: [{
          placement: DesignPlacement.FRONT,
          techniqueId: seededTechniques.find(t => t.name === 'Serigrafía').id,
          baseGarmentUrl: '/prenda-base.png',
          logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          positionX: 50,
          positionY: 50,
          width: 150,
          height: 100,
          rotation: 0,
          canvasWidth: 500,
          canvasHeight: 500
        }]
      },
      statusHistory: {
        create: [
          {
            changedField: 'STATUS',
            oldValue: null,
            newValue: 'PENDING',
            changedBy: testClient.id,
            note: 'Cotización creada por el cliente'
          },
          {
            changedField: 'STATUS',
            oldValue: 'PENDING',
            newValue: 'IN_REVIEW',
            changedBy: merchant.id,
            note: 'Comerciante respondió con un precio unitario de 65.00'
          },
          {
            changedField: 'STATUS',
            oldValue: 'IN_REVIEW',
            newValue: 'WAITING_PAYMENT',
            changedBy: testClient.id,
            note: 'Cliente aprobó la cotización'
          }
        ]
      }
    }
  });

  // Quote 4: CANCELLED (No Viable)
  await prisma.quote.create({
    data: {
      clientId: testClient.id,
      totalQuantity: 10,
      message: 'Quiero 10 polos para el fin de semana.',
      status: QuoteMacroStatus.CANCELLED,
      viabilityStatus: ViabilityStatus.NONVIABLE,
      unfeasibleReason: 'La cantidad mínima para este tipo de corte personalizado es de 30 unidades por color.',
      items: poloVariant ? {
        create: [{
          productVariantId: poloVariant.id,
          quantity: 10
        }]
      } : undefined,
      designs: {
        create: [{
          placement: DesignPlacement.FRONT,
          techniqueId: seededTechniques.find(t => t.name === 'Bordado').id,
          baseGarmentUrl: '/prenda-base.png',
          logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          positionX: 45,
          positionY: 35,
          width: 80,
          height: 45,
          rotation: 0,
          canvasWidth: 500,
          canvasHeight: 500
        }]
      },
      statusHistory: {
        create: [
          {
            changedField: 'STATUS',
            oldValue: null,
            newValue: 'PENDING',
            changedBy: testClient.id,
            note: 'Cotización creada por el cliente'
          },
          {
            changedField: 'STATUS',
            oldValue: 'PENDING',
            newValue: 'CANCELLED',
            changedBy: merchant.id,
            note: 'Marcada como inviable: Cantidad menor a 30 polos'
          }
        ]
      }
    }
  });

  console.log('  ✅ Mock Quotes created');

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
