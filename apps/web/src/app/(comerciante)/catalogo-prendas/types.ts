export interface Variante {
  id: string;
  talla: string;
  color: string;
  colorHex: string;
  stock: number;
  precio?: number;
}

export interface Prenda {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precioBase: number;
  imagenUrl: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  variantes: Variante[];
  // Campos extra del backend necesarios para edición sin pérdida de datos
  fabricId?: string;
  fiberComposition?: string;
  careInstructions?: string;
  categoriaId?: string;
}

export interface CategoriaAtributo {
  id: string;
  name: string;
}
