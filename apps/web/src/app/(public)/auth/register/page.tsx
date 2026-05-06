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
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Las contraseñas no coinciden", path: ["confirmPassword"] });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError("");
      await apiPost("/api/auth/register", { name: data.name, email: data.email, password: data.password });
      router.push("/auth/login?registered=true");
    } catch (err: any) {
      setError(err.message || "Error al registrar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <Card className="w-full max-w-md border-gray-800 bg-white/5 backdrop-blur-lg text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Crear Cuenta</CardTitle>
          <CardDescription className="text-gray-400">Regístrate en CoreMen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">{error}</div>}
            <div className="space-y-2">
              <Label className="text-gray-300">Nombre completo</Label>
              <Input {...register("name")} placeholder="Juan Pérez" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email</Label>
              <Input {...register("email")} type="email" placeholder="tu@email.com" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Contraseña</Label>
              <Input {...register("password")} type="password" placeholder="Mínimo 8 caracteres" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Confirmar contraseña</Label>
              <Input {...register("confirmPassword")} type="password" placeholder="Repetir contraseña" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
              {errors.confirmPassword && <p className="text-red-400 text-xs">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrarse"}
            </Button>
            <p className="text-center text-sm text-gray-400">
              ¿Ya tienes cuenta? <Link href="/auth/login" className="text-blue-400 hover:underline">Inicia sesión</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
