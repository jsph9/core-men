"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiGet, apiPut } from "@/lib/api";

const schema = z.object({
  firstName: z.string().min(2, "Nombre muy corto"),
  lastName: z.string().min(2, "Apellido paterno muy corto"),
  maternalLastName: z.string().optional(),
  email: z.string().email("Email inválido"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PerfilPage() {
  const [serverMessage, setServerMessage] = useState("");
  const [serverError, setServerError] = useState("");

  const { data: me } = useQuery<any>({
    queryKey: ["me"],
    queryFn: () => apiGet("/api/users/me"),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (me) {
      reset({ 
        firstName: me.firstName || "", 
        lastName: me.lastName || "", 
        maternalLastName: me.maternalLastName || "", 
        email: me.email, 
        currentPassword: "", 
        newPassword: "" 
      });
    }
  }, [me, reset]);

  const onSubmit = async (values: FormData) => {
    try {
      setServerError("");
      setServerMessage("");
      const payload: Record<string, string> = { 
        firstName: values.firstName, 
        lastName: values.lastName, 
        maternalLastName: values.maternalLastName || "", 
        email: values.email 
      };

      if (values.newPassword) {
        payload.currentPassword = values.currentPassword || "";
        payload.newPassword = values.newPassword;
      }

      await apiPut("/api/users/me", payload);
      setServerMessage("Perfil actualizado correctamente");
      reset({ ...values, currentPassword: "", newPassword: "" });
    } catch (error: any) {
      setServerError(error.message || "No se pudo actualizar el perfil");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8 md:px-6 lg:px-8">
      <Card className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200/60 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#1A1A2E]">Mi perfil</CardTitle>
          <CardDescription className="text-gray-500">Actualiza tus datos y opcionalmente cambia tu contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Nombres</Label>
              <Input {...register("firstName")} className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#1A1A2E]">Apellido Paterno</Label>
                <Input {...register("lastName")} className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
                {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[#1A1A2E]">Apellido Materno</Label>
                <Input {...register("maternalLastName")} className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
                {errors.maternalLastName && <p className="text-sm text-red-500">{errors.maternalLastName.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1A1A2E]">Correo electrónico</Label>
              <Input {...register("email")} type="email" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[#1A1A2E]">Contraseña actual</Label>
                <Input {...register("currentPassword")} type="password" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1A1A2E]">Nueva contraseña</Label>
                <Input {...register("newPassword")} type="password" className="rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            {serverError && <p className="text-sm text-red-500">{serverError}</p>}
            {serverMessage && <p className="text-sm text-[#1A6B72]">{serverMessage}</p>}

            <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#2E75B6] text-white hover:brightness-105 active:scale-[0.98]">
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
