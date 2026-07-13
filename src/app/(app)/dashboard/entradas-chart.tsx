"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface PontoMes {
  mes: string;
  valor: number;
}

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
            formatter={(v) => [
              (v as number).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              }),
              "Entradas",
            ]}
            labelStyle={{ color: "#14181f" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          />
          <Bar dataKey="valor" fill="#bf0000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
