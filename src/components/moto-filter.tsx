"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MotoOpt {
  id: string;
  placa: string;
}

/** Filtro de uma ou mais motos (dropdown com checkboxes), refletido na URL (?motos=). */
export function MotoFilter({
  motos,
  selected,
}: {
  motos: MotoOpt[];
  selected: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string[]>(selected);
  const ref = useRef<HTMLDivElement>(null);

  // Mantém o estado local sincronizado quando a URL muda por fora.
  useEffect(() => setSel(selected), [selected]);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (motos.length === 0) return null;

  function aplicar(ids: string[]) {
    const p = new URLSearchParams(sp.toString());
    if (ids.length) p.set("motos", ids.join(","));
    else p.delete("motos");
    router.push(`${pathname}?${p.toString()}`);
    setOpen(false);
  }

  function toggle(id: string) {
    setSel((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  const placaDe = (id: string) => motos.find((m) => m.id === id)?.placa ?? "";
  const resumo =
    selected.length === 0
      ? "Todas as motos"
      : selected.length <= 2
        ? selected.map(placaDe).join(", ")
        : `${selected.length} motos selecionadas`;

  const filtradas = busca.trim()
    ? motos.filter((m) =>
        m.placa.toLowerCase().includes(busca.trim().toLowerCase()),
      )
    : motos;

  return (
    <div className="mb-4">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        Filtrar por moto
      </p>
      <div ref={ref} className="relative inline-block w-full sm:w-80">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-sm shadow-sm hover:bg-background"
        >
          <span className={cn(selected.length === 0 && "text-muted")}>
            {resumo}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-xl">
            <div className="border-b border-border p-2">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar placa..."
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm focus:outline-none"
              />
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {filtradas.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted">
                  Nenhuma moto encontrada.
                </p>
              ) : (
                filtradas.map((m) => {
                  const on = sel.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-background"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          on
                            ? "border-brand bg-brand text-brand-fg"
                            : "border-border",
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      {m.placa}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border p-2">
              <button
                type="button"
                onClick={() => aplicar([])}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:bg-background"
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </button>
              <button
                type="button"
                onClick={() => aplicar(sel)}
                className="rounded-md bg-brand px-3 py-1 text-sm font-medium text-brand-fg hover:bg-brand/90"
              >
                Aplicar{sel.length ? ` (${sel.length})` : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
