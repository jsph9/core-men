"use client";
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const productSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  basePrice: z.coerce.number().min(0.1),
  categoryId: z.string().min(1),
  fabricId: z.string().min(1),
  sizeGuideText: z.string().optional(),
  isBaseProduct: z.boolean().default(true),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url().optional().or(z.literal("")),
  variants: z.array(z.object({
    sizeId: z.string().min(1),
    colorId: z.string().min(1),
    stock: z.coerce.number().min(0),
    price: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
    discountPct: z.coerce.number().min(0).max(100).optional().or(z.literal("").transform(() => undefined))
  })).min(1)
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
      imageUrl: "",
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
      imageUrl: product.images?.[0]?.url || "",
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
    mutationFn: (data: ProductFormValues) => apiPut(`/api/products/${params.id}`, data),
    onSuccess: () => {
      toast.success("Producto actualizado");
      router.push("/productos");
      router.refresh();
    },
    onError: (error: any) => toast.error("Error al actualizar", { description: error.message })
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando producto...</div>;
  const { categories, fabrics, sizes, colors } = attributes || { categories: [], fabrics: [], sizes: [], colors: [] };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/productos"><Button variant="outline" size="icon" className="h-8 w-8 rounded-full"><ChevronLeft className="h-4 w-4" /></Button></Link>
        <h2 className="text-xl font-bold text-slate-900">Editar Producto</h2>
      </div>
      <form onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">
        <Card className="border-none shadow-sm"><CardContent className="space-y-4 pt-6">
          <Input {...form.register("name")} placeholder="Nombre" />
          <Textarea {...form.register("description")} placeholder="Descripción" rows={3} />
          <Textarea {...form.register("sizeGuideText")} placeholder="Guía de talla" rows={3} />
          <div className="grid md:grid-cols-3 gap-3">
            <Input type="number" step="0.01" {...form.register("basePrice")} placeholder="Precio base" />
            <select {...form.register("categoryId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Categoría</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select {...form.register("fabricId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Tela</option>{fabrics.map((f: any) => <option key={f.id} value={f.id}>{f.value}</option>)}</select>
          </div>
          <Input {...form.register("imageUrl")} placeholder="URL de imagen" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("isBaseProduct")} /> Producto base</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("isActive")} /> Activo</label>
        </CardContent></Card>

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
