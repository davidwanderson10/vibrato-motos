"use client";

import { useActionState } from "react";
import { setupAction, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function SetupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setupAction,
    undefined,
  );

  return (
    <Card>
      <CardContent className="py-6">
        <p className="mb-5 text-sm text-muted">
          Primeiro acesso: cadastre os dados da locadora e o administrador. Você
          poderá editar tudo depois em Configurações.
        </p>
        <form action={formAction}>
          <Field label="Nome da empresa" htmlFor="nomeEmpresa">
            <Input id="nomeEmpresa" name="nomeEmpresa" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ" htmlFor="cnpj">
              <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" placeholder="(00) 00000-0000" />
            </Field>
          </div>

          <Field label="Nome do responsável" htmlFor="responsavel">
            <Input id="responsavel" name="responsavel" required />
          </Field>

          <Field label="Endereço" htmlFor="endereco">
            <Input id="endereco" name="endereco" />
          </Field>

          <hr className="my-4 border-border" />

          <Field label="E-mail de acesso" htmlFor="email">
            <Input id="email" name="email" type="email" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Senha" htmlFor="senha">
              <Input id="senha" name="senha" type="password" required />
            </Field>
            <Field label="Confirmar senha" htmlFor="confirmarSenha">
              <Input
                id="confirmarSenha"
                name="confirmarSenha"
                type="password"
                required
              />
            </Field>
          </div>

          {state?.error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Criando..." : "Criar locadora e entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
