"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Trash2, Plus } from "lucide-react";
import { uploadDocumentos, deleteDocumento, getDocumentoUrl } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export interface Opcao {
  id: string;
  label: string;
}

export function UploadDocumentoButton({
  veiculos,
  locacoes,
}: {
  veiculos: Opcao[];
  locacoes: Opcao[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nomes, setNomes] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await uploadDocumentos(fd);
      if (res?.error) {
        setErro(res.error);
      } else {
        setOpen(false);
        setNomes([]);
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo documento
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Enviar documento(s)" wide>
        <form ref={formRef} onSubmit={enviar}>
          <Field label="Arquivos (imagem ou PDF, até 10 MB cada)" htmlFor="arquivos">
            <input
              id="arquivos"
              name="arquivos"
              type="file"
              multiple
              accept="image/*,application/pdf"
              required
              onChange={(e) =>
                setNomes(Array.from(e.target.files ?? []).map((f) => f.name))
              }
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
            />
          </Field>
          {nomes.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm text-muted">
              {nomes.map((n, i) => (
                <li key={i} className="flex items-center gap-1">
                  <FileText className="h-4 w-4" /> {n}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vincular a uma moto (opcional)" htmlFor="veiculoId">
              <Select id="veiculoId" name="veiculoId" defaultValue="">
                <option value="">—</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vincular a uma locação (opcional)" htmlFor="locacaoId">
              <Select id="locacaoId" name="locacaoId" defaultValue="">
                <option value="">—</option>
                {locacoes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Descrição (opcional)" htmlFor="descricao">
            <Input id="descricao" name="descricao" placeholder="Ex.: contrato assinado, laudo..." />
          </Field>

          {erro && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{erro}</p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              <Upload className="h-4 w-4" />
              {pending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DocumentoRowActions({ id, podeExcluir }: { id: string; podeExcluir: boolean }) {
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await getDocumentoUrl(id);
            if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
          })
        }
        className="flex items-center gap-1 text-sm text-brand hover:underline"
      >
        <FileText className="h-4 w-4" />
        {pending ? "Abrindo..." : "Ver"}
      </button>
      {podeExcluir && (
        <>
          <Button
            size="sm"
            variant="ghost"
            title="Excluir"
            disabled={pending}
            onClick={() => setConfirmDel(true)}
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
          <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Excluir documento">
            <p className="text-sm text-muted">Excluir este documento permanentemente?</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDel(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await deleteDocumento(id);
                    setConfirmDel(false);
                    router.refresh();
                  })
                }
              >
                Excluir
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
