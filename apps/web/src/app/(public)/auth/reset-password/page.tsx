"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

const schema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres").max(16, "Máximo 16 caracteres")
    .regex(/[A-Z]/, "Incluye al menos una mayúscula")
    .regex(/[0-9]/, "Incluye al menos un número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas no coinciden",
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormData) => {
    try {
      setServerError("");
      await apiPost("/api/auth/reset-password", { token, password: values.password });
      router.push("/auth/login?reset=success");
    } catch (error: any) {
      setServerError(error.message || "No se pudo actualizar la contraseña");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] px-4 py-8">
        <Card className="mx-auto mt-20 w-full max-w-md rounded-xl border border-gray-200/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#1A1A2E]">Token inválido</CardTitle>
            <CardDescription>El enlace de recuperación no es válido.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8">
      <Card className="mx-auto mt-20 w-full max-w-md rounded-xl border border-gray-200/60 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#1A1A2E]">Nueva contraseña</CardTitle>
          <CardDescription className="text-gray-500">Define una contraseña segura para tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Contraseña nueva</Label>
              <Input {...register("password")} type="password" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Confirmar contraseña</Label>
              <Input {...register("confirmPassword")} type="password" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>
            {serverError && <p className="text-sm text-red-500">{serverError}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[#2E75B6] hover:brightness-105">
              {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
