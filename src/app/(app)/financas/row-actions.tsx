"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Ban, Trash2 } from "lucide-react";
import {
  confirmarTransacao,
  cancelarTransacao,
  deleteTransacao,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  EditarTransacaoButton,
  type TransacaoDTO,
  type Opcao,
} from "./transacao-form";

export function RowActions({
  transacao,
  contas,
  locacoes,
  veiculos,
}: {
  transacao: TransacaoDTO;
  contas: Opcao[];
  locacoes: Opcao[];
  veiculos: Opcao[];
}) {
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);
  const router = useRouter();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex items-center justify-end gap-1">
      {transacao.status === "pendente" && (
        <Button
          size="sm"
          variant="ghost"
          title="Confirmar pagamento"
          disabled={pending}
          onClick={() => run(() => confirmarTransacao(transacao.id))}
        >
          <Check className="h-4 w-4 text-success" />
        </Button>
      )}
      {transacao.status !== "cancelado" && (
        <Button
          size="sm"
          variant="ghost"
          title="Cancelar"
          disabled={pending}
          onClick={() => run(() => cancelarTransacao(transacao.id))}
        >
          <Ban className="h-4 w-4 text-warning" />
        </Button>
      )}
      <EditarTransacaoButton
        transacao={transacao}
        contas={contas}
        locacoes={locacoes}
        veiculos={veiculos}
      />
      <Button
        size="sm"
        variant="ghost"
        title="Excluir"
        disabled={pending}
        onClick={() => setConfirmDel(true)}
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>

      <Modal
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Excluir lançamento"
      >
        <p className="text-sm text-muted">
          Excluir este lançamento permanentemente?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDel(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await deleteTransacao(transacao.id);
                setConfirmDel(false);
              })
            }
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
