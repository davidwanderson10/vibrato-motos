"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { encerrarLocacao } from "./actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function EncerrarLocacaoButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    startTransition(async () => {
      await encerrarLocacao(id);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Encerrar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Encerrar locação">
        <p className="text-sm text-muted">
          Encerrar a locação de <strong className="text-foreground">{label}</strong>?
          O veículo voltará para <strong>disponível</strong>.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={pending}>
            {pending ? "Encerrando..." : "Encerrar locação"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
