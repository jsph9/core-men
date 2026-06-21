const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // 1. Buscar el producto
    const productId = 'dc6d8150-864e-4739-9328-4c12d5a7bec2';
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true }
    });

    if (!product) {
      console.error(`Error: El producto con ID ${productId} no fue encontrado.`);
      return;
    }
    console.log("Producto encontrado:", product.name);

    if (!product.variants || product.variants.length === 0) {
      console.error("Error: El producto no tiene variantes.");
      return;
    }

    // 2. Buscar un usuario Cliente para asociarle la cotización
    const clientUser = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });

    if (!clientUser) {
      console.error("Error: No se encontró ningún usuario con rol CLIENT.");
      return;
    }
    console.log("Usuario cliente asociado:", clientUser.email);

    // 3. Buscar una técnica de estampado por defecto
    const technique = await prisma.technique.findFirst();
    if (!technique) {
      console.error("Error: No se encontraron técnicas de estampado.");
      return;
    }

    // 4. Crear la cotización
    const variant = product.variants[0];
    const quantity = 100;

    const newQuote = await prisma.quote.create({
      data: {
        clientId: clientUser.id,
        totalQuantity: quantity,
        status: 'PENDING',
        isVisited: false,
        viabilityStatus: 'PENDING',
        customerResponseStatus: 'PENDING',
        clientFormalizationStatus: 'PENDING',
        message: 'Solicitud de cotización para Polo Camisero Negro Clásico con logo.',
        items: {
          create: [{
            productVariantId: variant.id,
            quantity: quantity
          }]
        },
        designs: {
          create: [{
            placement: 'FRONT',
            techniqueId: technique.id,
            baseGarmentUrl: '/prenda-base.png',
            logoUrl: 'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/disenio-cliente/test-logo.png',
            positionX: 150,
            positionY: 180,
            width: 100,
            height: 60,
            rotation: 0,
            canvasWidth: 400,
            canvasHeight: 500
          }]
        }
      },
      include: {
        items: true,
        designs: true
      }
    });

    console.log("\n==================================================");
    console.log("COTIZACIÓN CREADA CON ÉXITO");
    console.log("==================================================");
    console.log("ID Cotización:", newQuote.id);
    console.log("ID Cliente:", newQuote.clientId);
    console.log("Estado (status):", newQuote.status);
    console.log("Visto (isVisited):", newQuote.isVisited);
    console.log("Cantidad Total:", newQuote.totalQuantity);
    console.log("Items Creados:", newQuote.items.length);
    console.log("Diseño Asociado:", newQuote.designs[0] ? "Sí" : "No");
    console.log("==================================================\n");

  } catch (err) {
    console.error("Error al crear la cotización:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
