import type { ReactNode } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { chaveDia } from "@/lib/pagamentos";

const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Grade mensal genérica. `chipsPorDia` mapeia yyyy-mm-dd → chips a exibir no dia. */
export function Calendario({
  mesDate,
  chipsPorDia,
}: {
  mesDate: Date;
  chipsPorDia: Map<string, ReactNode[]>;
}) {
  const inicioGrid = startOfWeek(startOfMonth(mesDate), { weekStartsOn: 0 });
  const fimGrid = endOfWeek(endOfMonth(mesDate), { weekStartsOn: 0 });
  const dias: Date[] = [];
  for (let d = inicioGrid; d <= fimGrid; d = addDays(d, 1)) dias.push(d);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-border">
          {nomesDias.map((n) => (
            <div
              key={n}
              className="px-2 py-2 text-center text-xs font-semibold uppercase text-muted"
            >
              {n}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const key = chaveDia(d);
            const doMes = isSameMonth(d, mesDate);
            const chips = chipsPorDia.get(key) ?? [];
            return (
              <div
                key={key}
                className={`min-h-24 border-b border-r border-border p-1.5 ${
                  doMes ? "" : "bg-background/50"
                }`}
              >
                <div
                  className={`mb-1 text-right text-xs ${
                    isToday(d)
                      ? "font-bold text-brand"
                      : doMes
                        ? "text-foreground"
                        : "text-muted"
                  }`}
                >
                  {format(d, "d")}
                </div>
                <div className="space-y-1">{chips}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
