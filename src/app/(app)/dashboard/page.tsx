import { startOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { veiculoWhere, porVeiculoWhere, isInvestidor } from "@/lib/permissoes";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { MotoFilter } from "@/components/moto-filter";
import { formatBRL } from "@/lib/utils";
import { veiculoStatusLabel } from "@/lib/enums";
import { EntradasChart, type PontoMes } from "./entradas-chart";

const cargoLabel: Record<string, string> = {
  admin: "Administrador",
  socio: "Sócio",
  diretor: "Diretor",
  gerente: "Gerente",
  operador: "Operador",
  investidor: "Investidor",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ motos?: string }>;
}) {
  const usuario = await requireScreen("dashboard");
  const investidor = isInvestidor(usuario);
  const escopoV = veiculoWhere(usuario);
  const escopoL = porVeiculoWhere(usuario);
  const loc = usuario.locadoraId;
  const now = new Date();
  const inicio12 = startOfMonth(subMonths(now, 11));

  const sp = await searchParams;
  const motosSel = (sp.motos ?? "").split(",").filter(Boolean);
  const filtroVeic = motosSel.length ? { id: { in: motosSel } } : {};
  const filtroPorVeic = motosSel.length ? { veiculoId: { in: motosSel } } : {};

  // Motos do usuário para os chips de filtro (sem aplicar a seleção).
  const motosAll = await prisma.veiculo.findMany({
    where: { locadoraId: loc, ...escopoV },
    select: { id: true, placa: true },
    orderBy: { placa: "asc" },
  });

  const [veiculos, locAtivas, locEncerradas, entradas, equipe] =
    await Promise.all([
      prisma.veiculo.findMany({
        where: { locadoraId: loc, ...escopoV, ...filtroVeic },
        select: { status: true, modelo: true, marca: true },
      }),
      prisma.locacao.count({
        where: { locadoraId: loc, status: "ativa", ...escopoL, ...filtroPorVeic },
      }),
      prisma.locacao.count({
        where: {
          locadoraId: loc,
          status: "encerrada",
          ...escopoL,
          ...filtroPorVeic,
        },
      }),
      prisma.transacao.findMany({
        where: {
          locadoraId: loc,
          tipo: "entrada",
          status: "pago",
          dataPagamento: { gte: inicio12 },
          ...escopoL,
          ...filtroPorVeic,
        },
        select: { valor: true, dataPagamento: true },
      }),
      investidor
        ? Promise.resolve([])
        : prisma.usuario.findMany({
            where: { locadoraId: loc, ativo: true },
            select: { nome: true, cargo: true },
            orderBy: { criadoEm: "asc" },
          }),
    ]);

  // Resultado por veículo (12 meses) — receita, despesa, lucro.
  const gruposV = await prisma.transacao.groupBy({
    by: ["veiculoId", "tipo"],
    _sum: { valor: true },
    where: {
      locadoraId: loc,
      status: "pago",
      dataPagamento: { gte: inicio12 },
      veiculoId: { not: null },
      ...escopoL,
      ...filtroPorVeic,
    },
  });
  const somaV = new Map<string, { receita: number; despesa: number }>();
  for (const g of gruposV) {
    if (!g.veiculoId) continue;
    const cur = somaV.get(g.veiculoId) ?? { receita: 0, despesa: 0 };
    if (g.tipo === "entrada") cur.receita += Number(g._sum.valor ?? 0);
    else cur.despesa += Number(g._sum.valor ?? 0);
    somaV.set(g.veiculoId, cur);
  }
  const baseV = motosSel.length
    ? motosAll.filter((v) => motosSel.includes(v.id))
    : motosAll;
  const resultadoPorVeiculo = baseV
    .map((v) => {
      const s = somaV.get(v.id) ?? { receita: 0, despesa: 0 };
      return { id: v.id, placa: v.placa, lucro: s.receita - s.despesa, receita: s.receita, despesa: s.despesa };
    })
    .sort((a, b) => b.lucro - a.lucro);

  // Frota por status
  const porStatus = new Map<string, number>();
  for (const v of veiculos)
    porStatus.set(v.status, (porStatus.get(v.status) ?? 0) + 1);
  const disponiveis = porStatus.get("disponivel") ?? 0;
  const alugados = porStatus.get("alugado") ?? 0;
  const emManutencao = porStatus.get("em_manutencao") ?? 0;

  // Frota por modelo
  const porModelo = new Map<string, number>();
  for (const v of veiculos) {
    const nome = [v.marca, v.modelo].filter(Boolean).join(" ") || "Sem modelo";
    porModelo.set(nome, (porModelo.get(nome) ?? 0) + 1);
  }
  const modelos = [...porModelo.entries()].sort((a, b) => b[1] - a[1]);

  // Entradas 12 meses
  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM/yy", { locale: ptBR }) };
  });
  const bucket = new Map(meses.map((m) => [m.key, 0]));
  for (const e of entradas) {
    if (!e.dataPagamento) continue;
    const k = format(e.dataPagamento, "yyyy-MM");
    if (bucket.has(k)) bucket.set(k, bucket.get(k)! + Number(e.valor));
  }
  const chartData: PontoMes[] = meses.map((m) => ({
    mes: m.label,
    valor: bucket.get(m.key)!,
  }));
  const faturamentoMes = bucket.get(format(now, "yyyy-MM")) ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Olá, ${usuario.nome} — visão geral da ${usuario.locadora.nome}`}
      />

      <MotoFilter motos={motosAll} selected={motosSel} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Disponíveis" value={disponiveis} accent="success" />
        <StatCard label="Alugados" value={alugados} accent="brand" />
        <StatCard label="Em manutenção" value={emManutencao} accent="warning" />
        <StatCard label="Locações ativas" value={locAtivas} />
        <StatCard label="Faturamento do mês" value={formatBRL(faturamentoMes)} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Entradas dos últimos 12 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <EntradasChart data={chartData} />
        </CardContent>
      </Card>

      {resultadoPorVeiculo.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-muted">
            Resultado por veículo (12 meses) — ordenado por lucro
          </h3>
          <Table>
            <Thead>
              <tr>
                <Th>Moto</Th>
                <Th className="text-right">Receita</Th>
                <Th className="text-right">Despesa</Th>
                <Th className="text-right">Lucro</Th>
              </tr>
            </Thead>
            <tbody>
              {resultadoPorVeiculo.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium">{r.placa}</Td>
                  <Td className="text-right text-success">
                    {formatBRL(r.receita)}
                  </Td>
                  <Td className="text-right text-danger">
                    {formatBRL(r.despesa)}
                  </Td>
                  <Td
                    className={`text-right font-semibold ${r.lucro >= 0 ? "text-foreground" : "text-danger"}`}
                  >
                    {formatBRL(r.lucro)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Frota por status</CardTitle>
          </CardHeader>
          <CardContent>
            {veiculos.length === 0 ? (
              <p className="text-sm text-muted">Nenhum veículo cadastrado.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {[...porStatus.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([s, n]) => (
                    <li key={s} className="flex justify-between">
                      <span>{veiculoStatusLabel[s] ?? s}</span>
                      <span className="font-semibold">{n}</span>
                    </li>
                  ))}
                <li className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span>Total</span>
                  <span>{veiculos.length}</span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frota por modelo</CardTitle>
          </CardHeader>
          <CardContent>
            {modelos.length === 0 ? (
              <p className="text-sm text-muted">Nenhum veículo cadastrado.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {modelos.map(([m, n]) => (
                  <li key={m} className="flex justify-between">
                    <span className="truncate">{m}</span>
                    <span className="font-semibold">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Equipe</CardTitle>
            <Badge tone="neutral">
              {locAtivas} ativas · {locEncerradas} encerradas
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {equipe.map((u, i) => (
                <li key={i} className="flex justify-between">
                  <span>{u.nome}</span>
                  <span className="text-muted">{cargoLabel[u.cargo]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
