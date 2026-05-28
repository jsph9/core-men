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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError("");
      const res = await apiPost<{ role: string }>("/api/auth/login", data);
      if (res.role === "ADMIN") router.push("/dashboard");
      else if (res.role === "MERCHANT") router.push("/gestion-cotizaciones");
      else router.push("/catalogo");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8">
      <Card className="mx-auto mt-20 w-full max-w-md rounded-xl border border-gray-200/60 bg-white shadow-sm">
        <CardHeader className="text-center">
          <p className="text-xl font-semibold tracking-tight text-[#1F3864]">CoreMen</p>
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#1A1A2E]">Bienvenido a CoreMen</CardTitle>
          <CardDescription className="text-gray-500">Ingresa tus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Correo electrónico</Label>
              <Input {...register("email")} type="email" placeholder="tu@email.com" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Contraseña</Label>
              <Input {...register("password")} type="password" placeholder="••••••••" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-[#2E75B6] hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>
            <Button type="submit" className="w-full rounded-lg bg-[#2E75B6] text-white hover:brightness-105 active:scale-[0.98]" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
            </Button>
            <p className="text-center text-sm text-gray-500">
              ¿No tienes cuenta? <Link href="/auth/register" className="text-[#2E75B6] hover:underline">Regístrate</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
