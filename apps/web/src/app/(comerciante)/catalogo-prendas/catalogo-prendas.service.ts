import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { Prenda, Variante } from "./types";

// ─── Tipos que devuelve el backend ────────────────────────────────────────────

interface ApiProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface ApiColor {
  id: string;
  name: string;
  hexCode: string;
}

interface ApiSize {
  id: string;
  value: string;
  abbreviation: string;
}

interface ApiVariant {
  id: string;
  stock: number;
  price: string | null;
  isActive: boolean;
  size: ApiSize;
  color: ApiColor;
}

interface ApiCategory {
  id: string;
  name: string;
}

interface ApiFabric {
  id: string;
  value: string;
}

interface ApiProduct {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: ApiCategory;
  fabric?: ApiFabric;
  fiberComposition?: string;
  careInstructions?: string;
  images: ApiProductImage[];
  variants?: ApiVariant[];
}

interface ApiProductListResponse {
  data: ApiProduct[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApiAttributesResponse {
  categories: ApiCategory[];
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapVariante(v: ApiVariant): Variante {
  return {
    id: v.id,
    talla: v.size.abbreviation,
    color: v.color.name,
    colorHex: v.color.hexCode,
    stock: v.stock,
    precio: v.price ? parseFloat(v.price) : undefined,
  };
}

function mapPrenda(p: ApiProduct): Prenda {
  const primaryImage =
    p.images?.find((img) => img.isPrimary)?.url ??
    p.images?.[0]?.url ??
    "/prenda-base.png";

  return {
    id: p.id,
    nombre: p.name,
    descripcion: p.description ?? "",
    categoria: p.category?.name ?? "",
    precioBase: parseFloat(p.basePrice),
    imagenUrl: primaryImage,
    activo: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    variantes: (p.variants ?? []).filter((v) => v.isActive).map(mapVariante),
    fiberComposition: p.fiberComposition ?? "",
    careInstructions: p.careInstructions ?? "",
    fabric: p.fabric?.value ?? "",
    images: p.images?.map((img) => img.url) ?? [],
  };
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * GET /api/products?limit=100&includeInactive=true
 * Accesible sin rol especial. Devuelve todos los productos (activos e inactivos).
 */
export async function fetchPrendas(): Promise<Prenda[]> {
  const res = await apiGet<ApiProductListResponse>(
    "/api/products?limit=100&includeInactive=true"
  );
  return res.data.map(mapPrenda);
}

/**
 * GET /api/products/:id
 * Detalle completo incluyendo variantes, imágenes, tallas y colores.
 */
export async function fetchPrendaDetalle(id: string): Promise<Prenda> {
  const product = await apiGet<ApiProduct>(`/api/products/${id}`);
  return mapPrenda(product);
}

/**
 * POST /api/admin/products
 * TODO: Este endpoint requiere rol ADMIN. Si se necesita acceso MERCHANT,
 * el backend debe crear POST /api/merchant/products con @Roles(Role.MERCHANT).
 */
export async function crearPrenda(payload: {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  precioBase: number;
  imagenUrl: string;
  activo: boolean;
}): Promise<Prenda> {
  const body = {
    name: payload.nombre,
    description: payload.descripcion,
    basePrice: payload.precioBase,
    categoryId: payload.categoriaId,
    // fabricId es requerido por el DTO — se necesita que el backend lo haga opcional
    // o que el frontend permita seleccionarlo. Temporalmente se omite y el backend
    // puede lanzar error de validación.
    // TODO: Agregar selector de fabricId en el formulario o hacerlo opcional en backend.
    fabricId: "",
    imageUrl: payload.imagenUrl || undefined,
    isActive: payload.activo,
    fiberComposition: "100% Algodón",
    careInstructions: "Lavar a máquina en frío",
  };
  const product = await apiPost<ApiProduct>("/api/admin/products", body);
  return mapPrenda(product);
}

/**
 * PATCH /api/admin/products/:id
 * TODO: Este endpoint requiere rol ADMIN. Si se necesita acceso MERCHANT,
 * el backend debe crear PATCH /api/merchant/products/:id con @Roles(Role.MERCHANT).
 */
export async function editarPrenda(
  id: string,
  payload: {
    nombre: string;
    descripcion: string;
    categoriaId: string;
    precioBase: number;
    imagenUrl: string;
    activo: boolean;
    // Datos del producto actual necesarios para no perder campos requeridos
    fabricId: string;
    fiberComposition: string;
    careInstructions: string;
  }
): Promise<Prenda> {
  const body = {
    name: payload.nombre,
    description: payload.descripcion,
    basePrice: payload.precioBase,
    categoryId: payload.categoriaId,
    fabricId: payload.fabricId,
    imageUrl: payload.imagenUrl || undefined,
    isActive: payload.activo,
    fiberComposition: payload.fiberComposition,
    careInstructions: payload.careInstructions,
  };
  const product = await apiPatch<ApiProduct>(`/api/admin/products/${id}`, body);
  return mapPrenda(product);
}

/**
 * PATCH /api/admin/products/:id  con { isActive: false }
 * Soft-delete: desactiva la prenda sin eliminarla.
 * TODO: Este endpoint requiere rol ADMIN. Ver nota en editarPrenda.
 */
export async function desactivarPrenda(id: string): Promise<void> {
  await apiPatch(`/api/admin/products/${id}`, { isActive: false });
}

/**
 * GET /api/admin/attributes
 * Devuelve categorías, telas, tallas y colores disponibles.
 */
export async function fetchAtributos(): Promise<ApiAttributesResponse> {
  return apiGet<ApiAttributesResponse>("/api/admin/attributes");
}
