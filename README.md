# CoreMen — E-Commerce Platform

Plataforma integral de comercio electrónico para el sector textil (modelo Gamarra). Gestiona el ciclo de vida completo de la venta de prendas: desde el catálogo y la personalización visual hasta la compra final y el panel administrativo. El diferencial técnico es un motor de personalización en tiempo real que permite al cliente posicionar, escalar y rotar logotipos sobre distintas vistas de la prenda con fidelidad de textura, generando además una ficha técnica lista para producción en taller.

---

## Tecnologías Utilizadas

**Frontend (`apps/web`):** Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui, HTML5 Canvas API, Konva.js

**Backend (`apps/api`):** Node.js, Express, TypeScript, Prisma ORM, class-validator, class-transformer

**Base de Datos:** PostgreSQL

**Pagos:** Stripe

**Infraestructura:** Docker, monorepo con npm workspaces (`packages/types` compartido entre apps)

---

## Características

### 🛒 Módulo de Cliente (B2C)
- Catálogo dinámico con filtros por categoría (Polos, Poleras, Casacas) y tipo de tela
- Personalización de prendas en tiempo real: el usuario posiciona, escala y rota logos sobre distintas vistas de la prenda con fidelidad de textura
- Carrito persistente y checkout en dos columnas, con pagos integrados vía Stripe
- Sistema de cotizaciones formales para pedidos mayoristas

### 💼 Panel Administrativo (Backoffice)
- CRUD completo de productos, con variantes de talla/color y control de stock
- Gestión de roles (Admin, Merchant, Client) protegida por JWT en cookies HttpOnly
- Descuentos configurables por volumen de compra y temporada
- Paginación concurrente: `PaginationQueryDto` validado con `class-transformer` (`@Type(() => Number)`), ejecutando `Promise.all([findMany({ skip, take }), count()])` y devolviendo `total`, `page`, `limit` y `totalPages`
- Log de auditoría inmutable (`QuoteStatusHistory`): cada cambio de estado registra quién lo hizo, el valor anterior, el nuevo y la justificación
- DTOs validados con `class-validator` (`@IsEnum()`, `@IsString()`, `@Min()`) eliminando tipos `any` en los controladores, más un filtro global de excepciones que sanitiza los stack traces antes de guardarlos en la tabla `ErrorLog`
- Variables sensibles de PostgreSQL (usuario, password, DB) parametrizadas por `.env` en Docker Compose, sin credenciales quemadas en el repo

---

## El Proceso

El mayor reto técnico fue el **motor de personalización de prendas en tiempo real**.

**Por qué Offscreen Canvas a 4x.** El editor trabaja en pantalla a 520×520 px (72 DPI). Para generar la Ficha Técnica de Producción en PDF que se envía al taller (serigrafía, DTF, bordado), esa resolución se ve borrosa al imprimirse en A4. Escalando a 4x (2080×2080 px) se alcanza una densidad cercana a 300 DPI, el estándar de impresión de alta fidelidad. Un factor mayor (8x-10x) dispara el buffer de píxeles a más de 4000×4000, consumiendo cientos de MB de RAM y arriesgando un *Out-Of-Memory* al llamar `canvas.toDataURL()`; 4x es el punto de equilibrio entre nitidez y estabilidad.

**Performance del canvas.** Al arrastrar o escalar el logo, cada pixel de movimiento disparaba una llamada a `draw()`, generando caídas de FPS. Se resolvió reemplazándolo por `layer.batchDraw()` de Konva, que delega el redibujado al ciclo de `requestAnimationFrame` del navegador. También aparecieron fugas de memoria al cambiar de vista de la prenda (frente, espalda, mangas): las instancias de `Konva.Stage` y las imágenes en blob no se liberaban. Se corrigió en el cleanup del `useEffect` de `Customizer.tsx`, destruyendo explícitamente el árbol de nodos (`stageRef.current.destroyChildren()`, `stageRef.current.destroy()`) y liberando memoria con `URL.revokeObjectURL()`. Por último, el cálculo de pliegues y sombras de la tela se cacheó en `shadowMaskCacheRef` para procesarlo una sola vez al cargar la imagen base, en vez de recalcular luminancia en cada movimiento.

**El proxy de CORS.** Al dibujar una imagen externa (S3/Cloudinary) en un `<canvas>` y luego exportarla con `toDataURL()`, el navegador la bloquea por la regla de *tainted canvas*. La solución es una API Route (`apps/web/src/app/api/proxy-image/route.ts`): el cliente pide `/api/proxy-image?url=...`, el servidor valida que el protocolo sea http/https y que el dominio esté en una lista blanca (`ALLOWED_DOMAINS`: Cloudinary, Amazon S3) — si no, responde 403 — descarga la imagen server-side (sin las restricciones de Same-Origin Policy del navegador) y la reenvía con `Access-Control-Allow-Origin` apuntando al propio dominio de la app. Como la imagen llega desde el mismo origen (`localhost:3000` en desarrollo), el canvas la acepta sin marcarla como contaminada.

**Por qué monorepo.** Alojar `apps/web` y `apps/api` juntos permite que un cambio (ej. un nuevo campo en un DTO y su formulario) se implemente en un solo commit, sin riesgo de desfase de versiones. Ambas apps consumen los tipos generados por Prisma (`@prisma/client`) como fuente única de verdad, validados en tiempo de build. Se comparte además el paquete interno `packages/types`, la configuración base de TypeScript/lint, los scripts raíz (`concurrently` para levantar todo con `npm run dev`) y el `docker-compose.yml` con sus semillas de datos (`seed.ts`).

---

## Lo Que Aprendí

Profundicé en diagnóstico y resolución de memory leaks en aplicaciones intensivas en canvas, y en diseñar capas de seguridad (allowlist anti-SSRF) para proxies que manejan recursos externos.

---

## Cómo Puede Mejorarse

- **Reducir N+1 en Prisma:** endpoints como `getMerchantQuotes` anidan `include` hasta 4 niveles (`items → productVariant → product → fabric/category`, `designs`, `statusHistory`). Cambiar a `select` explícitos y vistas desnormalizadas reduciría el overhead de joins.
- **Índices compuestos:** agregar `@@index([clientId, status])` y `@@index([createdAt(sort: Desc)])` en `schema.prisma` para acelerar los filtros más frecuentes.
- **Caching del catálogo:** Redis para telas y categorías, que cambian poco pero se consultan mucho.
- **Generación de PDF fuera del hilo principal:** hoy `@react-pdf/renderer` procesa la Ficha Técnica en el cliente; moverla a una cola (BullMQ + Redis) en worker threads del backend evitaría bloquear la UI.
- **Pagos parciales por Stripe:** la conciliación automática de anticipos (ej. 50% adelanto / 50% contra entrega) vía webhooks está simplificada a nivel de estados, falta el flujo completo.
- **Paginación 100% adoptada en frontend:** el backend ya soporta `PaginationQueryDto`, pero algunas pantallas secundarias aún cargan el dataset completo por compatibilidad hacia atrás.
- **Tiempo real:** el progreso de pedidos depende de que el usuario refresque o de `invalidateQueries` de React Query; WebSockets (`@nestjs/websockets` o Socket.io) permitirían actualizarlo en vivo.

---

## Cómo Correr el Proyecto

### Requisitos previos
- Node.js (v18+)
- PostgreSQL
- Cuenta de Stripe (para la pasarela de pagos)

### Instalación

```bash
# 1. Instalar dependencias desde la raíz
npm install

# 2. Configurar variables de entorno
# Copia .env.example a apps/api/.env para el backend
# Crea apps/web/.env.local para el frontend
# (evita versionar archivos .env* con secretos)

# 3. Inicializar la base de datos (Prisma)
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api

# 4. Ejecutar en desarrollo
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

### Scripts de calidad
- `npm run lint:web` — lint de la app web
- `npm run build` — compila API y Web
- `npm run test:http` — prueba HTTP rápida contra la API local
- `npm run test:e2e` — flujo E2E básico (login admin + creación de producto)

---

## Video

> 🎥 *[Agregar aquí GIF o video corto (15-30s) mostrando: catálogo → personalización de prenda en tiempo real → checkout]*
