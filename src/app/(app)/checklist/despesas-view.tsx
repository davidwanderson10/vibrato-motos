import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { categoriaLabel, frequenciaLabel } from "@/lib/enums";
import { datasVencimento, chaveDia, type Frequencia } from "@/lib/pagamentos";
import { Calendario } from "./calendario";
import { PagarDespesa } from "./pagar-despesa";
import { NovaDespesaButton, DespesaRowActions, type DespesaDTO } from "./despesa-form";

interface DItem {
  despesaId: string;
  dia: string;
  pago: boolean;
  titulo: string;
  veicPlaca: string | null;
  valorEsperado: string;
  pagoValor: string | null;
  pagoData: string | null;
  pagoForma: string | null;
  pagoObs: string | null;
}

export async function DespesasView({
  locadoraId,
  mesDate,
  view,
}: {
  locadoraId: string;
  mesDate: Date;
  view: "lista" | "calendario";
}) {
  const inicioMes = startOfMonth(mesDate);
  const fimMes = endOfMonth(mesDate);

  const [despesas, contas] = await Promise.all([
    prisma.despesaRecorrente.findMany({
      where: { locadoraId },
      include: { veiculo: { select: { placa: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.contaBancaria.findMany({
      where: { locadoraId },
      orderBy: { banco: "asc" },
    }),
  ]);

  // Pagamentos já lançados no mês (vinculados a despesas recorrentes).
  const pagos = await prisma.transacao.findMany({
    where: {
      locadoraId,
      despesaRecorrenteId: { not: null },
      dataVencimento: { gte: inicioMes, lte: fimMes },
    },
    select: {
      despesaRecorrenteId: true,
      dataVencimento: true,
      valor: true,
      dataPagamento: true,
      formaPagamento: true,
      observacao: true,
    },
  });
  const pagosMap = new Map<
    string,
    { valor: string; data: string | null; forma: string | null; obs: string | null }
  >();
  for (const p of pagos) {
    if (!p.despesaRecorrenteId || !p.dataVencimento) continue;
    pagosMap.set(`${p.despesaRecorrenteId}|${chaveDia(p.dataVencimento)}`, {
      valor: p.valor.toString(),
      data: p.dataPagamento ? chaveDia(p.dataPagamento) : null,
      forma: p.formaPagamento,
      obs: p.observacao,
    });
  }

  // Gera as ocorrências esperadas do mês (só das despesas ativas).
  const itens: DItem[] = [];
  for (const d of despesas) {
    if (!d.ativa) continue;
    const catLabel = categoriaLabel[d.categoria] ?? d.categoria;
    const titulo = d.veiculo ? `${catLabel} · ${d.veiculo.placa}` : catLabel;
    const dues = datasVencimento(
      d.primeiraData,
      d.frequencia as Frequencia,
      inicioMes,
      fimMes,
    );
    for (const dd of dues) {
      const dia = chaveDia(dd);
      const pg = pagosMap.get(`${d.id}|${dia}`);
      itens.push({
        despesaId: d.id,
        dia,
        pago: !!pg,
        titulo,
        veicPlaca: d.veiculo?.placa ?? null,
        valorEsperado: d.valor.toString(),
        pagoValor: pg?.valor ?? null,
        pagoData: pg?.data ?? null,
        pagoForma: pg?.forma ?? null,
        pagoObs: pg?.obs ?? null,
      });
    }
  }
  itens.sort((a, b) => a.dia.localeCompare(b.dia));

  const totalEsperado = itens.reduce((s, i) => s + Number(i.valorEsperado), 0);
  const totalPago = itens
    .filter((i) => i.pago)
    .reduce((s, i) => s + Number(i.pagoValor ?? 0), 0);
  const totalPendente = itens
    .filter((i) => !i.pago)
    .reduce((s, i) => s + Number(i.valorEsperado), 0);

  const veiculosOpt = (
    await prisma.veiculo.findMany({
      where: { locadoraId },
      select: { id: true, placa: true, marca: true, modelo: true },
      orderBy: { placa: "asc" },
    })
  ).map((v) => ({
    id: v.id,
    label: [v.placa, v.marca, v.modelo].filter(Boolean).join(" · "),
  }));
  const contasOpt = contas.map((c) => ({ id: c.id, label: c.banco }));

  const chips = new Map<string, React.ReactNode[]>();
  for (const i of itens) {
    const arr = chips.get(i.dia) ?? [];
    arr.push(<PagarDespesa key={`${i.despesaId}-${i.dia}`} {...i} variant="chip" />);
    chips.set(i.dia, arr);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <NovaDespesaButton veiculos={veiculosOpt} contas={contasOpt} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Previsto no mês" value={formatBRL(totalEsperado)} />
        <StatCard label="Pago" value={formatBRL(totalPago)} accent="success" />
        <StatCard
          label="Pendente"
          value={formatBRL(totalPendente)}
          accent={totalPendente > 0 ? "warning" : undefined}
        />
      </div>

      {itens.length === 0 ? (
        <EmptyState>
          Nenhuma despesa recorrente para este mês. Clique em{" "}
          <strong>Nova despesa recorrente</strong> para cadastrar (ex.: seguro
          todo dia 15).
        </EmptyState>
      ) : view === "lista" ? (
        <Table>
          <Thead>
            <tr>
              <Th>Vencimento</Th>
              <Th>Despesa</Th>
              <Th>Moto</Th>
              <Th>Valor</Th>
              <Th className="text-center">Pago</Th>
            </tr>
          </Thead>
          <tbody>
            {itens.map((i) => {
              const [y, m, d] = i.dia.split("-");
              return (
                <Tr key={`${i.despesaId}-${i.dia}`}>
                  <Td className="whitespace-nowrap">{`${d}/${m}/${y}`}</Td>
                  <Td className="font-medium">{i.titulo}</Td>
                  <Td>{i.veicPlaca ?? "—"}</Td>
                  <Td>{formatBRL(i.valorEsperado)}</Td>
                  <Td className="text-center">
                    <div className="flex justify-center">
                      <PagarDespesa {...i} variant="row" />
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <Calendario mesDate={mesDate} chipsPorDia={chips} />
      )}

      {/* Modelos cadastrados */}
      <h3 className="mb-2 mt-8 text-sm font-semibold text-muted">
        Despesas recorrentes cadastradas
      </h3>
      {despesas.length === 0 ? (
        <p className="text-sm text-muted">Nenhum modelo cadastrado ainda.</p>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Categoria</Th>
              <Th>Moto</Th>
              <Th>Frequência</Th>
              <Th>Valor</Th>
              <Th>Situação</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <tbody>
            {despesas.map((d) => {
              const dto: DespesaDTO = {
                id: d.id,
                categoria: d.categoria,
                descricao: d.descricao,
                valor: d.valor.toString(),
                frequencia: d.frequencia,
                primeiraData: chaveDia(d.primeiraData),
                veiculoId: d.veiculoId,
                contaBancariaId: d.contaBancariaId,
                formaPagamento: d.formaPagamento,
                ativa: d.ativa,
              };
              return (
                <Tr key={d.id}>
                  <Td className="font-medium">
                    {categoriaLabel[d.categoria] ?? d.categoria}
                    {d.descricao && (
                      <span className="block text-xs text-muted">{d.descricao}</span>
                    )}
                  </Td>
                  <Td>{d.veiculo?.placa ?? "—"}</Td>
                  <Td>{frequenciaLabel[d.frequencia]}</Td>
                  <Td>{formatBRL(d.valor.toString())}</Td>
                  <Td>
                    <Badge tone={d.ativa ? "success" : "neutral"}>
                      {d.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                  </Td>
                  <Td>
                    <DespesaRowActions despesa={dto} veiculos={veiculosOpt} contas={contasOpt} />
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
