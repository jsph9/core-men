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
      else if (res.role === "MERCHANT") router.push("/comerciante/cotizaciones");
      else router.push("/catalogo");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <Card className="w-full max-w-md border-gray-800 bg-white/5 backdrop-blur-lg text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Iniciar Sesión</CardTitle>
          <CardDescription className="text-gray-400">Ingresa a tu cuenta CoreMen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
            <div className="space-y-2">
              <Label className="text-gray-300">Email</Label>
              <Input {...register("email")} type="email" placeholder="tu@email.com" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Contraseña</Label>
              <Input {...register("password")} type="password" placeholder="••••••••" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
            <div className="flex justify-between text-sm">
              <Link href="/auth/forgot-password" className="text-blue-400 hover:underline">¿Olvidaste tu contraseña?</Link>
              <Link href="/auth/register" className="text-blue-400 hover:underline">Crear cuenta</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
