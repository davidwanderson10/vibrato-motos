"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateCliente, type ClienteFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export interface ClienteDTO {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cnhNumero: string | null;
  cnhValidade: string | null;
  dataNascimento: string | null;
  ref1Nome: string | null;
  ref1Telefone: string | null;
  ref2Nome: string | null;
  ref2Telefone: string | null;
  status: string;
}

function ClienteForm({
  cliente,
  onDone,
}: {
  cliente: ClienteDTO;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ClienteFormState,
    FormData
  >(updateCliente, undefined);

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const c = cliente;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={c.id} />

      <Field label="Nome" htmlFor="nome">
        <Input id="nome" name="nome" required defaultValue={c.nome} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF" htmlFor="cpf">
          <Input id="cpf" name="cpf" defaultValue={c.cpf ?? ""} />
        </Field>
        <Field label="RG" htmlFor="rg">
          <Input id="rg" name="rg" defaultValue={c.rg ?? ""} />
        </Field>
        <Field label="Telefone" htmlFor="telefone">
          <Input id="telefone" name="telefone" defaultValue={c.telefone ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={c.email ?? ""} />
        </Field>
      </div>

      <h4 className="mb-2 mt-4 border-b border-border pb-1 text-sm font-semibold">
        Endereço
      </h4>
      <div className="grid grid-cols-4 gap-3">
        <Field label="CEP" htmlFor="cep" className="col-span-1">
          <Input id="cep" name="cep" defaultValue={c.cep ?? ""} />
        </Field>
        <Field label="Logradouro" htmlFor="logradouro" className="col-span-2">
          <Input
            id="logradouro"
            name="logradouro"
            defaultValue={c.logradouro ?? ""}
            placeholder="Rua / Av."
          />
        </Field>
        <Field label="Número" htmlFor="numero" className="col-span-1">
          <Input id="numero" name="numero" defaultValue={c.numero ?? ""} />
        </Field>
        <Field label="Complemento" htmlFor="complemento" className="col-span-2">
          <Input
            id="complemento"
            name="complemento"
            defaultValue={c.complemento ?? ""}
            placeholder="Apto, bloco..."
          />
        </Field>
        <Field label="Bairro" htmlFor="bairro" className="col-span-2">
          <Input id="bairro" name="bairro" defaultValue={c.bairro ?? ""} />
        </Field>
        <Field label="Cidade" htmlFor="cidade" className="col-span-3">
          <Input id="cidade" name="cidade" defaultValue={c.cidade ?? ""} />
        </Field>
        <Field label="UF" htmlFor="estado" className="col-span-1">
          <Input
            id="estado"
            name="estado"
            maxLength={2}
            defaultValue={c.estado ?? ""}
            placeholder="CE"
          />
        </Field>
      </div>

      <h4 className="mb-2 mt-4 border-b border-border pb-1 text-sm font-semibold">
        Contatos de referência
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Referência 1 — nome" htmlFor="ref1Nome">
          <Input id="ref1Nome" name="ref1Nome" defaultValue={c.ref1Nome ?? ""} />
        </Field>
        <Field label="Referência 1 — telefone" htmlFor="ref1Telefone">
          <Input
            id="ref1Telefone"
            name="ref1Telefone"
            defaultValue={c.ref1Telefone ?? ""}
          />
        </Field>
        <Field label="Referência 2 — nome" htmlFor="ref2Nome">
          <Input id="ref2Nome" name="ref2Nome" defaultValue={c.ref2Nome ?? ""} />
        </Field>
        <Field label="Referência 2 — telefone" htmlFor="ref2Telefone">
          <Input
            id="ref2Telefone"
            name="ref2Telefone"
            defaultValue={c.ref2Telefone ?? ""}
          />
        </Field>
      </div>

      <h4 className="mb-2 mt-4 border-b border-border pb-1 text-sm font-semibold">
        Documentos pessoais
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CNH (número)" htmlFor="cnhNumero">
          <Input id="cnhNumero" name="cnhNumero" defaultValue={c.cnhNumero ?? ""} />
        </Field>
        <Field label="Validade da CNH" htmlFor="cnhValidade">
          <Input
            id="cnhValidade"
            name="cnhValidade"
            type="date"
            defaultValue={c.cnhValidade ?? ""}
          />
        </Field>
        <Field label="Data de nascimento" htmlFor="dataNascimento">
          <Input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            defaultValue={c.dataNascimento ?? ""}
          />
        </Field>
        <Field label="Situação" htmlFor="status">
          <Select id="status" name="status" defaultValue={c.status}>
            <option value="ativo">Ativo</option>
            <option value="ex_cliente">Ex-cliente</option>
          </Select>
        </Field>
      </div>

      {state?.error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

export function EditarClienteButton({
  cliente,
  full,
}: {
  cliente: ClienteDTO;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {full ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" /> Editar
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Editar ${cliente.nome}`}
        wide
      >
        <ClienteForm cliente={cliente} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
