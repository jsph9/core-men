"use client";
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
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
  isActive: z.boolean().default(true),
  fiberComposition: z.string().min(3, "La composición debe tener al menos 3 caracteres"),
  careInstructions: z.string().min(3, "Las instrucciones de cuidado deben tener al menos 3 caracteres"),
  imageUrl: z.string().optional(),
  frontImage: z.any().refine((file) => file instanceof File || typeof file === "string", "Sube la imagen frontal"),
  backImage: z.any().refine((file) => file instanceof File || typeof file === "string", "Sube la imagen de espalda"),
  rightImage: z.any().refine((file) => file instanceof File || typeof file === "string", "Sube la imagen de la manga derecha"),
  leftImage: z.any().refine((file) => file instanceof File || typeof file === "string", "Sube la imagen de la manga izquierda"),
  variants: z.array(z.object({
    sizeId: z.string().min(1, "Selecciona una talla"),
    colorId: z.string().min(1, "Selecciona un color"),
    stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
    price: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
    discountPct: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined))
  })).min(1, "Debes añadir al menos una variante")
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: attributes } = useQuery<any>({ queryKey: ["admin-attributes"], queryFn: () => apiGet("/api/admin/attributes") });
  const { data: product, isLoading } = useQuery<any>({ queryKey: ["admin-product", params.id], queryFn: () => apiGet(`/api/products/${params.id}`) });

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
      isActive: true,
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

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variants" });

  useEffect(() => {
    if (!product) return;
    form.reset({
      name: product.name,
      description: product.description || "",
      basePrice: Number(product.basePrice),
      categoryId: product.categoryId,
      fabricId: product.fabricId,
      sizeGuideText: product.sizeGuideText || "",
      isBaseProduct: product.isBaseProduct ?? true,
      isActive: product.isActive,
      fiberComposition: product.fiberComposition || "",
      careInstructions: product.careInstructions || "",
      imageUrl: product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url || "",
      frontImage: product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url || "",
      backImage: product.images?.filter((img: any) => !img.isPrimary)?.[0]?.url || "/prenda-base2.png",
      rightImage: product.images?.filter((img: any) => !img.isPrimary)?.[1]?.url || "/prenda-base3.jpg",
      leftImage: product.images?.filter((img: any) => !img.isPrimary)?.[2]?.url || "/prenda-base4.jpg",
      variants: product.variants?.map((v: any) => ({
        sizeId: v.sizeId,
        colorId: v.colorId,
        stock: v.stock,
        price: v.price ? Number(v.price) : undefined,
        discountPct: v.discountPct ? Number(v.discountPct) : undefined,
      })) || [{ sizeId: "", colorId: "", stock: 0 }]
    });
  }, [product, form]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiPatch(`/api/admin/products/${params.id}`, data),
    onSuccess: () => {
      toast.success("Producto actualizado exitosamente");
      router.push("/productos");
      router.refresh();
    },
    onError: (error: any) => toast.error("Error al actualizar", { description: error.message })
  });

  const onSubmit = async (data: ProductFormValues) => {
    try {
      const uploadFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("files", file);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${API_URL}/api/upload/catalogo`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Error al subir la imagen a S3");
        }
        const resData = await res.json();
        return resData.urls?.[0] || "";
      };

      const uploadIfNeeded = async (value: any): Promise<string> => {
        if (value instanceof File) {
          return await uploadFile(value);
        }
        return typeof value === "string" ? value : "";
      };

      // Subimos únicamente las imágenes que se hayan modificado (tipo File)
      const frontUrl = await uploadIfNeeded(data.frontImage);
      const backUrl = await uploadIfNeeded(data.backImage);
      const rightUrl = await uploadIfNeeded(data.rightImage);
      const leftUrl = await uploadIfNeeded(data.leftImage);

      const secondaryImageUrls = [backUrl, rightUrl, leftUrl].filter(Boolean);

      const { frontImage, backImage, rightImage, leftImage, ...payload } = data;

      updateMutation.mutate({
        ...payload,
        imageUrl: frontUrl,
        secondaryImageUrls,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar las imágenes");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando producto...</div>;
  const { categories, fabrics, sizes, colors } = attributes || { categories: [], fabrics: [], sizes: [], colors: [] };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/productos"><Button variant="outline" size="icon" className="h-8 w-8 rounded-full"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h2 className="text-xl font-bold text-slate-900">Editar Producto</h2>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nombre del Producto *</label>
              <Input {...form.register("name")} placeholder="Nombre" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Descripción</label>
              <Textarea {...form.register("description")} placeholder="Descripción" rows={3} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Guía de talla</label>
              <Textarea {...form.register("sizeGuideText")} placeholder="Guía de talla" rows={3} />
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Precio base (S/) *</label>
                <Input type="number" step="0.01" {...form.register("basePrice")} placeholder="Precio base" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Categoría *</label>
                <select {...form.register("categoryId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Categoría</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tela *</label>
                <select {...form.register("fabricId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Tela</option>{fabrics.map((f: any) => <option key={f.id} value={f.id}>{f.value}</option>)}</select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
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

            <div className="flex gap-4 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("isActive")} /> Activo</label>
            </div>
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
                
                // Si es un objeto File, creamos Object URL local. Si es un string URL existente, lo usamos directamente.
                const previewUrl = file instanceof File 
                  ? URL.createObjectURL(file) 
                  : typeof file === "string" && file.startsWith("http") 
                    ? file 
                    : file && file.startsWith("data:image")
                      ? file
                      : null;

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

        <Card className="border-none shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Variantes</CardTitle><Button type="button" variant="outline" size="sm" onClick={() => append({ sizeId: "", colorId: "", stock: 0 })}><Plus className="h-4 w-4 mr-1" />Añadir</Button></CardHeader><CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid md:grid-cols-6 gap-2 items-end">
              <select {...form.register(`variants.${index}.sizeId`)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Talla</option>{sizes.map((s: any) => <option key={s.id} value={s.id}>{s.value}</option>)}</select>
              <select {...form.register(`variants.${index}.colorId`)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Color</option>
                {colors.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Input type="number" {...form.register(`variants.${index}.stock`)} placeholder="Stock" />
              <Input type="number" step="0.01" {...form.register(`variants.${index}.price`)} placeholder="Precio" />
              <Input type="number" step="0.01" {...form.register(`variants.${index}.discountPct`)} placeholder="Desc. %" />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent></Card>

        <div className="flex justify-end"><Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Guardando..." : "Guardar cambios"}</Button></div>
      </form>
    </div>
  );
}
