"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { pagarDespesa, desmarcarDespesa } from "./despesas-actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { formatBRL, cn } from "@/lib/utils";
import { formaPagamentoLabel } from "@/lib/enums";

export interface PagarProps {
  despesaId: string;
  dia: string; // yyyy-mm-dd
  titulo: string; // ex.: "Seguro · ABC1D23"
  veicPlaca: string | null;
  valorEsperado: string;
  pago: boolean;
  pagoValor?: string | null;
  pagoData?: string | null;
  pagoForma?: string | null;
  pagoObs?: string | null;
  variant?: "row" | "chip";
}

function hoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function PagarDespesa(props: PagarProps) {
  const {
    despesaId,
    dia,
    titulo,
    veicPlaca,
    valorEsperado,
    pago,
    pagoValor,
    pagoData,
    pagoForma,
    pagoObs,
    variant = "row",
  } = props;

  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const [valor, setValor] = useState(pagoValor ?? valorEsperado);
  const [data, setData] = useState(pagoData ?? hoje());
  const [forma, setForma] = useState(pagoForma ?? "pix");
  const [obs, setObs] = useState(pagoObs ?? "");

  function abrir() {
    setValor(pagoValor ?? valorEsperado);
    setData(pagoData ?? hoje());
    setForma(pagoForma ?? "pix");
    setObs(pagoObs ?? "");
    setOpen(true);
  }

  function confirmar() {
    start(async () => {
      await pagarDespesa(despesaId, dia, Number(valor), data, forma, obs);
      setOpen(false);
      router.refresh();
    });
  }

  function desmarcar() {
    start(async () => {
      await desmarcarDespesa(despesaId, dia);
      setOpen(false);
      router.refresh();
    });
  }

  const [y, m, d] = dia.split("-");
  const diaBR = `${d}/${m}/${y}`;
  const comAjuste =
    pago && pagoValor && Number(pagoValor) !== Number(valorEsperado);

  const trigger =
    variant === "chip" ? (
      <button
        type="button"
        onClick={abrir}
        title={`${titulo} — clique para ${pago ? "editar" : "pagar"}`}
        className={cn(
          "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors",
          pago
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700 hover:bg-red-200",
          pending && "opacity-50",
        )}
      >
        {pago && <Check className="h-3 w-3 shrink-0" />}
        <span className="truncate">{titulo}</span>
        <span className="ml-auto shrink-0">
          {formatBRL(pago ? pagoValor : valorEsperado)}
        </span>
      </button>
    ) : pago ? (
      <button
        type="button"
        onClick={abrir}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1 text-sm font-medium text-green-700 hover:bg-green-200"
      >
        <Check className="h-4 w-4" />
        {formatBRL(pagoValor)}
        {comAjuste && <span className="text-xs">(ajustado)</span>}
      </button>
    ) : (
      <Button size="sm" variant="outline" onClick={abrir} disabled={pending}>
        Pagar
      </Button>
    );

  return (
    <>
      {trigger}
      <Modal open={open} onClose={() => setOpen(false)} title={`Pagamento — ${titulo}`}>
        <p className="mb-4 text-sm text-muted">
          {veicPlaca ? `${veicPlaca} · ` : ""}vencimento {diaBR} · previsto{" "}
          <strong className="text-foreground">{formatBRL(valorEsperado)}</strong>
        </p>

        <Field label="Valor pago (R$)" htmlFor="pd-valor" hint="Ajuste se o valor real diferiu.">
          <Input
            id="pd-valor"
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data do pagamento" htmlFor="pd-data">
            <Input
              id="pd-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Field>
          <Field label="Forma de pagamento" htmlFor="pd-forma">
            <Select id="pd-forma" value={forma} onChange={(e) => setForma(e.target.value)}>
              {Object.entries(formaPagamentoLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Observação" htmlFor="pd-obs">
          <Input
            id="pd-obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: pago com atraso"
          />
        </Field>

        <div className="mt-4 flex items-center justify-between gap-2">
          {pago ? (
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
              {pending ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
