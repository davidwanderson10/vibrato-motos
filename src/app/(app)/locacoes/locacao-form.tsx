"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import {
  createLocacao,
  updateLocacao,
  type LocacaoFormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export interface Opcao {
  id: string;
  label: string;
}

export interface LocacaoDTO {
  id: string;
  veiculoId: string;
  clienteId: string;
  valorAluguel: string;
  valorCaucao: string | null;
  multaAtraso: string | null;
  jurosMes: string | null;
  dataInicio: string; // yyyy-mm-ddThh:mm
  dataProximoPagamento: string | null; // yyyy-mm-dd
  tempoMinimoDias: number | null;
  frequenciaPagamento: string;
  localRetirada: string | null;
  localDevolucao: string | null;
  kmEntrega: number | null;
  nivelCombustivel: string | null;
  franquiaKmDiaria: number | null;
  raioCirculacao: string | null;
  atendenteId: string | null;
  seguroTerceiros: boolean;
  promessaCompra: boolean;
  caucaoPendente: boolean;
  caucaoParcelada: boolean;
  status: string;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-4 border-b border-border pb-1 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  );
}

function LocacaoForm({
  veiculos,
  clientes,
  atendentes,
  locacao,
  onDone,
}: {
  veiculos: Opcao[];
  clientes: Opcao[];
  atendentes: Opcao[];
  locacao?: LocacaoDTO;
  onDone: () => void;
}) {
  const isEdit = !!locacao;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    LocacaoFormState,
    FormData
  >(isEdit ? updateLocacao : createLocacao, undefined);
  const [clienteMode, setClienteMode] = useState<"existente" | "novo">(
    isEdit || clientes.length > 0 ? "existente" : "novo",
  );

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const l = locacao;

  return (
    <form action={formAction}>
      {isEdit && <input type="hidden" name="id" value={l!.id} />}
      {!isEdit && (
        <input type="hidden" name="clienteMode" value={clienteMode} />
      )}

      <SectionTitle>Veículo e locatário</SectionTitle>
      <Field label="Veículo" htmlFor="veiculoId">
        <Select
          id="veiculoId"
          name="veiculoId"
          required
          defaultValue={l?.veiculoId ?? ""}
        >
          <option value="" disabled>
            Selecione um veículo...
          </option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
      </Field>

      {!isEdit && (
        <div className="mb-2 inline-flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setClienteMode("existente")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium",
              clienteMode === "existente"
                ? "bg-brand text-brand-fg"
                : "bg-surface text-muted",
            )}
          >
            Cliente existente
          </button>
          <button
            type="button"
            onClick={() => setClienteMode("novo")}
            className={cn(
              "border-l border-border px-3 py-1.5 text-sm font-medium",
              clienteMode === "novo"
                ? "bg-brand text-brand-fg"
                : "bg-surface text-muted",
            )}
          >
            Novo cliente
          </button>
        </div>
      )}

      {clienteMode === "existente" ? (
        <Field label="Locatário" htmlFor="clienteId">
          <Select
            id="clienteId"
            name="clienteId"
            defaultValue={l?.clienteId ?? ""}
          >
            <option value="" disabled>
              Selecione o cliente...
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" htmlFor="novoNome">
              <Input id="novoNome" name="novoNome" />
            </Field>
            <Field label="CPF" htmlFor="novoCpf">
              <Input id="novoCpf" name="novoCpf" />
            </Field>
            <Field label="Telefone" htmlFor="novoTelefone">
              <Input id="novoTelefone" name="novoTelefone" />
            </Field>
            <Field label="E-mail" htmlFor="novoEmail">
              <Input id="novoEmail" name="novoEmail" type="email" />
            </Field>
            <Field label="CNH" htmlFor="novoCnh">
              <Input id="novoCnh" name="novoCnh" />
            </Field>
          </div>
        </div>
      )}

      <SectionTitle>Valores</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor do aluguel (R$)" htmlFor="valorAluguel">
          <Input
            id="valorAluguel"
            name="valorAluguel"
            type="number"
            step="0.01"
            required
            defaultValue={l?.valorAluguel ?? ""}
          />
        </Field>
        <Field label="Caução (R$)" htmlFor="valorCaucao">
          <Input
            id="valorCaucao"
            name="valorCaucao"
            type="number"
            step="0.01"
            defaultValue={l?.valorCaucao ?? ""}
          />
        </Field>
        <Field label="Multa por atraso (R$)" htmlFor="multaAtraso">
          <Input
            id="multaAtraso"
            name="multaAtraso"
            type="number"
            step="0.01"
            defaultValue={l?.multaAtraso ?? ""}
          />
        </Field>
        <Field label="Juros ao mês (%)" htmlFor="jurosMes">
          <Input
            id="jurosMes"
            name="jurosMes"
            type="number"
            step="0.01"
            defaultValue={l?.jurosMes ?? ""}
          />
        </Field>
      </div>

      <SectionTitle>Prazos e pagamento</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início da locação" htmlFor="dataInicio">
          <Input
            id="dataInicio"
            name="dataInicio"
            type="datetime-local"
            required
            defaultValue={l?.dataInicio ?? ""}
          />
        </Field>
        <Field label="Próximo pagamento" htmlFor="dataProximoPagamento">
          <Input
            id="dataProximoPagamento"
            name="dataProximoPagamento"
            type="date"
            defaultValue={l?.dataProximoPagamento ?? ""}
          />
        </Field>
        <Field label="Frequência" htmlFor="frequenciaPagamento">
          <Select
            id="frequenciaPagamento"
            name="frequenciaPagamento"
            defaultValue={l?.frequenciaPagamento ?? "mensal"}
          >
            <option value="diario">Diária</option>
            <option value="semanal">Semanal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="mensal">Mensal</option>
          </Select>
        </Field>
        <Field label="Tempo mínimo (dias)" htmlFor="tempoMinimoDias">
          <Input
            id="tempoMinimoDias"
            name="tempoMinimoDias"
            type="number"
            placeholder="Ex.: 30"
            defaultValue={l?.tempoMinimoDias ?? ""}
          />
        </Field>
      </div>

      <SectionTitle>Operacional</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Local de retirada" htmlFor="localRetirada">
          <Input
            id="localRetirada"
            name="localRetirada"
            defaultValue={l?.localRetirada ?? ""}
          />
        </Field>
        <Field label="Local de devolução" htmlFor="localDevolucao">
          <Input
            id="localDevolucao"
            name="localDevolucao"
            defaultValue={l?.localDevolucao ?? ""}
          />
        </Field>
        <Field label="KM na entrega" htmlFor="kmEntrega">
          <Input
            id="kmEntrega"
            name="kmEntrega"
            type="number"
            defaultValue={l?.kmEntrega ?? ""}
          />
        </Field>
        <Field label="Nível de combustível" htmlFor="nivelCombustivel">
          <Input
            id="nivelCombustivel"
            name="nivelCombustivel"
            placeholder="Ex.: 1/2, cheio"
            defaultValue={l?.nivelCombustivel ?? ""}
          />
        </Field>
        <Field label="Franquia de KM diária" htmlFor="franquiaKmDiaria">
          <Input
            id="franquiaKmDiaria"
            name="franquiaKmDiaria"
            type="number"
            defaultValue={l?.franquiaKmDiaria ?? ""}
          />
        </Field>
        <Field label="Raio de circulação" htmlFor="raioCirculacao">
          <Input
            id="raioCirculacao"
            name="raioCirculacao"
            placeholder="Ex.: 100 km"
            defaultValue={l?.raioCirculacao ?? ""}
          />
        </Field>
        <Field label="Atendente responsável" htmlFor="atendenteId">
          <Select
            id="atendenteId"
            name="atendenteId"
            defaultValue={l?.atendenteId ?? ""}
          >
            <option value="">Eu mesmo</option>
            {atendentes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Situação" htmlFor="status">
          <Select
            id="status"
            name="status"
            defaultValue={l?.status ?? "ativa"}
          >
            <option value="ativa">Ativa (retirada agora)</option>
            <option value="agendada">Agendada (retirada futura)</option>
            {isEdit && <option value="encerrada">Encerrada</option>}
          </Select>
        </Field>
      </div>

      <SectionTitle>Opções</SectionTitle>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="seguroTerceiros"
            defaultChecked={l?.seguroTerceiros}
          />{" "}
          Seguro p/ terceiros
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="promessaCompra"
            defaultChecked={l?.promessaCompra}
          />{" "}
          Promessa de compra
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="caucaoPendente"
            defaultChecked={l?.caucaoPendente}
          />{" "}
          Caução pendente
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="caucaoParcelada"
            defaultChecked={l?.caucaoParcelada}
          />{" "}
          Caução parcelada
        </label>
      </div>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending || (!isEdit && veiculos.length === 0)}
        >
          {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar locação"}
        </Button>
      </div>
    </form>
  );
}

export function NovaLocacaoButton(props: {
  veiculos: Opcao[];
  clientes: Opcao[];
  atendentes: Opcao[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova locação
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova locação" wide>
        <LocacaoForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditarLocacaoButton(props: {
  veiculos: Opcao[];
  clientes: Opcao[];
  atendentes: Opcao[];
  locacao: LocacaoDTO;
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
        title="Editar locação"
        wide
      >
        <LocacaoForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
