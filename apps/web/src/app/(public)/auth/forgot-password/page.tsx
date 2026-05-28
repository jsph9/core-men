"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [serverMessage, setServerMessage] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormData) => {
    const response = await apiPost<{ message: string }>("/api/auth/forgot-password", values);
    setServerMessage(response.message);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8">
      <Card className="mx-auto mt-20 w-full max-w-md rounded-xl border border-gray-200/60 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#1A1A2E]">Recuperar contraseña</CardTitle>
          <CardDescription className="text-gray-500">Te enviaremos un enlace para restablecer tu contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Correo electrónico</Label>
              <Input {...register("email")} type="email" placeholder="tu@email.com" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[#2E75B6] hover:brightness-105">
              {isSubmitting ? "Enviando..." : "Enviar enlace"}
            </Button>
            {serverMessage && <p className="text-sm text-[#1A6B72]">{serverMessage}</p>}
            <p className="text-sm text-gray-500">
              <Link href="/auth/login" className="text-[#2E75B6] hover:underline">Volver al login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
