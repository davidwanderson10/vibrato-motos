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
  tipoValor: string; // "fixo" | "percentual"
  categoria: string;
  descricao: string | null;
  valor: string;
  percentual: string | null;
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
  const [tipo, setTipo] = useState<string>(d?.tipoValor ?? "fixo");

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="id" value={d!.id} />}

      {/* Tipo de valor */}
      <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-border">
        {(["fixo", "percentual"] as const).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setTipo(op)}
            className={
              "px-4 py-1.5 text-sm font-medium " +
              (tipo === op ? "bg-brand text-brand-fg" : "bg-surface text-muted") +
              (op === "percentual" ? " border-l border-border" : "")
            }
          >
            {op === "fixo" ? "Valor fixo" : "% do faturamento"}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipoValor" value={tipo} />

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
        {tipo === "fixo" ? (
          <Field label="Valor (R$)" htmlFor="valor">
            <Input
              id="valor"
              name="valor"
              type="number"
              step="0.01"
              defaultValue={d?.valor ?? ""}
            />
          </Field>
        ) : (
          <Field
            label="Percentual (%)"
            htmlFor="percentual"
            hint="Ex.: 6 = 6% dos aluguéis recebidos de cada moto no mês."
          >
            <Input
              id="percentual"
              name="percentual"
              type="number"
              step="0.001"
              placeholder="6"
              defaultValue={d?.percentual ?? ""}
            />
          </Field>
        )}
      </div>

      {tipo === "fixo" ? (
        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Frequência" htmlFor="frequencia">
            <Select id="frequencia" name="frequencia" defaultValue={d?.frequencia ?? "mensal"}>
              <option value="diario">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
            </Select>
          </Field>
        </div>
      ) : (
        <>
          <Field
            label="Dia do vencimento (mensal)"
            htmlFor="primeiraData"
            hint="Dia em que o imposto vence a cada mês. Calculado sobre os aluguéis do mês."
          >
            <Input
              id="primeiraData"
              name="primeiraData"
              type="date"
              required
              defaultValue={d?.primeiraData ?? ""}
            />
          </Field>
          <input type="hidden" name="frequencia" value="mensal" />
        </>
      )}

      {tipo === "fixo" ? (
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
      ) : (
        <>
          <p className="mb-3 rounded-lg bg-background px-3 py-2 text-xs text-muted">
            Aplica a <strong>todas as motos</strong> automaticamente — gera 1 linha
            por moto que teve aluguel no mês (cai no resultado por veículo).
          </p>
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
        </>
      )}

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
