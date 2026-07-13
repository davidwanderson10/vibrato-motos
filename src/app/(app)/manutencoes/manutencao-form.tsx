"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, FileText, Trash2, Paperclip } from "lucide-react";
import {
  saveManutencao,
  deleteDocumentoManutencao,
  type ManutencaoFormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formaPagamentoLabel } from "@/lib/enums";

export interface Opcao {
  id: string;
  label: string;
}

export interface ManutencaoDTO {
  id: string;
  veiculoId: string;
  data: string; // yyyy-mm-dd
  kmVeiculo: number | null;
  oficina: string | null;
  descricao: string | null;
  pecasServicos: string | null;
  valor: string;
  status: string;
  pago: boolean;
  formaPagamento: string | null;
  contaBancariaId: string | null;
  documentos: { id: string; nome: string; url: string }[];
}

function hoje() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function AnexoExistente({
  doc,
}: {
  doc: { id: string; nome: string; url: string };
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <li className="flex items-center gap-2 px-3 py-1.5 text-sm">
      <FileText className="h-4 w-4 shrink-0 text-muted" />
      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 truncate text-brand hover:underline"
      >
        {doc.nome}
      </a>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await deleteDocumentoManutencao(doc.id);
            router.refresh();
          })
        }
        className="text-danger hover:opacity-70"
        aria-label="Remover anexo"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function ManutencaoForm({
  veiculos,
  contas,
  manutencao,
  onDone,
}: {
  veiculos: Opcao[];
  contas: Opcao[];
  manutencao?: ManutencaoDTO;
  onDone: () => void;
}) {
  const isEdit = !!manutencao;
  const router = useRouter();
  const [state, action, pending] = useActionState<ManutencaoFormState, FormData>(
    saveManutencao,
    undefined,
  );
  const [pago, setPago] = useState(manutencao?.pago ?? true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<string[]>([]);

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const m = manutencao;

  return (
    <form action={action}>
      {isEdit && <input type="hidden" name="id" value={m!.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Moto" htmlFor="veiculoId">
          <Select
            id="veiculoId"
            name="veiculoId"
            required
            defaultValue={m?.veiculoId ?? ""}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data do serviço" htmlFor="data">
          <Input
            id="data"
            name="data"
            type="date"
            required
            defaultValue={m?.data ?? hoje()}
          />
        </Field>
        <Field label="Quilometragem" htmlFor="kmVeiculo">
          <Input
            id="kmVeiculo"
            name="kmVeiculo"
            type="number"
            defaultValue={m?.kmVeiculo ?? ""}
          />
        </Field>
        <Field label="Onde foi feito (oficina)" htmlFor="oficina">
          <Input
            id="oficina"
            name="oficina"
            defaultValue={m?.oficina ?? ""}
            placeholder="Ex.: Oficina do João"
          />
        </Field>
      </div>

      <Field label="Descrição do serviço" htmlFor="descricao">
        <Input
          id="descricao"
          name="descricao"
          defaultValue={m?.descricao ?? ""}
          placeholder="Ex.: Revisão dos 10.000 km"
        />
      </Field>

      <Field label="Peças / serviços trocados" htmlFor="pecasServicos">
        <Textarea
          id="pecasServicos"
          name="pecasServicos"
          defaultValue={m?.pecasServicos ?? ""}
          placeholder="Ex.: óleo, filtro de óleo, relação, pastilha de freio..."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor pago (R$)" htmlFor="valor">
          <Input
            id="valor"
            name="valor"
            type="number"
            step="0.01"
            defaultValue={m?.valor ?? ""}
          />
        </Field>
        <Field label="Situação" htmlFor="status">
          <Select id="status" name="status" defaultValue={m?.status ?? "finalizada"}>
            <option value="agendada">Agendada</option>
            <option value="em_andamento">Em andamento</option>
            <option value="finalizada">Finalizada</option>
          </Select>
        </Field>
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="pago"
            checked={pago}
            onChange={(e) => setPago(e.target.checked)}
          />
          Lançar como despesa paga no financeiro
        </label>
        <p className="mt-1 text-xs text-muted">
          A manutenção vira uma saída (categoria Manutenção) vinculada à moto.
          Desmarque para lançar como conta a pagar (pendente).
        </p>
        {pago && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Forma de pagamento" htmlFor="formaPagamento" className="mb-0">
              <Select
                id="formaPagamento"
                name="formaPagamento"
                defaultValue={m?.formaPagamento ?? ""}
              >
                <option value="">—</option>
                {Object.entries(formaPagamentoLabel).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Conta bancária" htmlFor="contaBancariaId" className="mb-0">
              <Select
                id="contaBancariaId"
                name="contaBancariaId"
                defaultValue={m?.contaBancariaId ?? ""}
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
        )}
      </div>

      <div className="mt-3">
        {isEdit && m!.documentos.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-sm font-medium">Anexos</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {m!.documentos.map((doc) => (
                <AnexoExistente key={doc.id} doc={doc} />
              ))}
            </ul>
          </div>
        )}

        <input
          ref={fileRef}
          name="arquivos"
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) =>
            setAnexos([...(e.target.files ?? [])].map((f) => f.name))
          }
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" /> Anexar recibo / NF
          </Button>
          <span className="text-xs text-muted">
            {anexos.length > 0
              ? anexos.join(", ")
              : "Imagem ou PDF, até 10 MB (opcional)"}
          </span>
        </div>
      </div>

      {state?.error && (
        <p className="mb-3 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
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

export function NovaManutencaoButton(props: {
  veiculos: Opcao[];
  contas: Opcao[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova manutenção
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nova manutenção" wide>
        <ManutencaoForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditarManutencaoButton(props: {
  veiculos: Opcao[];
  contas: Opcao[];
  manutencao: ManutencaoDTO;
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
        title="Editar manutenção"
        wide
      >
        <ManutencaoForm {...props} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
