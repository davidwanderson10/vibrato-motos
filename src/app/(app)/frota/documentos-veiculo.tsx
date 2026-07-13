"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Upload } from "lucide-react";
import { uploadDocumentoVeiculo, deleteDocumentoVeiculo } from "./actions";
import { Button } from "@/components/ui/button";

export interface DocItem {
  id: string;
  nome: string;
  url: string;
}

export function DocumentosVeiculo({
  veiculoId,
  docs,
}: {
  veiculoId: string;
  docs: DocItem[];
}) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function enviar(file: File) {
    setErro(null);
    const fd = new FormData();
    fd.set("veiculoId", veiculoId);
    fd.set("arquivo", file);
    start(async () => {
      const res = await uploadDocumentoVeiculo(fd);
      if (res?.error) setErro(res.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function remover(id: string) {
    start(async () => {
      await deleteDocumentoVeiculo(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted">
          Documentos ({docs.length})
        </h3>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar(f);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {pending ? "Enviando..." : "Enviar documento"}
        </Button>
      </div>

      {erro && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          Nenhum documento. Envie nota fiscal, seguro, CRLV, etc. (imagem ou PDF,
          até 10 MB).
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-muted" />
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-brand hover:underline"
              >
                {d.nome}
              </a>
              <button
                onClick={() => remover(d.id)}
                disabled={pending}
                className="text-danger hover:opacity-70"
                aria-label="Excluir documento"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
