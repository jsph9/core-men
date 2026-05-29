const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  try {
    console.log("Starting sales simulation...");

    // 1. Check if we have product variants in the database
    const variants = await prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: { product: true }
    });

    if (variants.length === 0) {
      console.error("No active product variants found in database. Please seed the database first.");
      return;
    }

    // 2. Find or create a client user to assign sales to
    let user = await prisma.user.findFirst({ where: { role: "CLIENT" } });
    if (!user) {
      console.log("No CLIENT user found, creating a default mock client...");
      user = await prisma.user.create({
        data: {
          email: "cliente.mock@coremen.pe",
          name: "Cliente Simulador",
          passwordHash: "$2a$12$aXLojhI1/bpT4DbD0J5eu.I7ZRDUrzgOn.fGWHLeYbIOyshkzelBy", // Admin1234!
          role: "CLIENT",
          isActive: true
        }
      });
    }

    // 3. Clear existing orders to start fresh (optional, but let's keep existing and add new simulated ones)
    console.log("Generating 25 simulated sales over the last 30 days...");

    const paymentMethods = ["card", "yape"];
    const receiptTypes = ["boleta", "factura"];
    const now = new Date();

    for (let i = 0; i < 25; i++) {
      // Choose random variant(s)
      const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items per order
      const orderItemsData = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const variant = variants[Math.floor(Math.random() * variants.length)];
        const qty = Math.floor(Math.random() * 5) + 3; // 3 to 7 units
        const basePrice = Number(variant.price ?? variant.product.basePrice);
        
        // Simple volume discount simulation (e.g. 5% if qty >= 5)
        const pct = qty >= 5 ? 0.05 : 0.00;
        const finalPrice = basePrice * (1 - pct);
        const subtotal = finalPrice * qty;

        totalAmount += subtotal;

        orderItemsData.push({
          productVariantId: variant.id,
          quantity: qty,
          priceAtPurchase: finalPrice,
          originalPrice: basePrice,
          discountPct: pct
        });
      }

      // Generate a date within the last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      // Stagger hours
      orderDate.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60));

      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const receiptType = receiptTypes[Math.floor(Math.random() * receiptTypes.length)];
      
      // Determine final status
      // We will make 80% of simulated orders DELIVERED, and 20% REGISTERED
      const finalStatus = Math.random() < 0.8 ? "DELIVERED" : "REGISTERED";
      const stripePayId = `pi_sim_${Math.random().toString(36).substring(2, 10)}`;

      // Create Order, OrderItems, Payment and History inside a transaction
      await prisma.$transaction(async (tx) => {
        await tx.order.create({
          data: {
            userId: user.id,
            totalAmount,
            receiptType,
            status: finalStatus,
            createdAt: orderDate,
            items: {
              create: orderItemsData.map(item => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                unitPrice: item.priceAtPurchase,
                discountPct: item.discountPct,
                subtotal: item.priceAtPurchase * item.quantity
              }))
            },
            payment: {
              create: {
                stripePaymentId: stripePayId,
                amount: totalAmount,
                currency: "PEN",
                status: "confirmed",
                method: paymentMethod,
                paidAt: orderDate
              }
            },
            statusHistory: {
              create: finalStatus === "DELIVERED" ? [
                { 
                  fromStatus: null, 
                  toStatus: "REGISTERED", 
                  changedBy: "SYSTEM", 
                  reason: "Pago verificado por Stripe", 
                  createdAt: orderDate 
                },
                { 
                  fromStatus: "REGISTERED", 
                  toStatus: "DELIVERED", 
                  changedBy: "SYSTEM", 
                  reason: "Entregado por simulación", 
                  createdAt: orderDate 
                }
              ] : [
                { 
                  fromStatus: null, 
                  toStatus: "REGISTERED", 
                  changedBy: "SYSTEM", 
                  reason: "Pago verificado por Stripe", 
                  createdAt: orderDate 
                }
              ]
            }
          }
        });

        // Deduct variant stock
        for (const item of orderItemsData) {
          const v = await tx.productVariant.findUnique({ where: { id: item.productVariantId } });
          if (v && v.stock >= item.quantity) {
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: { stock: v.stock - item.quantity }
            });
          }
        }
      });
    }

    console.log("Sales simulation completed successfully!");
  } catch (e) {
    console.error("Sales simulation failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
