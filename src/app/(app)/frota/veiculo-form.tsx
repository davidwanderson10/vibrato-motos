"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { saveVeiculo, type VeiculoFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { veiculoStatusLabel, veiculoStatusValues } from "@/lib/enums";

export interface VeiculoDTO {
  id: string;
  tipo: string;
  placa: string;
  renavam: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
  valorCompra: string | null;
  valorFipe: string | null;
  kmAtual: number | null;
  status: string;
  dataAquisicao: string | null; // yyyy-mm-dd
  vendedor: string | null;
  propria: boolean;
  proprietario: string | null;
}

function VeiculoForm({
  veiculo,
  onDone,
}: {
  veiculo?: VeiculoDTO;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    VeiculoFormState,
    FormData
  >(saveVeiculo, undefined);
  const [propria, setPropria] = useState(veiculo ? veiculo.propria : true);

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const v = veiculo;

  return (
    <form action={formAction}>
      {v && <input type="hidden" name="id" value={v.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" htmlFor="tipo">
          <Select id="tipo" name="tipo" defaultValue={v?.tipo ?? "moto"}>
            <option value="moto">Moto</option>
            <option value="carro">Carro</option>
          </Select>
        </Field>
        <Field label="Placa" htmlFor="placa">
          <Input
            id="placa"
            name="placa"
            defaultValue={v?.placa ?? ""}
            placeholder="ABC1D23"
            required
            className="uppercase"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca" htmlFor="marca">
          <Input id="marca" name="marca" defaultValue={v?.marca ?? ""} />
        </Field>
        <Field label="Modelo" htmlFor="modelo">
          <Input id="modelo" name="modelo" defaultValue={v?.modelo ?? ""} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Ano" htmlFor="ano">
          <Input
            id="ano"
            name="ano"
            type="number"
            defaultValue={v?.ano ?? ""}
            placeholder="2024"
          />
        </Field>
        <Field label="Cor" htmlFor="cor">
          <Input id="cor" name="cor" defaultValue={v?.cor ?? ""} />
        </Field>
        <Field label="KM atual" htmlFor="kmAtual">
          <Input
            id="kmAtual"
            name="kmAtual"
            type="number"
            defaultValue={v?.kmAtual ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor de compra (R$)" htmlFor="valorCompra">
          <Input
            id="valorCompra"
            name="valorCompra"
            type="number"
            step="0.01"
            defaultValue={v?.valorCompra ?? ""}
          />
        </Field>
        <Field label="Valor FIPE (R$)" htmlFor="valorFipe">
          <Input
            id="valorFipe"
            name="valorFipe"
            type="number"
            step="0.01"
            defaultValue={v?.valorFipe ?? ""}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Renavam" htmlFor="renavam">
          <Input id="renavam" name="renavam" defaultValue={v?.renavam ?? ""} />
        </Field>
        <Field label="Data de aquisição" htmlFor="dataAquisicao">
          <Input
            id="dataAquisicao"
            name="dataAquisicao"
            type="date"
            defaultValue={v?.dataAquisicao ?? ""}
          />
        </Field>
      </div>

      <Field label="Vendedor (onde/de quem comprou)" htmlFor="vendedor">
        <Input
          id="vendedor"
          name="vendedor"
          defaultValue={v?.vendedor ?? ""}
          placeholder="Ex.: Concessionária X, particular João..."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Própria?" htmlFor="propria">
          <Select
            id="propria"
            name="propria"
            value={propria ? "sim" : "nao"}
            onChange={(e) => setPropria(e.target.value === "sim")}
          >
            <option value="sim">Sim, é da locadora</option>
            <option value="nao">Não, é de investidor/terceiro</option>
          </Select>
        </Field>
        {!propria && (
          <Field label="Proprietário (dono)" htmlFor="proprietario">
            <Input
              id="proprietario"
              name="proprietario"
              defaultValue={v?.proprietario ?? ""}
              placeholder="Nome do investidor/dono"
            />
          </Field>
        )}
      </div>

      <Field label="Status" htmlFor="status">
        <Select
          id="status"
          name="status"
          defaultValue={v?.status ?? "disponivel"}
        >
          {veiculoStatusValues.map((s) => (
            <option key={s} value={s}>
              {veiculoStatusLabel[s]}
            </option>
          ))}
        </Select>
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

export function NovoVeiculoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo veículo
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo veículo" wide>
        <VeiculoForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditarVeiculoButton({ veiculo }: { veiculo: VeiculoDTO }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Editar ${veiculo.placa}`}
        wide
      >
        <VeiculoForm veiculo={veiculo} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
