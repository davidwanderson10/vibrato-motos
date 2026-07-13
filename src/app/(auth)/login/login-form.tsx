"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card>
      <CardContent className="py-6">
        <form action={formAction}>
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="voce@empresa.com.br"
              required
            />
          </Field>

          <Field label="Senha" htmlFor="senha">
            <div className="relative">
              <Input
                id="senha"
                name="senha"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted hover:text-foreground"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </Field>

          {state?.error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link
            href="/redefinir-senha"
            className="text-muted hover:text-foreground"
          >
            Esqueceu sua senha?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
