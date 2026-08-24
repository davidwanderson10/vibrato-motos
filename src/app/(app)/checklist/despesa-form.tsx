"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { saveDespesa, deleteDespesa, type DespesaFormState } from "./despesas-actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { categoriaSaidaLabel, formaPagamentoLabel } from "@/lib/enums";

export interface Opcao {
  id: string;
  label: string;
}

export interface DespesaDTO {
  id: string;
  categoria: string;
  descricao: string | null;
  valor: string;
  frequencia: string;
  primeiraData: string; // yyyy-mm-dd
  veiculoId: string | null;
  contaBancariaId: string | null;
  formaPagamento: string | null;
  ativa: boolean;
}

function DespesaForm({
  veiculos,
  contas,
  despesa,
  onDone,
}: {
  veiculos: Opcao[];
  contas: Opcao[];
  despesa?: DespesaDTO;
  onDone: () => void;
}) {
  const isEdit = !!despesa;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<DespesaFormState, FormData>(
    saveDespesa,
    undefined,
  );
  const d = despesa;

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="id" value={d!.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" htmlFor="categoria">
          <Select id="categoria" name="categoria" defaultValue={d?.categoria ?? ""}>
            <option value="" disabled>
              Selecione...
            </option>
            {Object.entries(categoriaSaidaLabel).map(([v, l]) => (
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
            defaultValue={d?.valor ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Frequência" htmlFor="frequencia">
          <Select id="frequencia" name="frequencia" defaultValue={d?.frequencia ?? "mensal"}>
            <option value="diario">Diária</option>
            <option value="semanal">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
          </Select>
        </Field>
        <Field
          label="1º vencimento"
          htmlFor="primeiraData"
          hint="A recorrência parte desta data. Ex.: dia 15 → todo dia 15."
        >
          <Input
            id="primeiraData"
            name="primeiraData"
            type="date"
            required
            defaultValue={d?.primeiraData ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Vincular a uma moto (opcional)" htmlFor="veiculoId">
          <Select id="veiculoId" name="veiculoId" defaultValue={d?.veiculoId ?? ""}>
            <option value="">—</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Conta bancária (opcional)" htmlFor="contaBancariaId">
          <Select
            id="contaBancariaId"
            name="contaBancariaId"
            defaultValue={d?.contaBancariaId ?? ""}
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Forma de pagamento (opcional)" htmlFor="formaPagamento">
          <Select
            id="formaPagamento"
            name="formaPagamento"
            defaultValue={d?.formaPagamento ?? ""}
          >
            <option value="">—</option>
            {Object.entries(formaPagamentoLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição (opcional)" htmlFor="descricao">
          <Input
            id="descricao"
            name="descricao"
            defaultValue={d?.descricao ?? ""}
            placeholder="Ex.: seguro anual"
          />
        </Field>
      </div>

      <label className="mt-1 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativa"
          defaultChecked={d?.ativa ?? true}
        />{" "}
        Ativa (gera ocorrências)
      </label>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : isEdit ? "Salvar" : "Criar despesa"}
        </Button>
      </div>
    </form>
  );
}

export function NovaDespesaButton(props: { veiculos: Opcao[]; contas: Opcao[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova despesa recorrente
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova despesa recorrente" wide>
        <DespesaForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function DespesaRowActions({
  despesa,
  veiculos,
  contas,
}: {
  despesa: DespesaDTO;
  veiculos: Opcao[];
  contas: Opcao[];
}) {
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="ghost" title="Editar" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        title="Excluir"
        onClick={() => setConfirmDel(true)}
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar despesa recorrente" wide>
        <DespesaForm
          veiculos={veiculos}
          contas={contas}
          despesa={despesa}
          onDone={() => setOpen(false)}
        />
      </Modal>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Excluir despesa recorrente">
        <p className="text-sm text-muted">
          Excluir este modelo? Os lançamentos já gerados permanecem no financeiro.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDel(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteDespesa(despesa.id);
                setConfirmDel(false);
                router.refresh();
              })
            }
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
