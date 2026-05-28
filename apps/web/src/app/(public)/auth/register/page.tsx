"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiPost } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  email: z.string().email("Email inválido"),
  role: z.enum(["CLIENT", "MERCHANT"]),
  password: z.string().min(8, "Mínimo 8 caracteres").max(16, "Máximo 16 caracteres")
    .regex(/[A-Z]/, "Incluye al menos una mayúscula")
    .regex(/[0-9]/, "Incluye al menos un número"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Las contraseñas no coinciden", path: ["confirmPassword"] });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "CLIENT" },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError("");
      await apiPost("/api/auth/register", { name: data.name, email: data.email, password: data.password, role: data.role });
      router.push("/auth/login?registered=true");
    } catch (err: any) {
      setError(err.message || "Error al registrar");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8">
      <Card className="mx-auto mt-16 w-full max-w-md rounded-xl border border-gray-200/60 bg-white shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#1A1A2E]">Crear Cuenta</CardTitle>
          <CardDescription className="text-gray-500">Regístrate en CoreMen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Nombre completo</Label>
              <Input {...register("name")} placeholder="Juan Pérez" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Email</Label>
              <Input {...register("email")} type="email" placeholder="tu@email.com" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Tipo de cuenta</Label>
              <select {...register("role")} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="CLIENT">Cliente</option>
                <option value="MERCHANT">Comerciante</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Contraseña</Label>
              <Input {...register("password")} type="password" placeholder="8-16, mayúscula y número" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Confirmar contraseña</Label>
              <Input {...register("confirmPassword")} type="password" placeholder="Repetir contraseña" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full rounded-lg bg-[#2E75B6] text-white hover:brightness-105 active:scale-[0.98]" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrarse"}
            </Button>
            <p className="text-center text-sm text-gray-500">
              ¿Ya tienes cuenta? <Link href="/auth/login" className="text-[#2E75B6] hover:underline">Inicia sesión</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
