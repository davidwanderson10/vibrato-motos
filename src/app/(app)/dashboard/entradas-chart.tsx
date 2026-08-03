"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface PontoMes {
  mes: string;
  entrada: number;
  saida: number;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function EntradasChart({ data }: { data: PontoMes[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v) =>
              (v as number).toLocaleString("pt-BR", {
                notation: "compact",
                style: "currency",
                currency: "BRL",
              })
            }
          />
          <Tooltip
            formatter={(v, name) => [brl(v as number), name === "entrada" ? "Entradas" : "Saídas"]}
            labelStyle={{ color: "#14181f" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
          <Legend
            formatter={(value) => (value === "entrada" ? "Entradas" : "Saídas")}
            wrapperStyle={{ fontSize: 13 }}
          />
          <Bar dataKey="entrada" name="entrada" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="saida" name="saida" fill="#bf0000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
