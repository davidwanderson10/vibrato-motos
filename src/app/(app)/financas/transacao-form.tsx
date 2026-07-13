"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { saveTransacao, type TransacaoFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  categoriaEntradaLabel,
  categoriaSaidaLabel,
  formaPagamentoLabel,
} from "@/lib/enums";

export interface Opcao {
  id: string;
  label: string;
}

export interface TransacaoDTO {
  id: string;
  tipo: string;
  categoria: string;
  valor: string;
  dataVencimento: string | null;
  dataPagamento: string | null;
  status: string;
  formaPagamento: string | null;
  contaBancariaId: string | null;
  locacaoId: string | null;
  observacao: string | null;
}

function hoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function TransacaoForm({
  contas,
  locacoes,
  transacao,
  onDone,
}: {
  contas: Opcao[];
  locacoes: Opcao[];
  transacao?: TransacaoDTO;
  onDone: () => void;
}) {
  const isEdit = !!transacao;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    TransacaoFormState,
    FormData
  >(saveTransacao, undefined);

  const t = transacao;
  const [tipo, setTipo] = useState(t?.tipo ?? "entrada");
  const [status, setStatus] = useState(t?.status ?? "pago");

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const categorias = tipo === "entrada" ? categoriaEntradaLabel : categoriaSaidaLabel;

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="id" value={t!.id} />}

      <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-border">
        {(["entrada", "saida"] as const).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setTipo(op)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium",
              tipo === op
                ? op === "entrada"
                  ? "bg-success text-white"
                  : "bg-danger text-white"
                : "bg-surface text-muted",
              op === "saida" && "border-l border-border",
            )}
          >
            {op === "entrada" ? "Entrada" : "Saída"}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" htmlFor="categoria">
          <Select
            id="categoria"
            name="categoria"
            key={tipo}
            defaultValue={t?.categoria ?? ""}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {Object.entries(categorias).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor (R$)" htmlFor="valor">
          <Input
            id="valor"
            name="valor"
            type="number"
            step="0.01"
            required
            defaultValue={t?.valor ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Vencimento" htmlFor="dataVencimento">
          <Input
            id="dataVencimento"
            name="dataVencimento"
            type="date"
            defaultValue={t?.dataVencimento ?? hoje()}
          />
        </Field>
        <Field label="Situação" htmlFor="status">
          <Select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="pago">Pago / recebido</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </Field>
      </div>

      {status === "pago" && (
        <Field label="Data do pagamento" htmlFor="dataPagamento">
          <Input
            id="dataPagamento"
            name="dataPagamento"
            type="date"
            defaultValue={t?.dataPagamento ?? hoje()}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Forma de pagamento" htmlFor="formaPagamento">
          <Select
            id="formaPagamento"
            name="formaPagamento"
            defaultValue={t?.formaPagamento ?? ""}
          >
            <option value="">—</option>
            {Object.entries(formaPagamentoLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Conta bancária" htmlFor="contaBancariaId">
          <Select
            id="contaBancariaId"
            name="contaBancariaId"
            defaultValue={t?.contaBancariaId ?? ""}
          >
            <option value="">—</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Vincular a uma locação (opcional)" htmlFor="locacaoId">
        <Select
          id="locacaoId"
          name="locacaoId"
          defaultValue={t?.locacaoId ?? ""}
        >
          <option value="">—</option>
          {locacoes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Observação" htmlFor="observacao">
        <Input
          id="observacao"
          name="observacao"
          defaultValue={t?.observacao ?? ""}
        />
      </Field>

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

export function NovaTransacaoButton(props: {
  contas: Opcao[];
  locacoes: Opcao[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo lançamento
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo lançamento"
        wide
      >
        <TransacaoForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditarTransacaoButton(props: {
  contas: Opcao[];
  locacoes: Opcao[];
  transacao: TransacaoDTO;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar lançamento"
        wide
      >
        <TransacaoForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
