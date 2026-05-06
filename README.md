# CoreMen E-Commerce Platform

Plataforma integral de comercio electrónico diseñada para el sector textil (Modelo Gamarra). Este proyecto gestiona el ciclo de vida completo de la venta de prendas, desde el catálogo y la personalización hasta la compra final y el panel administrativo.

## Arquitectura del Proyecto

El proyecto está estructurado como un **Monorepo** dividido en dos aplicaciones principales:

- `apps/web`: Frontend desarrollado con **Next.js 14+ (App Router)**, **React 18+**, **Tailwind CSS** y componentes de **shadcn/ui**.
- `apps/api`: Backend desarrollado con **Node.js**, **Express**, **TypeScript** y **Prisma ORM** conectado a una base de datos **PostgreSQL**.

## Funcionalidades Principales

### 🛒 Módulo de Cliente (B2C)
- **Catálogo Dinámico:** Grilla interactiva con filtros por categorías (Polos, Poleras, Casacas) y telas.
- **Personalización de Prendas:** Interfaz (Mockup interactivo) para que el cliente diseñe su prenda.
- **Carrito Persistente y Checkout:** Flujo de compra optimizado a dos columnas con integración segura a **Stripe** para pagos.
- **Cotizaciones Formales:** Sistema para solicitar cotizaciones mayoristas.

### 💼 Panel Administrativo (Backoffice)
- **Gestión de Productos:** CRUD completo (Creación visual de productos, variantes de tallas/colores y control de stock).
- **Gestión de Roles y Usuarios:** Control de accesos basado en roles (Admin, Merchant, Client) protegido por JWT en cookies HttpOnly.
- **Descuentos Inteligentes:** Configuración de descuentos por volumen de compra y temporadas.
- **Auditoría:** Registro inmutable de acciones sensibles (Log de auditoría).

## Requisitos Previos

- Node.js (v18+)
- PostgreSQL
- Cuenta de Stripe (Para pasarela de pagos)

## Instalación y Ejecución Local

1. Instalar dependencias desde la raíz:
   ```bash
   npm install
   ```

2. Configurar variables de entorno (`.env`):
   Asegúrate de copiar el archivo `.env.example` a `.env` y llenar las credenciales de la base de datos y Stripe.

3. Inicializar la base de datos (Prisma):
   ```bash
   npm run db:migrate --workspace=apps/api
   npm run db:seed --workspace=apps/api
   ```

4. Ejecutar el servidor de desarrollo en simultáneo:
   ```bash
   npm run dev
   ```
   - Frontend disponible en: `http://localhost:3000`
   - Backend API disponible en: `http://localhost:3001`
