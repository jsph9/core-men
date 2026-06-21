"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import Link from "next/link";

const productSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(0.1, "El precio base debe ser mayor a 0"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  fabricId: z.string().min(1, "Selecciona un tipo de tela"),
  sizeGuideText: z.string().optional(),
  isBaseProduct: z.boolean().default(true),
  fiberComposition: z.string().min(3, "La composición debe tener al menos 3 caracteres"),
  careInstructions: z.string().min(3, "Las instrucciones de cuidado deben tener al menos 3 caracteres"),
  imageUrl: z.string().optional(),
  frontImage: z.any().refine((file) => file instanceof File, "Sube la imagen frontal"),
  backImage: z.any().refine((file) => file instanceof File, "Sube la imagen de espalda"),
  rightImage: z.any().refine((file) => file instanceof File, "Sube la imagen de la manga derecha"),
  leftImage: z.any().refine((file) => file instanceof File, "Sube la imagen de la manga izquierda"),
  variants: z.array(z.object({
    sizeId: z.string().min(1, "Selecciona una talla"),
    colorId: z.string().min(1, "Selecciona un color"),
    stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
    price: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
    discountPct: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined))
  })).min(1, "Debes añadir al menos una variante")
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NuevoProductoPage() {
  const router = useRouter();

  const { data: attributes, isLoading: isLoadingAttributes } = useQuery<any>({
    queryKey: ["admin-attributes"],
    queryFn: () => apiGet("/api/admin/attributes")
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: 0,
      categoryId: "",
      fabricId: "",
      sizeGuideText: "",
      isBaseProduct: true,
      fiberComposition: "",
      careInstructions: "",
      imageUrl: "",
      frontImage: undefined,
      backImage: undefined,
      rightImage: undefined,
      leftImage: undefined,
      variants: [{ sizeId: "", colorId: "", stock: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductFormValues) => apiPost("/api/admin/products", data),
    onSuccess: () => {
      toast.success("Producto creado exitosamente");
      router.push("/productos");
      router.refresh();
    },
    onError: (error: any) => {
      toast.error("Error al crear producto", { description: error.message });
    }
  });

  const onSubmit = async (data: ProductFormValues) => {
    try {
      let finalImageUrl = "";
      let secondaryImageUrls: string[] = [];
      
      if (data.frontImage instanceof File) {
        const formData = new FormData();
        formData.append("files", data.frontImage);
        if (data.backImage instanceof File) formData.append("files", data.backImage);
        if (data.rightImage instanceof File) formData.append("files", data.rightImage);
        if (data.leftImage instanceof File) formData.append("files", data.leftImage);

        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const uploadRes = await fetch(`${API_URL}/api/upload/catalogo`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.message || "Error al subir las imágenes a S3");
        }

        const resData = await uploadRes.json();
        finalImageUrl = resData.urls?.[0] || "";
        secondaryImageUrls = resData.urls?.slice(1) || [];
      }
      
      const { frontImage, backImage, rightImage, leftImage, ...payload } = data;
      
      createMutation.mutate({
        ...payload,
        imageUrl: finalImageUrl,
        secondaryImageUrls,
      } as any);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar la imagen");
    }
  };

  if (isLoadingAttributes) {
    return <div className="p-8 text-center text-slate-500">Cargando atributos del sistema...</div>;
  }

  const { categories, fabrics, sizes, colors } = attributes || { categories: [], fabrics: [], sizes: [], colors: [] };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/productos">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Crear Nuevo Producto</h2>
          <p className="text-sm text-slate-500">Registra un nuevo producto en el catálogo y define sus variantes.</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Información Básica */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nombre del Producto *</label>
                <Input {...form.register("name")} placeholder="Ej. Polo Cuello V" />
                {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Precio Base (S/) *</label>
                <Input type="number" step="0.01" {...form.register("basePrice")} placeholder="35.00" />
                {form.formState.errors.basePrice && <p className="text-xs text-red-500">{form.formState.errors.basePrice.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Descripción</label>
              <Textarea {...form.register("description")} placeholder="Detalles del producto, corte, estilo..." rows={3} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Guía de talla (texto)</label>
              <Textarea {...form.register("sizeGuideText")} placeholder="Ej. S: Pecho 52cm / Largo 68cm / Manga 21cm" rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Categoría *</label>
                <select 
                  {...form.register("categoryId")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {form.formState.errors.categoryId && <p className="text-xs text-red-500">{form.formState.errors.categoryId.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tipo de Tela *</label>
                <select 
                  {...form.register("fabricId")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Seleccionar...</option>
                  {fabrics.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.value}</option>
                  ))}
                </select>
                {form.formState.errors.fabricId && <p className="text-xs text-red-500">{form.formState.errors.fabricId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Composición de Fibra *</label>
                <Input {...form.register("fiberComposition")} placeholder="Ej. 100% Algodón Piqué o 95% Algodón, 5% Lycra" />
                {form.formState.errors.fiberComposition && <p className="text-xs text-red-500">{form.formState.errors.fiberComposition.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Instrucciones de Cuidado *</label>
                <Input {...form.register("careInstructions")} placeholder="Ej. Lavar a máquina en frío, no usar lejía" />
                {form.formState.errors.careInstructions && <p className="text-xs text-red-500">{form.formState.errors.careInstructions.message}</p>}
              </div>
            </div>

            {/* Removed isBaseProduct checkbox since all admin catalog products are base products by default */}
          </CardContent>
        </Card>

        {/* Subida de 4 Vistas de Prenda */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-slate-500" /> Vistas de Prenda Requeridas (4 Imágenes)
            </CardTitle>
            <CardDescription>
              Para registrar el producto, debes subir exactamente las 4 vistas requeridas en formato JPG o PNG.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "frontImage", label: "Vista Frontal" },
                { name: "backImage", label: "Vista de Espalda" },
                { name: "rightImage", label: "Manga Derecha" },
                { name: "leftImage", label: "Manga Izquierda" },
              ].map((view) => {
                const fieldName = view.name as "frontImage" | "backImage" | "rightImage" | "leftImage";
                const file = form.watch(fieldName);
                const error = form.formState.errors[fieldName];
                const previewUrl = file instanceof File ? URL.createObjectURL(file) : null;

                return (
                  <div key={view.name} className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-600 pl-1">{view.label} *</span>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl aspect-square flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/70 transition-colors relative overflow-hidden group min-h-[160px]">
                      {previewUrl ? (
                        <div className="absolute inset-0 w-full h-full">
                          <img src={previewUrl} alt={view.label} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => form.setValue(fieldName, undefined as any, { shouldValidate: true })}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors z-10"
                            title="Quitar imagen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const uploadedFile = e.target.files?.[0];
                              if (uploadedFile) {
                                form.setValue(fieldName, uploadedFile, { shouldValidate: true });
                              }
                            }}
                          />
                          <Upload className="h-6 w-6 text-slate-400 group-hover:text-blue-500 mb-1.5 transition-colors" />
                          <span className="text-[10px] font-bold text-slate-600">Subir Imagen</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">JPG o PNG</span>
                        </div>
                      )}
                    </div>
                    {error && <p className="text-[10px] text-red-500 pl-1 mt-0.5">{error.message as string}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Variantes */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-lg">Variantes (Tallas y Colores)</CardTitle>
              <CardDescription>Añade el inventario específico para cada combinación.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => append({ sizeId: "", colorId: "", stock: 0 })}>
              <Plus className="h-4 w-4 mr-2" /> Añadir Variante
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {form.formState.errors.variants?.root && <p className="text-xs text-red-500 p-4 pb-0">{form.formState.errors.variants.root.message}</p>}
            
            <div className="divide-y divide-slate-100">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-end bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 space-y-2 w-full md:w-auto">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Talla *</label>
                    <select 
                      {...form.register(`variants.${index}.sizeId`)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Talla...</option>
                      {sizes.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.value}</option>
                      ))}
                    </select>
                    {form.formState.errors.variants?.[index]?.sizeId && <p className="text-xs text-red-500">{form.formState.errors.variants[index]?.sizeId?.message}</p>}
                  </div>
                  
                  <div className="flex-1 space-y-2 w-full md:w-auto">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Color *</label>
                    <select 
                      {...form.register(`variants.${index}.colorId`)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Color...</option>
                      {colors.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {form.formState.errors.variants?.[index]?.colorId && <p className="text-xs text-red-500">{form.formState.errors.variants[index]?.colorId?.message}</p>}
                  </div>

                  <div className="w-full md:w-24 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Stock *</label>
                    <Input type="number" {...form.register(`variants.${index}.stock`)} className="bg-white" />
                  </div>

                  <div className="w-full md:w-32 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase" title="Opcional. Sobrescribe el precio base">Precio Específico</label>
                    <Input type="number" step="0.01" {...form.register(`variants.${index}.price`)} placeholder="Opcional" className="bg-white" />
                  </div>

                  <div className="w-full md:w-32 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Descuento %</label>
                    <Input type="number" step="0.01" {...form.register(`variants.${index}.discountPct`)} placeholder="Opcional" className="bg-white" />
                  </div>

                  <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 mb-0.5" onClick={() => remove(index)} disabled={fields.length === 1}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
          <Link href="/productos">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[150px]" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Guardando..." : "Guardar Producto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
