"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateLocadora,
  alterarPerfil,
  alterarEmail,
  alterarSenha,
  type CfgState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Feedback({ state }: { state: CfgState }) {
  if (state?.error)
    return (
      <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
        Alterações salvas.
      </p>
    );
  return null;
}

export function DadosLocadoraForm({
  locadora,
  logoUrl,
}: {
  locadora: {
    nome: string;
    cnpj: string | null;
    responsavel: string | null;
    whatsapp: string | null;
    endereco: string | null;
  };
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CfgState, FormData>(
    updateLocadora,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da locadora</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <Feedback state={state} />

          <div className="mb-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/logo-vibrato.png"}
              alt="Logo"
              className="h-16 w-16 rounded-lg border border-border object-contain p-1"
            />
            <Field label="Logotipo" htmlFor="logo" className="mb-0 flex-1">
              <Input id="logo" name="logo" type="file" accept="image/*" />
            </Field>
          </div>

          <Field label="Nome da empresa" htmlFor="nome">
            <Input id="nome" name="nome" required defaultValue={locadora.nome} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ" htmlFor="cnpj">
              <Input id="cnpj" name="cnpj" defaultValue={locadora.cnpj ?? ""} />
            </Field>
            <Field label="Responsável" htmlFor="responsavel">
              <Input
                id="responsavel"
                name="responsavel"
                defaultValue={locadora.responsavel ?? ""}
              />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input
                id="whatsapp"
                name="whatsapp"
                defaultValue={locadora.whatsapp ?? ""}
              />
            </Field>
            <Field label="Endereço" htmlFor="endereco">
              <Input
                id="endereco"
                name="endereco"
                defaultValue={locadora.endereco ?? ""}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PerfilForm({ nomeAtual }: { nomeAtual: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CfgState, FormData>(
    alterarPerfil,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <Feedback state={state} />
          <Field label="Nome" htmlFor="nome">
            <Input id="nome" name="nome" required defaultValue={nomeAtual} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function EmailForm({ emailAtual }: { emailAtual: string }) {
  const [state, action, pending] = useActionState<CfgState, FormData>(
    alterarEmail,
    undefined,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>E-mail de acesso</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <Feedback state={state} />
          <p className="mb-3 text-sm text-muted">
            Atual: <strong className="text-foreground">{emailAtual}</strong>
          </p>
          <Field label="Novo e-mail" htmlFor="novoEmail">
            <Input id="novoEmail" name="novoEmail" type="email" required />
          </Field>
          <Field label="Senha atual (confirmação)" htmlFor="senhaAtualEmail">
            <Input
              id="senhaAtualEmail"
              name="senhaAtual"
              type="password"
              required
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Alterando..." : "Alterar e-mail"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SenhaForm() {
  const [state, action, pending] = useActionState<CfgState, FormData>(
    alterarSenha,
    undefined,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alterar senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <Feedback state={state} />
          <Field label="Senha atual" htmlFor="senhaAtual">
            <Input id="senhaAtual" name="senhaAtual" type="password" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nova senha" htmlFor="novaSenha">
              <Input id="novaSenha" name="novaSenha" type="password" required />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="confirmar">
              <Input id="confirmar" name="confirmar" type="password" required />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
