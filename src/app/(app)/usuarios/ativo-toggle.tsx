"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleUsuarioAtivo } from "./actions";
import { Button } from "@/components/ui/button";

export function AtivoToggle({
  id,
  ativo,
  disabled,
}: {
  id: string;
  ativo: boolean;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant={ativo ? "ghost" : "outline"}
      disabled={pending || disabled}
      onClick={() =>
        start(async () => {
          await toggleUsuarioAtivo(id, !ativo);
          router.refresh();
        })
      }
    >
      {ativo ? "Desativar" : "Reativar"}
    </Button>
  );
}
