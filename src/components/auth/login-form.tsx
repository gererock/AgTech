"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAuthSession, setAuthSession } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Ingresá email y contraseña.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      if (!response.ok) {
        throw new Error("Credenciales inválidas");
      }

      setAuthSession();
      router.replace("/dashboard");
    } catch (error) {
      clearAuthSession();
      setError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">

        {/* Cabecera estructurada con espaciado consistente */}
        <div className="mb-6 space-y-1.5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">
            Agro Operativo
          </p>
          <h1 className="text-2xl font-black text-slate-950">
            Iniciar sesión
          </h1>
          <p className="text-sm text-slate-600">
            Ingresá tus credenciales para acceder al panel.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm font-bold text-red-600">{error}</p>
          ) : null}

          {/* Le damos pt-2 al botón para darle más peso visual respecto a los inputs */}
          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Entrar"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
