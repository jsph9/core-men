import { 
  PrismaClient, Role, ClientType, SeasonStatus, OrderStatus, ReceiptType, 
  PaymentStatus, PaymentMethod, QuoteMacroStatus, ViabilityStatus, 
  ClientFormalizationStatus, CustomerResponseStatus, DesignPlacement, PaymentQuoteStatus, 
  AuditEventType, ErrorSeverity, ErrorLogType 
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seeding COMPLETO de CoreMen (100% Data del PDF)...');

  // ============================================================================
  // LIMPIEZA INICIAL DE LA BASE DE DATOS (Orden seguro para evitar fallos de FK)
  // ============================================================================
  console.log('🧹 Paso 0: Limpiando tablas de la base de datos...');
  
  // Hijos de Cart
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();

  // Hijos de Order
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  // Hijos de Quote
  await prisma.quoteItem.deleteMany();
  await prisma.quoteStatusHistory.deleteMany();
  await prisma.design.deleteMany();
  await prisma.paymentQuote.deleteMany();
  await prisma.quote.deleteMany();

  // Hijos de Product
  await prisma.productImage.deleteMany();
  await prisma.productToTechnique.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  // Marketing y Diccionarios Auxiliares
  await prisma.discountRule.deleteMany();
  await prisma.seasonDiscount.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.errorLog.deleteMany();

  // ============================================================================
  // PASO 1: AUTENTICACIÓN Y USUARIOS
  // ============================================================================
  console.log('👤 Paso 1: Creando Usuarios...');
  const adminHash = await bcrypt.hash('Admin1234!', 10);
  const merchantHash = await bcrypt.hash('Ventas1234!', 10);
  const clientHash = await bcrypt.hash('Cliente1234!', 10);
  const corpHash = await bcrypt.hash('Empresa1234!', 10);

  const admin = await prisma.user.upsert({ where: { email: 'carlos.mendoza@coremen.pe' }, update: {}, create: { firstName: 'Carlos', lastName: 'Mendoza', maternalLastName: 'Ruiz', email: 'carlos.mendoza@coremen.pe', passwordHash: adminHash, role: Role.ADMIN, clientType: ClientType.NATURAL, isActive: true }});
  const merchant = await prisma.user.upsert({ where: { email: 'rquispe@coremen.pe' }, update: {}, create: { firstName: 'Roberto', lastName: 'Quispe', maternalLastName: 'Vega', email: 'rquispe@coremen.pe', passwordHash: merchantHash, role: Role.MERCHANT, clientType: ClientType.NATURAL, whatsappNumber: '51999888777', isActive: true }});
  const client1 = await prisma.user.upsert({ where: { email: 'jchirinos.rojas@gmail.com' }, update: {}, create: { firstName: 'Juan Carlos', lastName: 'Chirinos', maternalLastName: 'Rojas', email: 'jchirinos.rojas@gmail.com', dni: '72001122', passwordHash: clientHash, role: Role.CLIENT, clientType: ClientType.NATURAL, whatsappNumber: '51911222333', isActive: true }});
  const client2 = await prisma.user.upsert({ where: { email: 'compras@textilmodagamarra.com' }, update: {}, create: { firstName: 'María', lastName: 'Fernández', maternalLastName: 'Dávila', email: 'compras@textilmodagamarra.com', businessName: 'Inversiones Textil-Moda Gamarra S.A.C.', ruc: '20123456789', passwordHash: corpHash, role: Role.CLIENT, clientType: ClientType.LEGAL, whatsappNumber: '51944555666', isActive: true }});

  await prisma.passwordResetToken.deleteMany(); // Limpiar tokens viejos (por si acaso)
  await prisma.passwordResetToken.create({ data: { token: 'reset-token-abc-123-xyz', userId: client1.id, expiresAt: new Date(Date.now() - 15 * 60 * 1000) } }); // Expirado a propósito

  // ============================================================================
  // PASO 2: CATÁLOGO BASE (Diccionarios)
  // ============================================================================
  console.log('🏷️ Paso 2: Diccionarios (Categorías, Colores, Tallas, Telas, Técnicas)...');
  
  const categories = ['Polos', 'Poleras', 'Casacas', 'Ropa Deportiva', 'Pantalones y Joggers', 'Gorras y Accesorios'];
  for (const name of categories) await prisma.category.upsert({ where: { name }, update: {}, create: { name } });

  const colors = [
    { n: 'Blanco', h: '#FFFFFF' }, { n: 'Negro', h: '#000000' }, { n: 'Gris Jaspeado', h: '#9CA3AF' }, { n: 'Azul Marino', h: '#1E3A8A' },
    { n: 'Azul Royal', h: '#2563EB' }, { n: 'Celeste', h: '#7DD3FC' }, { n: 'Rojo', h: '#DC2626' }, { n: 'Guinda (Vino)', h: '#7F1D1D' },
    { n: 'Verde Militar', h: '#4D7C0F' }, { n: 'Verde Esmeralda', h: '#10B981' }, { n: 'Amarillo', h: '#FBBF24' }, { n: 'Naranja', h: '#F97316' },
    { n: 'Rosado', h: '#F472B6' }, { n: 'Fucsia', h: '#D946EF' }, { n: 'Morado', h: '#7E22CE' }, { n: 'Turquesa', h: '#06B6D4' },
    { n: 'Beige (Arena)', h: '#F5F5DC' }, { n: 'Marrón', h: '#78350F' }
  ];
  for (const c of colors) { let ex = await prisma.color.findFirst({ where: { name: c.n } }); if (!ex) await prisma.color.create({ data: { name: c.n, hexCode: c.h } }); }

  const sizes = [{ a: 'XS', v: 'Extra Small' }, { a: 'S', v: 'Small' }, { a: 'M', v: 'Medium' }, { a: 'L', v: 'Large' }, { a: 'XL', v: 'Extra Large' }, { a: 'XXL', v: 'Double Extra Large' }, { a: 'XXXL', v: 'Triple Extra Large' }];
  for (const s of sizes) { let ex = await prisma.sizeAttribute.findFirst({ where: { abbreviation: s.a } }); if (!ex) await prisma.sizeAttribute.create({ data: { abbreviation: s.a, value: s.v } }); }

  const fabrics = [{ v: 'Algodón Jersey 20/1', p: 0 }, { v: 'Algodón Jersey 30/1', p: 0 }, { v: 'Algodón Piqué', p: 5 }, { v: 'Algodón Pima Premium', p: 15 }, { v: 'Franela Reactiva (Perchada)', p: 10 }, { v: 'French Terry', p: 8 }, { v: 'Dry Fit / Microfibra', p: 3 }, { v: 'Taslán', p: 6 }, { v: 'Poliéster Spandex', p: 4 }, { v: 'Denim', p: 20 }, { v: 'Taslán (con forro)', p: 6 }, { v: 'Poliéster Spandex (Malla)', p: 4 }, { v: 'Algodón Piqué (Drill)', p: 5 }];
  for (const f of fabrics) { let ex = await prisma.fabricAttribute.findFirst({ where: { value: f.v } }); if (!ex) await prisma.fabricAttribute.create({ data: { value: f.v, price: f.p } }); }

  const techs = [
    { n: 'DTF', r: 'POR_AREA_IMPRESION', min: 5.0, max: 25.0 }, { n: 'Serigrafía', r: 'POR_CANTIDAD_COLORES', min: 1.5, max: 8.0 },
    { n: 'Bordado', r: 'POR_NUMERO_PUNTADAS', min: 3.0, max: 35.0 }, { n: 'Sublimación', r: 'POR_TAMAÑO_PLANCHA', min: 3.0, max: 15.0 },
    { n: 'Vinil Textil', r: 'POR_AREA_CORTE', min: 4.0, max: 20.0 }
  ];
  for (const t of techs) await prisma.technique.upsert({ where: { name: t.n }, update: {}, create: { name: t.n, ruleType: t.r, minValue: t.min, maxValue: t.max } });

  // Mapas de memoria para relaciones rápidas
  const dbCats = await prisma.category.findMany(); const dbFabs = await prisma.fabricAttribute.findMany(); const dbTechs = await prisma.technique.findMany();
  const dbSizes = await prisma.sizeAttribute.findMany(); const dbColors = await prisma.color.findMany();
  const getId = (arr: any[], key: string, val: string) => arr.find(x => x[key] === val)?.id;

  // ============================================================================
  // PASO 3: LOS 20 PRODUCTOS CON SUS VARIANTES Y TÉCNICAS
  // ============================================================================
  console.log('👕 Paso 3: Generando los 21 Productos Exactos del PDF...');
  
  const productsData = [
    { n: 'Polo Básico Cuello Redondo 20/1', c: 'Polos', f: 'Algodón Jersey 20/1', p: 20, comp: '100% Algodón', g: 'TIPO A',
      t: [{n: 'DTF', p: 8}, {n: 'Serigrafía', p: 2.5}, {n: 'Bordado', p: 12}, {n: 'Vinil Textil', p: 6}],
      v: [{c: 'Blanco', s: ['S','M','L'], stk: 100}, {c: 'Negro', s: ['S','M','L'], stk: 100}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-basico-cuello-redondo-20-1-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-basico-cuello-redondo-20-1-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-basico-cuello-redondo-20-1-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-basico-cuello-redondo-20-1-right.png'
      ] },
    { n: 'Polo Cuello Camisero (Piqué)', c: 'Polos', f: 'Algodón Piqué', p: 35, comp: '100% Algodón', g: 'TIPO A',
      t: [{n: 'Bordado', p: 8}, {n: 'DTF', p: 10}],
      v: [{c: 'Azul Marino', s: ['M','L'], stk: 50}, {c: 'Rojo', s: ['M','L'], stk: 30}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-cuello-camisero-pique-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-cuello-camisero-pique-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-cuello-camisero-pique-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-cuello-camisero-pique-right.png'
      ] },
    { n: 'Polo Deportivo Dry Fit', c: 'Ropa Deportiva', f: 'Dry Fit / Microfibra', p: 18, comp: '100% Poliéster', g: 'TIPO A',
      t: [{n: 'Sublimación', p: 12}, {n: 'Vinil Textil', p: 5}],
      v: [{c: 'Blanco', s: ['M','L'], stk: 200}, {c: 'Celeste', s: ['M','L'], stk: 100}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-deportivo-dry-fit-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-deportivo-dry-fit-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-deportivo-dry-fit-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-deportivo-dry-fit-right.png'
      ] },
    { n: 'Polera con Capucha (Hoodie)', c: 'Poleras', f: 'Franela Reactiva (Perchada)', p: 55, comp: '70% Algodón, 30% Poliéster', g: 'TIPO B',
      t: [{n: 'DTF', p: 18}, {n: 'Bordado', p: 25}, {n: 'Serigrafía', p: 5}],
      v: [{c: 'Negro', s: ['M','L','XL'], stk: 80}, {c: 'Gris Jaspeado', s: ['M','L','XL'], stk: 40}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-capucha-hoodie-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-capucha-hoodie-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-capucha-hoodie-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-capucha-hoodie-right.png'
      ] },
    { n: 'Polera Cuello Redondo (Crewneck)', c: 'Poleras', f: 'French Terry', p: 45, comp: '100% Algodón', g: 'TIPO B',
      t: [{n: 'DTF', p: 15}, {n: 'Vinil Textil', p: 10}, {n: 'Bordado', p: 15}],
      v: [{c: 'Azul Royal', s: ['M','L','XL'], stk: 50}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-cuello-redondo-crewneck-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-cuello-redondo-crewneck-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-cuello-redondo-crewneck-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-cuello-redondo-crewneck-right.png'
      ] },
    { n: 'Casaca Cortavientos', c: 'Casacas', f: 'Taslán', p: 65, comp: '100% Nylon/Poliéster', g: 'TIPO C',
      t: [{n: 'Vinil Textil', p: 8}, {n: 'Bordado', p: 18}],
      v: [{c: 'Negro', s: ['M','L'], stk: 30}, {c: 'Azul Marino', s: ['M','L'], stk: 20}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-cortavientos-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-cortavientos-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-cortavientos-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-cortavientos-right.png'
      ] },
    { n: 'Casaca Bomber', c: 'Casacas', f: 'Taslán (con forro)', p: 85, comp: '100% Poliéster', g: 'TIPO C',
      t: [{n: 'Bordado', p: 22}, {n: 'Vinil Textil', p: 12}],
      v: [{c: 'Verde Militar', s: ['M','L','XL'], stk: 25}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-bomber-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-bomber-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-bomber-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-bomber-right.png'
      ] },
    { n: 'Jogger de Franela', c: 'Pantalones y Joggers', f: 'Franela Reactiva (Perchada)', p: 40, comp: '100% Algodón', g: 'TIPO D',
      t: [{n: 'DTF', p: 6}, {n: 'Serigrafía', p: 2}],
      v: [{c: 'Gris Jaspeado', s: ['S','M','L'], stk: 60}, {c: 'Negro', s: ['S'], stk: 0}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/jogger-de-franela-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/jogger-de-franela-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/jogger-de-franela-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/jogger-de-franela-right.png'
      ] },
    { n: 'Short Deportivo', c: 'Ropa Deportiva', f: 'Taslán', p: 25, comp: '100% Poliéster', g: 'TIPO D',
      t: [{n: 'Vinil Textil', p: 4}, {n: 'Sublimación', p: 5}],
      v: [{c: 'Negro', s: ['M','L'], stk: 100}, {c: 'Azul Marino', s: ['M','L'], stk: 50}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/short-deportivo-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/short-deportivo-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/short-deportivo-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/short-deportivo-right.png'
      ] },
    { n: 'Gorra Trucker (Malla)', c: 'Gorras y Accesorios', f: 'Poliéster Spandex (Malla)', p: 15, comp: 'Frontal Poliéster / Malla Nylon', g: 'TIPO A',
      t: [{n: 'Sublimación', p: 4}, {n: 'DTF', p: 5}],
      v: [{c: 'Blanco', s: ['M'], stk: 300}, {c: 'Negro', s: ['M'], stk: 200}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-trucker-malla-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-trucker-malla-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-trucker-malla-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-trucker-malla-right.png'
      ] },
    { n: 'Polo Oversize Urbano', c: 'Polos', f: 'Algodón Jersey 30/1', p: 30, comp: '100% Algodón Peinado', g: 'TIPO A',
      t: [{n: 'DTF', p: 15}, {n: 'Serigrafía', p: 4}],
      v: [{c: 'Beige (Arena)', s: ['M','L','XL'], stk: 40}, {c: 'Negro', s: ['M','L','XL'], stk: 70}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-oversize-urbano-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-oversize-urbano-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-oversize-urbano-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-oversize-urbano-right.png'
      ] },
    { n: 'Polo Crop Top Mujer', c: 'Polos', f: 'Algodón Jersey 20/1', p: 18, comp: '100% Algodón', g: 'TIPO A',
      t: [{n: 'DTF', p: 7}, {n: 'Bordado', p: 10}],
      v: [{c: 'Blanco', s: ['S','M'], stk: 80}, {c: 'Fucsia', s: ['S','M'], stk: 60}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-crop-top-mujer-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-crop-top-mujer-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-crop-top-mujer-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-crop-top-mujer-right.png'
      ] },
    { n: 'Polera con Cierre (Zip-up)', c: 'Poleras', f: 'French Terry', p: 60, comp: '100% Algodón', g: 'TIPO B',
      t: [{n: 'Bordado', p: 12}, {n: 'DTF', p: 18}],
      v: [{c: 'Gris Jaspeado', s: ['M','L'], stk: 40}, {c: 'Azul Marino', s: ['M','L'], stk: 30}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-cierre-zip-up-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-cierre-zip-up-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-cierre-zip-up-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-con-cierre-zip-up-right.png'
      ] },
    { n: 'Casaca Denim (Jean)', c: 'Casacas', f: 'Denim', p: 95, comp: '100% Algodón', g: 'TIPO C',
      t: [{n: 'Bordado', p: 30}, {n: 'DTF', p: 20}],
      v: [{c: 'Celeste', s: ['M','L','XL'], stk: 20}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-denim-jean-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-denim-jean-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-denim-jean-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/casaca-denim-jean-right.png'
      ] },
    { n: 'Polo Manga Larga', c: 'Polos', f: 'Algodón Jersey 20/1', p: 25, comp: '100% Algodón', g: 'TIPO B',
      t: [{n: 'Serigrafía', p: 3.5}, {n: 'DTF', p: 12}],
      v: [{c: 'Negro', s: ['M','L'], stk: 90}, {c: 'Blanco', s: ['M','L'], stk: 80}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-manga-larga-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-manga-larga-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-manga-larga-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polo-manga-larga-right.png'
      ] },
    { n: 'Bividí Deportivo', c: 'Ropa Deportiva', f: 'Dry Fit / Microfibra', p: 15, comp: '100% Poliéster', g: 'TIPO A',
      t: [{n: 'Sublimación', p: 6}, {n: 'Vinil Textil', p: 4}],
      v: [{c: 'Rojo', s: ['S','M','L'], stk: 150}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/bividi-deportivo-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/bividi-deportivo-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/bividi-deportivo-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/bividi-deportivo-right.png'
      ] },
    { n: 'Pantalón Cargo', c: 'Pantalones y Joggers', f: 'Taslán', p: 50, comp: '100% Poliéster', g: 'TIPO D',
      t: [{n: 'Bordado', p: 10}, {n: 'DTF', p: 8}],
      v: [{c: 'Verde Militar', s: ['M','L'], stk: 40}, {c: 'Negro', s: ['M','L'], stk: 50}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/pantalon-cargo-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/pantalon-cargo-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/pantalon-cargo-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/pantalon-cargo-right.png'
      ] },
    { n: 'Polera Crop Mujer', c: 'Poleras', f: 'Franela Reactiva (Perchada)', p: 45, comp: '100% Algodón', g: 'TIPO B',
      t: [{n: 'DTF', p: 9}, {n: 'Bordado', p: 12}],
      v: [{c: 'Rosado', s: ['S','M'], stk: 30}, {c: 'Turquesa', s: ['S','M'], stk: 20}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-crop-mujer-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-crop-mujer-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-crop-mujer-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/polera-crop-mujer-right.png'
      ] },
    { n: 'Gorra Drill Básica', c: 'Gorras y Accesorios', f: 'Algodón Piqué (Drill)', p: 18, comp: '100% Algodón', g: 'TIPO A',
      t: [{n: 'Bordado', p: 8}, {n: 'DTF', p: 6}],
      v: [{c: 'Negro', s: ['M'], stk: 120}, {c: 'Azul Marino', s: ['M'], stk: 90}, {c: 'Rojo', s: ['M'], stk: 60}, {c: 'Blanco', s: ['M'], stk: 50}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-drill-basica-front.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-drill-basica-back.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-drill-basica-left.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/gorra-drill-basica-right.png'
      ] },
    { n: 'Polo Camisero con Aberturas', c: 'Polos', f: 'Algodón Jersey 30/1', p: 22, comp: '100% Algodón', g: 'TIPO A',
      t: [{n: 'DTF', p: 8}, {n: 'Serigrafía', p: 2.5}],
      v: [{c: 'Blanco', s: ['S','M','L'], stk: 100}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782055279801-777068400.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782055281183-250990858.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782055281537-448338553.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782055281744-767486717.png'
      ] },
    { id: 'dc6d8150-864e-4739-9328-4c12d5a7bec2', n: 'Polo Camisero Clásico', c: 'Polos', f: 'Algodón Piqué', p: 35, comp: '100% Algodón', g: 'TIPO A',
      t: [{n: 'Bordado', p: 8}, {n: 'DTF', p: 10}],
      v: [{c: 'Negro', s: ['S','M','L','XL'], stk: 80}],
      imgs: [
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782015998161-631224673.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782015998163-256816625.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782015998163-362873642.png',
        'https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/catalogo-coremen/1782015998164-848136159.png'
      ] }
  ];

  for (const p of productsData as any[]) {
    const prod = await prisma.product.create({
      data: {
        ...(p.id ? { id: p.id } : {}),
        name: p.n, basePrice: p.p, fiberComposition: p.comp, sizeGuideText: p.g, careInstructions: 'Lavar según etiqueta',
        categoryId: getId(dbCats, 'name', p.c)!, fabricId: getId(dbFabs, 'value', p.f)!,
        images: {
          create: p.imgs.map((url: string, index: number) => ({
            url,
            isPrimary: index === 0
          }))
        }
      }
    });

    for (const t of p.t) {
      await prisma.productToTechnique.create({ data: { productId: prod.id, techniqueId: getId(dbTechs, 'name', t.n)!, specificPrice: t.p } });
    }

    for (const v of p.v) {
      for (const s of v.s) {
        await prisma.productVariant.create({ data: { productId: prod.id, colorId: getId(dbColors, 'name', v.c)!, sizeId: getId(dbSizes, 'abbreviation', s)!, stock: v.stk } });
      }
    }
  }

  // ============================================================================
  // PASO 4: REGLAS DE DESCUENTO Y TEMPORADA
  // ============================================================================
  console.log('💰 Paso 4: Marketing y Campañas...');
  await prisma.discountRule.createMany({ data: [
    { minQuantity: 12, maxQuantity: 24, percentage: 3.00, description: 'Descuento por docena - Nivel 1' },
    { minQuantity: 25, maxQuantity: 49, percentage: 5.00, description: 'Descuento mayorista - Nivel 2' },
    { minQuantity: 50, maxQuantity: 99, percentage: 8.00, description: 'Descuento por media centena - Nivel 3' },
    { minQuantity: 100, maxQuantity: null, percentage: 12.00, description: 'Descuento por centena o más - Nivel Distribuidor' }
  ]});

  await prisma.seasonDiscount.createMany({ data: [
    { name: 'Promo Día del Padre 2026', startDate: new Date('2026-06-15T00:00:00Z'), endDate: new Date('2026-06-21T23:59:59Z'), percentage: 10.00, isAccumulative: false, status: SeasonStatus.ACTIVE, appliesTo: ["Polos", "Casacas", "Gorras y Accesorios"] },
    { name: 'Campaña Fiestas Patrias 2026', startDate: new Date('2026-07-15T00:00:00Z'), endDate: new Date('2026-07-31T23:59:59Z'), percentage: 15.00, isAccumulative: true, status: SeasonStatus.SCHEDULED, appliesTo: [] },
    { name: 'Liquidación Final de Verano', startDate: new Date('2026-03-01T00:00:00Z'), endDate: new Date('2026-03-15T23:59:59Z'), percentage: 20.00, isAccumulative: false, status: SeasonStatus.EXPIRED, appliesTo: ["Polos", "Pantalones y Joggers"] }
  ]});

  // ============================================================================
  // UTILIDAD: OBTENER VARIANTES EXACTAS PARA PEDIDOS/COTIZACIONES
  // ============================================================================
  const getVariant = async (pName: string, cName: string, sAbbr: string) => {
    const v = await prisma.productVariant.findFirst({
      where: { product: { name: pName }, color: { name: cName }, size: { abbreviation: sAbbr } }
    });
    return v!.id;
  };

  // ============================================================================
  // PASO 5: E-COMMERCE TRADICIONAL
  // ============================================================================
  console.log('🛒 Paso 5: Carritos y Pedidos Directos...');
  
  await prisma.cart.create({ data: { userId: client1.id } }); // Carrito 1 Vacío
  const cart2 = await prisma.cart.create({ data: { userId: client2.id } }); // Carrito 2 Activo
  await prisma.cartItem.createMany({ data: [
    { cartId: cart2.id, productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Blanco', 'L'), quantity: 10 },
    { cartId: cart2.id, productVariantId: await getVariant('Gorra Drill Básica', 'Negro', 'M'), quantity: 5 }
  ]});

  // Pedido 1.1 (Entregado - Cliente 1)
  const o1 = await prisma.order.create({
    data: {
      userId: client1.id, status: OrderStatus.DELIVERED, totalAmount: 35.00, receiptType: ReceiptType.BOLETA,
      items: { create: [{ productVariantId: await getVariant('Polo Cuello Camisero (Piqué)', 'Rojo', 'M'), quantity: 1, unitPrice: 35.00, subtotal: 35.00 }] },
      payment: { create: { stripePaymentId: 'pay_yape_01', amount: 35.00, status: PaymentStatus.CONFIRMED, method: PaymentMethod.YAPE } },
      statusHistory: { create: [{ toStatus: OrderStatus.REGISTERED, changedBy: client1.id }, { toStatus: OrderStatus.IN_PREPARATION, changedBy: merchant.id, reason: 'Pedido validado, separando de almacén.' }, { toStatus: OrderStatus.DELIVERED, changedBy: merchant.id, reason: 'Entregado presencialmente en tienda.' }]}
    }
  });

  // Pedido 1.2 (En Proceso - Cliente 1)
  await prisma.order.create({
    data: {
      userId: client1.id, status: OrderStatus.READY_FOR_PICKUP, totalAmount: 95.00, receiptType: ReceiptType.BOLETA,
      items: { create: [{ productVariantId: await getVariant('Casaca Denim (Jean)', 'Celeste', 'M'), quantity: 1, unitPrice: 95.00, subtotal: 95.00 }] },
      payment: { create: { stripePaymentId: 'pay_card_01', amount: 95.00, status: PaymentStatus.CONFIRMED, method: PaymentMethod.CARD } },
      statusHistory: { create: [{ toStatus: OrderStatus.REGISTERED, changedBy: client1.id }, { toStatus: OrderStatus.IN_PREPARATION, changedBy: 'Sistema', reason: 'Pago confirmado vía Stripe.' }, { toStatus: OrderStatus.READY_FOR_PICKUP, changedBy: merchant.id, reason: 'Casaca empaquetada. Esperando al cliente en el local.' }]}
    }
  });

  // Pedido 1.3 (Cancelado - Cliente 1)
  await prisma.order.create({
    data: {
      userId: client1.id, status: OrderStatus.CANCELLED, totalAmount: 45.00, receiptType: ReceiptType.BOLETA, cancelReason: 'Expiró el tiempo de espera para la transferencia bancaria (48 hrs).',
      items: { create: [{ productVariantId: await getVariant('Polera Crop Mujer', 'Rosado', 'M'), quantity: 1, unitPrice: 45.00, subtotal: 45.00 }] },
      payment: { create: { stripePaymentId: 'pay_transf_01', amount: 45.00, status: PaymentStatus.FAILED, method: PaymentMethod.TRANSFER } },
      statusHistory: { create: [{ toStatus: OrderStatus.REGISTERED, changedBy: client1.id }, { toStatus: OrderStatus.CANCELLED, changedBy: 'Sistema', reason: 'Cancelación automática por tiempo de pago expirado.' }]}
    }
  });

  // Pedido 2.1 (Entregado - Cliente 2)
  await prisma.order.create({
    data: {
      userId: client2.id, status: OrderStatus.DELIVERED, totalAmount: 300.00, receiptType: ReceiptType.FACTURA,
      items: { create: [{ productVariantId: await getVariant('Gorra Trucker (Malla)', 'Blanco', 'M'), quantity: 20, unitPrice: 15.00, subtotal: 300.00 }] },
      payment: { create: { stripePaymentId: 'pay_transf_02', amount: 300.00, status: PaymentStatus.CONFIRMED, method: PaymentMethod.TRANSFER } },
      statusHistory: { create: [{ toStatus: OrderStatus.REGISTERED, changedBy: client2.id }, { toStatus: OrderStatus.IN_PREPARATION, changedBy: merchant.id, reason: 'Voucher validado. Embalando caja.' }, { toStatus: OrderStatus.READY_FOR_PICKUP, changedBy: merchant.id }, { toStatus: OrderStatus.DELIVERED, changedBy: merchant.id, reason: 'Despachado con motorizado.' }]}
    }
  });

  // Pedido 2.2 (Lote en preparación - Cliente 2)
  await prisma.order.create({
    data: {
      userId: client2.id, status: OrderStatus.IN_PREPARATION, totalAmount: 250.00, receiptType: ReceiptType.FACTURA,
      items: { create: [{ productVariantId: await getVariant('Pantalón Cargo', 'Verde Militar', 'L'), quantity: 5, unitPrice: 50.00, subtotal: 250.00 }] },
      payment: { create: { stripePaymentId: 'pay_yape_02', amount: 250.00, status: PaymentStatus.CONFIRMED, method: PaymentMethod.YAPE } },
      statusHistory: { create: [{ toStatus: OrderStatus.REGISTERED, changedBy: client2.id }, { toStatus: OrderStatus.IN_PREPARATION, changedBy: merchant.id, reason: 'Confirmación de Yape recibida. Planchando pantalones.' }]}
    }
  });

  // ============================================================================
  // PASO 6: B2B Y COTIZACIONES
  // ============================================================================
  console.log('🎨 Paso 6: Generando las 4 Cotizaciones B2B...');

  // Cotización 1.1 (Viable/Producción)
  await prisma.quote.create({
    data: {
      clientId: client1.id, totalQuantity: 15, message: 'Necesito polos blancos y negros con mi logo en el pecho...', isVisited: true, viabilityStatus: ViabilityStatus.VIABLE, clientFormalizationStatus: ClientFormalizationStatus.CONFIRMED, customerResponseStatus: CustomerResponseStatus.CONFIRMED, status: QuoteMacroStatus.IN_PRODUCTION, estimatedPrice: 250.00, finalPrice: 250.00,
      items: { create: [
        { productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Blanco', 'S'), quantity: 5 },
        { productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Blanco', 'M'), quantity: 5 },
        { productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Negro', 'L'), quantity: 5 }
      ]},
      designs: { create: [{ placement: DesignPlacement.FRONT, techniqueId: getId(dbTechs, 'name', 'DTF')!, baseGarmentUrl: '/polo_front.png', logoUrl: '/logo1.png', positionX: 45, positionY: 30, width: 10, height: 10, rotation: 0, canvasWidth: 500, canvasHeight: 500 }, { placement: DesignPlacement.BACK, techniqueId: getId(dbTechs, 'name', 'DTF')!, baseGarmentUrl: '/polo_back.png', logoUrl: '/logo2.png', positionX: 50, positionY: 50, width: 28, height: 28, rotation: 0, canvasWidth: 500, canvasHeight: 500 }]},
      payments: { create: [{ totalFinalAmount: 250.00, amountToPay: 250.00, status: PaymentQuoteStatus.FULL_PAYMENT, amountPaid: 250.00, paymentMethod: PaymentMethod.YAPE }]},
      statusHistory: { create: [{ changedField: 'STATUS', newValue: 'PENDING', changedBy: client1.id }, { changedField: 'VIABILITY', oldValue: 'PENDING', newValue: 'VIABLE', changedBy: admin.id, note: 'DTF permite desde 1 unidad' }, { changedField: 'STATUS', oldValue: 'PENDING', newValue: 'IN_REVIEW', changedBy: admin.id }, { changedField: 'FORMALIZATION', oldValue: 'PENDING', newValue: 'UPDATED', changedBy: admin.id }, { changedField: 'FORMALIZATION', oldValue: 'UPDATED', newValue: 'CONFIRMED', changedBy: client1.id }, { changedField: 'STATUS', oldValue: 'IN_REVIEW', newValue: 'WAITING_PAYMENT', changedBy: 'Sistema' }, { changedField: 'STATUS', oldValue: 'WAITING_PAYMENT', newValue: 'IN_PRODUCTION', changedBy: 'Sistema' }]}
    }
  });

  // Cotización 1.2 (Inviable)
  await prisma.quote.create({
    data: {
      clientId: client1.id, totalQuantity: 2, message: 'Quiero 2 casacas bordadas con mi nombre.', isVisited: true, viabilityStatus: ViabilityStatus.NONVIABLE, clientFormalizationStatus: ClientFormalizationStatus.REJECTED, customerResponseStatus: CustomerResponseStatus.PENDING, status: QuoteMacroStatus.CANCELLED, unfeasibleReason: 'El bordado requiere un mínimo de 12 unidades por el costo de matriz.', estimatedPrice: 150.00,
      items: { create: [{ productVariantId: await getVariant('Casaca Bomber', 'Verde Militar', 'L'), quantity: 2 }] },
      designs: { create: [{ placement: DesignPlacement.FRONT, techniqueId: getId(dbTechs, 'name', 'Bordado')!, baseGarmentUrl: '/bomber.png', logoUrl: '/name.png', positionX: 30, positionY: 30, width: 8, height: 4, rotation: 0, canvasWidth: 500, canvasHeight: 500 }]},
      statusHistory: { create: [{ changedField: 'STATUS', newValue: 'PENDING', changedBy: client1.id }, { changedField: 'VIABILITY', oldValue: 'PENDING', newValue: 'NONVIABLE', changedBy: merchant.id }, { changedField: 'FORMALIZATION', oldValue: 'PENDING', newValue: 'REJECTED', changedBy: 'Sistema' }, { changedField: 'STATUS', oldValue: 'PENDING', newValue: 'CANCELLED', changedBy: 'Sistema' }]}
    }
  });

  // Cotización 2.1 (Corporativa Entregada)
  await prisma.quote.create({
    data: {
      clientId: client2.id, totalQuantity: 100, message: 'Polos piqué institucionales para los supervisores.', isVisited: true, viabilityStatus: ViabilityStatus.VIABLE, clientFormalizationStatus: ClientFormalizationStatus.CONFIRMED, customerResponseStatus: CustomerResponseStatus.CONFIRMED, status: QuoteMacroStatus.DELIVERED, estimatedPrice: 4300.00, finalPrice: 4300.00,
      items: { create: [{ productVariantId: await getVariant('Polo Cuello Camisero (Piqué)', 'Azul Marino', 'M'), quantity: 50 }, { productVariantId: await getVariant('Polo Cuello Camisero (Piqué)', 'Azul Marino', 'L'), quantity: 50 }] },
      designs: { create: [{ placement: DesignPlacement.FRONT, techniqueId: getId(dbTechs, 'name', 'Bordado')!, baseGarmentUrl: '/front.png', logoUrl: '/logo.png', positionX: 45, positionY: 35, width: 8, height: 8, rotation: 0, canvasWidth: 500, canvasHeight: 500 }, { placement: DesignPlacement.LEFTSLEEVE, techniqueId: getId(dbTechs, 'name', 'Bordado')!, baseGarmentUrl: '/sL.png', logoUrl: '/l.png', positionX: 50, positionY: 50, width: 5, height: 5, rotation: 0, canvasWidth: 500, canvasHeight: 500 }, { placement: DesignPlacement.RIGHTSLEEVE, techniqueId: getId(dbTechs, 'name', 'Bordado')!, baseGarmentUrl: '/sR.png', logoUrl: '/r.png', positionX: 50, positionY: 50, width: 5, height: 5, rotation: 0, canvasWidth: 500, canvasHeight: 500 }]},
      payments: { create: [{ totalFinalAmount: 4300.00, amountToPay: 4300.00, status: PaymentQuoteStatus.FAILED, amountPaid: 0, paymentMethod: PaymentMethod.CARD }, { totalFinalAmount: 4300.00, amountToPay: 4300.00, status: PaymentQuoteStatus.FULL_PAYMENT, amountPaid: 4300.00, paymentMethod: PaymentMethod.TRANSFER }]},
      statusHistory: { create: [{ changedField: 'STATUS', newValue: 'DELIVERED', changedBy: merchant.id }]}
    }
  });

  // Cotización 2.2 (WhatsApp Activa - Ahora en estado VIABLE y PENDING)
  await prisma.quote.create({
    data: {
      id: "c28fd975-b6b1-4e0c-8c90-ed7581a806a6", // ID fijo con prefijo C28FD9
      clientId: client2.id, totalQuantity: 200, message: 'Necesitamos poleras para campaña de invierno. ¿Si llevamos 200 nos mejoran el precio del DTF?', isVisited: true, viabilityStatus: ViabilityStatus.VIABLE, customerResponseStatus: CustomerResponseStatus.PENDING, status: QuoteMacroStatus.IN_REVIEW, estimatedPrice: 11000.00,
      items: { create: [{ productVariantId: await getVariant('Polera con Capucha (Hoodie)', 'Negro', 'L'), quantity: 100 }, { productVariantId: await getVariant('Polera con Capucha (Hoodie)', 'Gris Jaspeado', 'XL'), quantity: 100 }] },
      designs: { create: [{ placement: DesignPlacement.FRONT, techniqueId: getId(dbTechs, 'name', 'Bordado')!, baseGarmentUrl: '/f.png', logoUrl: '/l1.png', positionX: 40, positionY: 40, width: 5, height: 5, rotation: 0, canvasWidth: 500, canvasHeight: 500 }, { placement: DesignPlacement.BACK, techniqueId: getId(dbTechs, 'name', 'DTF')!, baseGarmentUrl: '/b.png', logoUrl: '/l2.png', positionX: 50, positionY: 50, width: 30, height: 30, rotation: 0, canvasWidth: 500, canvasHeight: 500 }]},
      statusHistory: { create: [{ changedField: 'STATUS', newValue: 'PENDING', changedBy: client2.id }, { changedField: 'VIABILITY', oldValue: 'PENDING', newValue: 'VIABLE', changedBy: admin.id }]}
    }
  });

  // Cotización 2.3 (Nueva - Sin Visitar)
  await prisma.quote.create({
    data: {
      clientId: client1.id,
      totalQuantity: 25,
      message: 'Cotización para 25 polos básicos con logo frontal.',
      isVisited: false,
      status: QuoteMacroStatus.PENDING,
      viabilityStatus: ViabilityStatus.PENDING,
      customerResponseStatus: CustomerResponseStatus.PENDING,
      clientFormalizationStatus: ClientFormalizationStatus.PENDING,
      estimatedPrice: 375.00,
      items: {
        create: [
          { productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Blanco', 'M'), quantity: 15 },
          { productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Blanco', 'L'), quantity: 10 }
        ]
      },
      designs: {
        create: [
          {
            placement: DesignPlacement.FRONT,
            techniqueId: getId(dbTechs, 'name', 'DTF')!,
            baseGarmentUrl: '/sport_front.png',
            logoUrl: '/crest.png',
            positionX: 45,
            positionY: 25,
            width: 12,
            height: 12,
            rotation: 0,
            canvasWidth: 500,
            canvasHeight: 500
          },
          {
            placement: DesignPlacement.BACK,
            techniqueId: getId(dbTechs, 'name', 'DTF')!,
            baseGarmentUrl: '/sport_back.png',
            logoUrl: '/number.png',
            positionX: 50,
            positionY: 45,
            width: 25,
            height: 15,
            rotation: 0,
            canvasWidth: 500,
            canvasHeight: 500
          }
        ]
      },
      statusHistory: {
        create: [
          {
            changedField: 'STATUS',
            newValue: 'PENDING',
            changedBy: client1.id
          }
        ]
      }
    }
  });

  // Cotización 2.4 (Inviable Activa - Pendiente de respuesta/Negociación)
  await prisma.quote.create({
    data: {
      clientId: client2.id, 
      totalQuantity: 50, 
      message: 'Necesito 50 polos deportivos estampados en el pecho y en la espalda.', 
      isVisited: true,
      status: QuoteMacroStatus.IN_REVIEW,
      viabilityStatus: ViabilityStatus.NONVIABLE,
      customerResponseStatus: CustomerResponseStatus.PENDING,
      clientFormalizationStatus: ClientFormalizationStatus.PENDING,
      unfeasibleReason: 'El diseño enviado para la espalda tiene trazos demasiado delgados para la técnica de serigrafía en la talla S.',
      estimatedPrice: 850.00,
      items: { 
        create: [
          { productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Blanco', 'S'), quantity: 20 },
          { productVariantId: await getVariant('Polo Básico Cuello Redondo 20/1', 'Blanco', 'M'), quantity: 30 }
        ] 
      },
      designs: { 
        create: [
          { 
            placement: DesignPlacement.FRONT, 
            techniqueId: getId(dbTechs, 'name', 'DTF')!, 
            baseGarmentUrl: '/sport_front.png', 
            logoUrl: '/crest.png', 
            positionX: 45, 
            positionY: 25, 
            width: 10, 
            height: 10, 
            rotation: 0, 
            canvasWidth: 500, 
            canvasHeight: 500 
          },
          { 
            placement: DesignPlacement.BACK, 
            techniqueId: getId(dbTechs, 'name', 'Serigrafía')!, 
            baseGarmentUrl: '/sport_back.png', 
            logoUrl: '/back_print.png', 
            positionX: 50, 
            positionY: 40, 
            width: 35, 
            height: 35, 
            rotation: 0, 
            canvasWidth: 500, 
            canvasHeight: 500 
          }
        ]
      },
      statusHistory: { 
        create: [
          { 
            changedField: 'STATUS', 
            newValue: 'PENDING', 
            changedBy: client2.id 
          },
          { 
            changedField: 'STATUS', 
            oldValue: 'PENDING', 
            newValue: 'IN_REVIEW', 
            changedBy: merchant.id 
          },
          { 
            changedField: 'VIABILITY', 
            oldValue: 'PENDING', 
            newValue: 'NONVIABLE', 
            changedBy: merchant.id, 
            note: 'El diseño enviado para la espalda tiene trazos demasiado delgados...' 
          }
        ]
      }
    }
  });

  // Cotización 2.5 (Inviable y En Negociación)
  await prisma.quote.create({
    data: {
      clientId: client2.id, 
      totalQuantity: 120, 
      message: 'Cotización para casacas universitarias con bordado grande en la espalda.', 
      isVisited: true,
      status: QuoteMacroStatus.IN_REVIEW,
      viabilityStatus: ViabilityStatus.NONVIABLE,
      customerResponseStatus: CustomerResponseStatus.IN_NEGOTIATION,
      clientFormalizationStatus: ClientFormalizationStatus.PENDING,
      unfeasibleReason: 'El bordado solicitado para la espalda excede las dimensiones máximas de la matriz de la máquina bordadora industrial para casacas.',
      estimatedPrice: 6500.00,
      items: { 
        create: [
          { productVariantId: await getVariant('Casaca Bomber', 'Verde Militar', 'M'), quantity: 40 },
          { productVariantId: await getVariant('Casaca Bomber', 'Verde Militar', 'L'), quantity: 50 },
          { productVariantId: await getVariant('Casaca Bomber', 'Verde Militar', 'XL'), quantity: 30 }
        ] 
      },
      designs: { 
        create: [
          { 
            placement: DesignPlacement.BACK, 
            techniqueId: getId(dbTechs, 'name', 'Bordado')!, 
            baseGarmentUrl: '/bomber_back.png', 
            logoUrl: '/college_crest.png', 
            positionX: 50, 
            positionY: 35, 
            width: 32, 
            height: 32, 
            rotation: 0, 
            canvasWidth: 500, 
            canvasHeight: 500 
          }
        ]
      },
      statusHistory: { 
        create: [
          { 
            changedField: 'STATUS', 
            newValue: 'PENDING', 
            changedBy: client2.id 
          },
          { 
            changedField: 'STATUS', 
            oldValue: 'PENDING', 
            newValue: 'IN_REVIEW', 
            changedBy: merchant.id 
          },
          { 
            changedField: 'VIABILITY', 
            oldValue: 'PENDING', 
            newValue: 'NONVIABLE', 
            changedBy: merchant.id, 
            note: 'El bordado solicitado para la espalda excede las dimensiones...' 
          },
          { 
            changedField: 'FORMALIZATION', 
            oldValue: 'PENDING', 
            newValue: 'IN_NEGOTIATION', 
            changedBy: merchant.id 
          }
        ]
      }
    }
  });

  // Cotización 2.6 (Polo Camisero Negro Clásico - Pendiente Sin Visitar)
  await prisma.quote.create({
    data: {
      clientId: client1.id, 
      totalQuantity: 10, 
      message: 'Cotización para 10 polos camiseros negros clásicos.', 
      isVisited: false,
      status: QuoteMacroStatus.PENDING,
      viabilityStatus: ViabilityStatus.PENDING,
      customerResponseStatus: CustomerResponseStatus.PENDING,
      clientFormalizationStatus: ClientFormalizationStatus.PENDING,
      estimatedPrice: 350.00,
      items: { 
        create: [
          { productVariantId: await getVariant('Polo Camisero Clásico', 'Negro', 'M'), quantity: 10 }
        ] 
      },
      designs: { 
        create: [
          { 
            placement: DesignPlacement.FRONT, 
            techniqueId: getId(dbTechs, 'name', 'Bordado')!, 
            baseGarmentUrl: '/polo_front.png', 
            logoUrl: '/logo1.png', 
            positionX: 45, 
            positionY: 30, 
            width: 10, 
            height: 10, 
            rotation: 0, 
            canvasWidth: 500, 
            canvasHeight: 500 
          }
        ]
      },
      statusHistory: { 
        create: [
          { 
            changedField: 'STATUS', 
            newValue: 'PENDING', 
            changedBy: client1.id 
          }
        ]
      }
    }
  });

  // ============================================================================
  // PASO 7: AUDITORÍA Y LOS 4 ERRORES
  // ============================================================================
  console.log('🛡️ Paso 7: Consola Técnica y Todos los Errores...');

  await prisma.auditLog.createMany({ data: [
    { type: AuditEventType.PRICE_CHANGE, userId: admin.id, entityType: 'Product', entityId: (await prisma.product.findFirst())!.id, previousValue: { "basePrice": 18.00 }, newValue: { "basePrice": 20.00 }, ipAddress: '190.237.15.42' },
    { type: AuditEventType.STOCK_ADJUST, userId: merchant.id, entityType: 'ProductVariant', entityId: (await prisma.productVariant.findFirst())!.id, previousValue: { "stock": 60 }, newValue: { "stock": 58 }, ipAddress: '181.65.19.112' }
  ]});

  await prisma.errorLog.createMany({ data: [
    { severity: ErrorSeverity.CRITICAL, type: ErrorLogType.API_FAILURE, module: 'PaymentService', endpoint: '/api/v1/checkout/stripe/process', message: 'Stripe API timeout. No se recibió respuesta...', stackTrace: 'Error: ETIMEDOUT at ClientRequest...', userID: client1.id, isReviewed: true, reviewedBy: admin.id },
    { severity: ErrorSeverity.MEDIUM, type: ErrorLogType.DB_ERROR, module: 'AuthRepository', endpoint: '/api/v1/auth/register', message: 'PrismaClientKnownRequestError: Unique constraint failed on the fields: (email)', stackTrace: 'Intentó registrar correo jchirinos.rojas@gmail.com que ya existe', isReviewed: false },
    { severity: ErrorSeverity.HIGH, type: ErrorLogType.UNHANDLED_EXCEPTION, module: 'CloudinaryUploadService', endpoint: '/api/v1/quotes/designs/upload-logo', message: 'Invalid image format. Solo se permiten archivos PNG o JPG...', stackTrace: 'UploadError: File type application/pdf not supported...', userID: client2.id, isReviewed: false },
    { severity: ErrorSeverity.MEDIUM, type: ErrorLogType.TIMEOUT, module: 'PricingEngine', endpoint: '/api/v1/quotes/calculate-totals', message: 'El cálculo de descuentos por volumen y técnicas cruzadas excedió el límite de 5000ms.', stackTrace: 'TimeoutError: Execution blocked event loop.', userID: merchant.id, isReviewed: true }
  ]});

  console.log('\n✅ SEEDING PERFECTO TERMINADO. 20 Productos, todos sus variantes, pedidos reales y errores cargados en Prisma.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
