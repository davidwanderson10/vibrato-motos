"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { saveUsuario, type UsuarioFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export interface VeiculoOpt {
  id: string;
  label: string;
}

export interface UsuarioDTO {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  permissoes: string[];
  veiculoIds: string[];
}

const TELA_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  frota: "Frota",
  locacoes: "Locações",
  financas: "Finanças",
};
const TELAS = ["dashboard", "frota", "locacoes", "financas"];

function UsuarioForm({
  veiculos,
  usuario,
  onDone,
}: {
  veiculos: VeiculoOpt[];
  usuario?: UsuarioDTO;
  onDone: () => void;
}) {
  const isEdit = !!usuario;
  const router = useRouter();
  const [state, action, pending] = useActionState<UsuarioFormState, FormData>(
    saveUsuario,
    undefined,
  );
  const [cargo, setCargo] = useState(usuario?.cargo ?? "operador");

  useEffect(() => {
    if (state?.ok) {
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  const u = usuario;
  const investidor = cargo === "investidor";

  return (
    <form action={action}>
      {isEdit && <input type="hidden" name="id" value={u!.id} />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" htmlFor="nome">
          <Input id="nome" name="nome" required defaultValue={u?.nome ?? ""} />
        </Field>
        <Field label="Cargo" htmlFor="cargo">
          <Select
            id="cargo"
            name="cargo"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
          >
            <option value="admin">Administrador</option>
            <option value="socio">Sócio</option>
            <option value="diretor">Diretor</option>
            <option value="gerente">Gerente</option>
            <option value="operador">Operador</option>
            <option value="investidor">Investidor</option>
          </Select>
        </Field>
        <Field label="E-mail de acesso" htmlFor="email">
          <Input id="email" name="email" type="email" required defaultValue={u?.email ?? ""} />
        </Field>
        <Field
          label={isEdit ? "Nova senha" : "Senha inicial"}
          htmlFor="senha"
          hint={isEdit ? "Deixe em branco para manter a atual" : undefined}
        >
          <Input
            id="senha"
            name="senha"
            type="password"
            required={!isEdit}
            placeholder={isEdit ? "••••••" : ""}
          />
        </Field>
      </div>

      {investidor && (
        <div className="mt-2 rounded-lg border border-border bg-background/50 p-3">
          <p className="mb-2 text-sm font-semibold">Telas que o investidor vê</p>
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            {TELAS.map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="permissoes"
                  value={t}
                  defaultChecked={u?.permissoes.includes(t) ?? true}
                />
                {TELA_LABEL[t]}
              </label>
            ))}
          </div>

          <p className="mb-2 text-sm font-semibold">
            Motos deste investidor
          </p>
          {veiculos.length === 0 ? (
            <p className="text-xs text-muted">
              Nenhuma moto cadastrada ainda. Cadastre na Frota primeiro.
            </p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1 text-sm">
              {veiculos.map((v) => (
                <label key={v.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="veiculos"
                    value={v.id}
                    defaultChecked={u?.veiculoIds.includes(v.id)}
                  />
                  {v.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

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

export function NovoUsuarioButton({ veiculos }: { veiculos: VeiculoOpt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo usuário
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo usuário" wide>
        <UsuarioForm veiculos={veiculos} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditarUsuarioButton({
  veiculos,
  usuario,
}: {
  veiculos: VeiculoOpt[];
  usuario: UsuarioDTO;
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
        title={`Editar ${usuario.nome}`}
        wide
      >
        <UsuarioForm
          veiculos={veiculos}
          usuario={usuario}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
