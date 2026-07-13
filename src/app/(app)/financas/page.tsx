import { subDays } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { porVeiculoWhere, veiculoWhere, isInvestidor } from "@/lib/permissoes";
import { PageHeader } from "@/components/app-shell/page-header";
import { MotoFilter } from "@/components/moto-filter";
import { ExcelButton } from "@/components/ui/excel-button";
import { ViewButton } from "@/components/ui/view-button";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import {
  categoriaLabel,
  formaPagamentoLabel,
  statusTransacaoLabel,
  statusTransacaoTone,
} from "@/lib/enums";
import { formatBRL } from "@/lib/utils";
import { chaveDia } from "@/lib/pagamentos";
import { parseDateOnly } from "@/lib/utils";
import {
  NovaTransacaoButton,
  type TransacaoDTO,
} from "./transacao-form";
import { RowActions } from "./row-actions";
import { ContasButton } from "./contas-manager";

type SP = {
  tipo?: string;
  status?: string;
  forma?: string;
  de?: string;
  ate?: string;
  dias?: string;
  motos?: string;
};

function fmtDia(d: Date | null): string {
  if (!d) return "—";
  const [y, m, day] = chaveDia(d).split("-");
  return `${day}/${m}/${y}`;
}

export default async function FinancasPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const usuario = await requireScreen("financas");
  const investidor = isInvestidor(usuario);
  const escopo = porVeiculoWhere(usuario);
  const sp = await searchParams;
  const loc = usuario.locadoraId;

  const dias = [30, 60, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 30;

  const motosSel = (sp.motos ?? "").split(",").filter(Boolean);
  const motoFilter = motosSel.length ? { veiculoId: { in: motosSel } } : {};

  // Query string dos filtros atuais para o export.
  const exportQs = new URLSearchParams();
  for (const k of ["tipo", "status", "forma", "de", "ate", "motos"] as const) {
    if (sp[k]) exportQs.set(k, sp[k] as string);
  }

  // ---- Filtros do histórico ----
  const where: Prisma.TransacaoWhereInput = {
    locadoraId: loc,
    ...escopo,
    ...motoFilter,
  };
  if (sp.tipo === "entrada" || sp.tipo === "saida") where.tipo = sp.tipo;
  if (["pendente", "pago", "cancelado"].includes(sp.status ?? ""))
    where.status = sp.status as never;
  if (
    ["pix", "boleto", "cartao_credito", "cartao_debito", "ted", "especie"].includes(
      sp.forma ?? "",
    )
  )
    where.formaPagamento = sp.forma as never;
  if (sp.de || sp.ate) {
    where.dataVencimento = {};
    if (sp.de) where.dataVencimento.gte = parseDateOnly(sp.de);
    if (sp.ate) where.dataVencimento.lte = parseDateOnly(sp.ate);
  }

  const transacoes = await prisma.transacao.findMany({
    where,
    include: {
      contaBancaria: { select: { banco: true } },
      locacao: {
        select: {
          cliente: { select: { nome: true } },
          veiculo: { select: { placa: true } },
        },
      },
    },
    orderBy: [{ dataVencimento: "desc" }, { criadoEm: "desc" }],
    take: 300,
  });

  // ---- Indicadores (realizados no período) ----
  const desde = subDays(new Date(), dias);
  const [entradasAgg, saidasAgg, aReceberAgg, aPagarAgg] = await Promise.all([
    prisma.transacao.aggregate({
      _sum: { valor: true },
      where: { locadoraId: loc, tipo: "entrada", status: "pago", dataPagamento: { gte: desde }, ...escopo, ...motoFilter },
    }),
    prisma.transacao.aggregate({
      _sum: { valor: true },
      where: { locadoraId: loc, tipo: "saida", status: "pago", dataPagamento: { gte: desde }, ...escopo, ...motoFilter },
    }),
    prisma.transacao.aggregate({
      _sum: { valor: true },
      where: { locadoraId: loc, tipo: "entrada", status: "pendente", ...escopo, ...motoFilter },
    }),
    prisma.transacao.aggregate({
      _sum: { valor: true },
      where: { locadoraId: loc, tipo: "saida", status: "pendente", ...escopo, ...motoFilter },
    }),
  ]);
  const entradas = Number(entradasAgg._sum.valor ?? 0);
  const saidas = Number(saidasAgg._sum.valor ?? 0);
  const lucro = entradas - saidas;
  const margem = entradas > 0 ? (lucro / entradas) * 100 : 0;
  const aReceber = Number(aReceberAgg._sum.valor ?? 0);
  const aPagar = Number(aPagarAgg._sum.valor ?? 0);

  // ---- Resultado por veículo (no período) ----
  const veiculos = await prisma.veiculo.findMany({
    where: { locadoraId: loc, ...veiculoWhere(usuario) },
    select: { id: true, placa: true, marca: true, modelo: true },
    orderBy: { placa: "asc" },
  });
  const grupos = await prisma.transacao.groupBy({
    by: ["veiculoId", "tipo"],
    _sum: { valor: true },
    where: {
      locadoraId: loc,
      status: "pago",
      dataPagamento: { gte: desde },
      veiculoId: { not: null },
      ...escopo,
      ...motoFilter,
    },
  });
  const somaMap = new Map<string, { receita: number; despesa: number }>();
  for (const g of grupos) {
    if (!g.veiculoId) continue;
    const cur = somaMap.get(g.veiculoId) ?? { receita: 0, despesa: 0 };
    if (g.tipo === "entrada") cur.receita += Number(g._sum.valor ?? 0);
    else cur.despesa += Number(g._sum.valor ?? 0);
    somaMap.set(g.veiculoId, cur);
  }
  const motosBase = motosSel.length
    ? veiculos.filter((v) => motosSel.includes(v.id))
    : veiculos;
  const resultadoPorVeiculo = motosBase
    .map((v) => {
      const s = somaMap.get(v.id) ?? { receita: 0, despesa: 0 };
      return {
        id: v.id,
        placa: v.placa,
        modelo: [v.marca, v.modelo].filter(Boolean).join(" "),
        receita: s.receita,
        despesa: s.despesa,
        lucro: s.receita - s.despesa,
      };
    })
    .sort((a, b) => b.lucro - a.lucro);

  const motoOpts = veiculos.map((v) => ({ id: v.id, placa: v.placa }));

  // ---- Opções para formulário ----
  const [contas, locacoes] = await Promise.all([
    prisma.contaBancaria.findMany({
      where: { locadoraId: loc },
      orderBy: { banco: "asc" },
    }),
    prisma.locacao.findMany({
      where: { locadoraId: loc },
      select: {
        id: true,
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true } },
      },
      orderBy: { criadoEm: "desc" },
      take: 100,
    }),
  ]);
  const contasOpt = contas.map((c) => ({ id: c.id, label: c.banco }));
  const locacoesOpt = locacoes.map((l) => ({
    id: l.id,
    label: `${l.cliente.nome} · ${l.veiculo.placa}`,
  }));

  return (
    <>
      <PageHeader
        title="Finanças"
        subtitle="Entradas, saídas e fluxo de caixa"
        action={
          <div className="flex gap-2">
            <ExcelButton href={`/api/export/financas?${exportQs.toString()}`} />
            {!investidor && (
              <>
                <ContasButton
                  contas={contas.map((c) => ({
                    id: c.id,
                    banco: c.banco,
                    agencia: c.agencia,
                    conta: c.conta,
                    tipo: c.tipo,
                  }))}
                />
                <NovaTransacaoButton contas={contasOpt} locacoes={locacoesOpt} />
              </>
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`Entradas (${dias}d)`}
          value={formatBRL(entradas)}
          accent="success"
        />
        <StatCard
          label={`Saídas (${dias}d)`}
          value={formatBRL(saidas)}
          accent="danger"
        />
        <StatCard
          label="Lucro líquido"
          value={formatBRL(lucro)}
          accent={lucro >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Margem de lucro"
          value={`${margem.toFixed(1)}%`}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="A receber (pendente)" value={formatBRL(aReceber)} accent="warning" />
        <StatCard label="A pagar (pendente)" value={formatBRL(aPagar)} accent="warning" />
      </div>

      <MotoFilter motos={motoOpts} selected={motosSel} />

      {resultadoPorVeiculo.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-muted">
            Resultado por veículo ({dias} dias) — ordenado por lucro
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
                  <Td className="font-medium">
                    {r.placa}
                    {r.modelo && (
                      <span className="block text-xs text-muted">
                        {r.modelo}
                      </span>
                    )}
                  </Td>
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

      {/* Filtros */}
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <Select name="tipo" defaultValue={sp.tipo ?? ""} className="w-32">
          <option value="">Tipo</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""} className="w-32">
          <option value="">Status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
        </Select>
        <Select name="forma" defaultValue={sp.forma ?? ""} className="w-36">
          <option value="">Forma</option>
          {Object.entries(formaPagamentoLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input type="date" name="de" defaultValue={sp.de ?? ""} className="w-40" />
        <Input type="date" name="ate" defaultValue={sp.ate ?? ""} className="w-40" />
        <Select name="dias" defaultValue={String(dias)} className="w-40">
          <option value="30">Indicadores: 30d</option>
          <option value="60">Indicadores: 60d</option>
          <option value="90">Indicadores: 90d</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {transacoes.length === 0 ? (
        <EmptyState>
          Nenhum lançamento encontrado. Clique em{" "}
          <strong>Novo lançamento</strong> para registrar uma entrada ou saída.
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Tipo</Th>
              <Th>Categoria</Th>
              <Th className="text-right">Valor</Th>
              <Th>Status</Th>
              <Th>Forma</Th>
              <Th>Conta</Th>
              <Th>Vínculo</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <tbody>
            {transacoes.map((t) => {
              const dto: TransacaoDTO = {
                id: t.id,
                tipo: t.tipo,
                categoria: t.categoria,
                valor: t.valor.toString(),
                dataVencimento: t.dataVencimento
                  ? chaveDia(t.dataVencimento)
                  : null,
                dataPagamento: t.dataPagamento
                  ? chaveDia(t.dataPagamento)
                  : null,
                status: t.status,
                formaPagamento: t.formaPagamento,
                contaBancariaId: t.contaBancariaId,
                locacaoId: t.locacaoId,
                observacao: t.observacao,
              };
              const entrada = t.tipo === "entrada";
              return (
                <Tr key={t.id}>
                  <Td className="whitespace-nowrap">
                    {fmtDia(t.dataPagamento ?? t.dataVencimento)}
                  </Td>
                  <Td>
                    <Badge tone={entrada ? "success" : "danger"}>
                      {entrada ? "Entrada" : "Saída"}
                    </Badge>
                  </Td>
                  <Td>
                    {categoriaLabel[t.categoria] ?? t.categoria}
                    {t.observacao && (
                      <span className="block text-xs text-muted">
                        {t.observacao}
                      </span>
                    )}
                  </Td>
                  <Td
                    className={`text-right font-semibold ${
                      entrada ? "text-success" : "text-danger"
                    }`}
                  >
                    {entrada ? "+" : "−"} {formatBRL(t.valor.toString())}
                  </Td>
                  <Td>
                    <Badge tone={statusTransacaoTone[t.status]}>
                      {statusTransacaoLabel[t.status]}
                    </Badge>
                  </Td>
                  <Td>{t.formaPagamento ? formaPagamentoLabel[t.formaPagamento] : "—"}</Td>
                  <Td>{t.contaBancaria?.banco ?? "—"}</Td>
                  <Td className="text-xs text-muted">
                    {t.locacao
                      ? `${t.locacao.cliente.nome} · ${t.locacao.veiculo.placa}`
                      : "—"}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <ViewButton
                        title={`Lançamento — ${categoriaLabel[t.categoria] ?? t.categoria}`}
                        rows={[
                          { label: "Data", value: fmtDia(t.dataPagamento ?? t.dataVencimento) },
                          { label: "Tipo", value: entrada ? "Entrada" : "Saída" },
                          { label: "Categoria", value: categoriaLabel[t.categoria] ?? t.categoria },
                          { label: "Valor", value: formatBRL(t.valor.toString()) },
                          { label: "Status", value: statusTransacaoLabel[t.status] },
                          { label: "Forma", value: t.formaPagamento ? formaPagamentoLabel[t.formaPagamento] : "—" },
                          { label: "Conta", value: t.contaBancaria?.banco },
                          { label: "Vínculo", value: t.locacao ? `${t.locacao.cliente.nome} · ${t.locacao.veiculo.placa}` : "—" },
                          { label: "Observação", value: t.observacao },
                        ]}
                      />
                      {!investidor && (
                        <RowActions
                          transacao={dto}
                          contas={contasOpt}
                          locacoes={locacoesOpt}
                        />
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
