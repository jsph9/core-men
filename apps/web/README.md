# CoreMen Web

Aplicacion frontend de CoreMen construida con Next.js App Router.

## Stack

- Next.js 16
- React 19
- Tailwind CSS
- TanStack Query
- shadcn/ui

## Variables de entorno

1. Copia `apps/web/.env.example` a `apps/web/.env.local`.
2. Ajusta `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## Desarrollo

Desde la raiz del monorepo:

```bash
npm run dev:web
```

## Calidad

```bash
npm run lint:web
npm run build:web
```
