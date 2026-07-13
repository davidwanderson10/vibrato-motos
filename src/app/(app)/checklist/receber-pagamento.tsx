"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { receberPagamento, desmarcarPagamento } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { formatBRL, cn } from "@/lib/utils";
import { formaPagamentoLabel } from "@/lib/enums";

export interface ReceberProps {
  locacaoId: string;
  dia: string; // yyyy-mm-dd
  clienteNome: string;
  veicPlaca: string;
  valorEsperado: string;
  recebido: boolean;
  recebidoValor?: string | null;
  recebidoData?: string | null; // yyyy-mm-dd
  recebidoForma?: string | null;
  recebidoObs?: string | null;
  variant?: "row" | "chip";
}

function hoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ReceberPagamento(props: ReceberProps) {
  const {
    locacaoId,
    dia,
    clienteNome,
    veicPlaca,
    valorEsperado,
    recebido,
    recebidoValor,
    recebidoData,
    recebidoForma,
    recebidoObs,
    variant = "row",
  } = props;

  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const [valor, setValor] = useState(recebidoValor ?? valorEsperado);
  const [data, setData] = useState(recebidoData ?? hoje());
  const [forma, setForma] = useState(recebidoForma ?? "pix");
  const [obs, setObs] = useState(recebidoObs ?? "");

  function abrir() {
    // (re)inicializa os campos ao abrir
    setValor(recebidoValor ?? valorEsperado);
    setData(recebidoData ?? hoje());
    setForma(recebidoForma ?? "pix");
    setObs(recebidoObs ?? "");
    setOpen(true);
  }

  function confirmar() {
    start(async () => {
      await receberPagamento(
        locacaoId,
        dia,
        Number(valor),
        data,
        forma,
        obs,
      );
      setOpen(false);
      router.refresh();
    });
  }

  function desmarcar() {
    start(async () => {
      await desmarcarPagamento(locacaoId, dia);
      setOpen(false);
      router.refresh();
    });
  }

  const [y, m, d] = dia.split("-");
  const diaBR = `${d}/${m}/${y}`;
  const comAjuste =
    recebido && recebidoValor && Number(recebidoValor) !== Number(valorEsperado);

  const trigger =
    variant === "chip" ? (
      <button
        type="button"
        onClick={abrir}
        title={`${clienteNome} — clique para ${recebido ? "editar" : "receber"}`}
        className={cn(
          "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors",
          recebido
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700 hover:bg-amber-200",
          pending && "opacity-50",
        )}
      >
        {recebido && <Check className="h-3 w-3 shrink-0" />}
        <span className="truncate">{clienteNome}</span>
        <span className="ml-auto shrink-0">
          {formatBRL(recebido ? recebidoValor : valorEsperado)}
        </span>
      </button>
    ) : recebido ? (
      <button
        type="button"
        onClick={abrir}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1 text-sm font-medium text-green-700 hover:bg-green-200"
      >
        <Check className="h-4 w-4" />
        {formatBRL(recebidoValor)}
        {comAjuste && <span className="text-xs">(ajustado)</span>}
      </button>
    ) : (
      <Button size="sm" variant="outline" onClick={abrir} disabled={pending}>
        Receber
      </Button>
    );

  return (
    <>
      {trigger}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Recebimento — ${clienteNome}`}
      >
        <p className="mb-4 text-sm text-muted">
          {veicPlaca} · vencimento {diaBR} · esperado{" "}
          <strong className="text-foreground">
            {formatBRL(valorEsperado)}
          </strong>
        </p>

        <Field label="Valor recebido (R$)" htmlFor="rp-valor" hint="Ajuste se houve multa, juros ou desconto.">
          <Input
            id="rp-valor"
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data do pagamento" htmlFor="rp-data">
            <Input
              id="rp-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Field>
          <Field label="Forma de pagamento" htmlFor="rp-forma">
            <Select
              id="rp-forma"
              value={forma}
              onChange={(e) => setForma(e.target.value)}
            >
              {Object.entries(formaPagamentoLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Observação" htmlFor="rp-obs">
          <Input
            id="rp-obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: multa por atraso"
          />
        </Field>

        <div className="mt-4 flex items-center justify-between gap-2">
          {recebido ? (
            <Button variant="danger" onClick={desmarcar} disabled={pending}>
              Desmarcar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={pending}>
              {pending ? "Salvando..." : "Confirmar recebimento"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
