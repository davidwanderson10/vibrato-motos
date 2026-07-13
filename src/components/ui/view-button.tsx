"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export interface ViewRow {
  label: string;
  value?: string | number | null;
}

/** Botão de visualização (somente leitura) — abre um modal com os campos. */
export function ViewButton({
  title,
  rows,
}: {
  title: string;
  rows: ViewRow[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        title="Visualizar"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <dl className="divide-y divide-border">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between gap-4 py-2 text-sm">
              <dt className="shrink-0 text-muted">{r.label}</dt>
              <dd className="text-right font-medium">
                {r.value === null ||
                r.value === undefined ||
                r.value === ""
                  ? "—"
                  : r.value}
              </dd>
            </div>
          ))}
        </dl>
      </Modal>
    </>
  );
}
