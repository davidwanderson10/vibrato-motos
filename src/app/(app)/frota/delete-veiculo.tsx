"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteVeiculo } from "./actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function DeleteVeiculoButton({
  id,
  placa,
}: {
  id: string;
  placa: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    startTransition(async () => {
      await deleteVeiculo(id);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Excluir veículo">
        <p className="text-sm text-muted">
          Tem certeza que deseja excluir o veículo{" "}
          <strong className="text-foreground">{placa}</strong>? Essa ação não
          pode ser desfeita.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmar} disabled={pending}>
            {pending ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
