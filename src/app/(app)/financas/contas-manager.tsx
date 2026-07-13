"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Trash2 } from "lucide-react";
import { createConta, deleteConta } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export interface ContaDTO {
  id: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo: string | null;
}

export function ContasButton({ contas }: { contas: ContaDTO[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function adicionar(formData: FormData) {
    start(async () => {
      await createConta(formData);
      formRef.current?.reset();
      router.refresh();
    });
  }

  function remover(id: string) {
    start(async () => {
      await deleteConta(id);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Landmark className="h-4 w-4" /> Contas
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Contas bancárias"
      >
        {contas.length > 0 && (
          <ul className="mb-4 divide-y divide-border rounded-lg border border-border">
            {contas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>
                  <strong>{c.banco}</strong>
                  {c.agencia || c.conta ? (
                    <span className="text-muted">
                      {" "}
                      · ag {c.agencia ?? "—"} / cc {c.conta ?? "—"}
                    </span>
                  ) : null}
                  {c.tipo ? (
                    <span className="text-muted"> · {c.tipo}</span>
                  ) : null}
                </span>
                <button
                  onClick={() => remover(c.id)}
                  disabled={pending}
                  className="text-danger hover:opacity-70"
                  aria-label="Remover conta"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form ref={formRef} action={adicionar}>
          <p className="mb-2 text-sm font-medium">Adicionar conta</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Banco" htmlFor="banco">
              <Input id="banco" name="banco" required placeholder="Ex.: Nubank" />
            </Field>
            <Field label="Tipo" htmlFor="tipo">
              <Input id="tipo" name="tipo" placeholder="Corrente / Poupança" />
            </Field>
            <Field label="Agência" htmlFor="agencia">
              <Input id="agencia" name="agencia" />
            </Field>
            <Field label="Conta" htmlFor="conta">
              <Input id="conta" name="conta" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
