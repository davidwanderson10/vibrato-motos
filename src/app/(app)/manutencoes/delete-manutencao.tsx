"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteManutencao } from "./actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function DeleteManutencaoButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Excluir manutenção">
        <p className="text-sm text-muted">
          Excluir a manutenção de <strong className="text-foreground">{label}</strong>?
          A despesa vinculada no financeiro também será removida.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteManutencao(id);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
