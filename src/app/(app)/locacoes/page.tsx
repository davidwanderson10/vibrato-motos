import { startOfMonth } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { porVeiculoWhere, isInvestidor } from "@/lib/permissoes";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { locacaoStatusLabel, locacaoStatusTone, frequenciaLabel } from "@/lib/enums";
import { formatBRL, formatDate } from "@/lib/utils";
import {
  datasVencimento,
  pagamentosPorMes,
  chaveDia,
  type Frequencia,
} from "@/lib/pagamentos";
import { NovaLocacaoButton, EditarLocacaoButton } from "./locacao-form";
import { EncerrarLocacaoButton } from "./encerrar-locacao";
import { ExcelButton } from "@/components/ui/excel-button";
import { ViewButton } from "@/components/ui/view-button";

type SP = { status?: string };

export default async function LocacoesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const usuario = await requireScreen("locacoes");
  const investidor = isInvestidor(usuario);
  const escopo = porVeiculoWhere(usuario);
  const sp = await searchParams;
  const statusFiltro =
    sp.status && ["ativa", "encerrada", "agendada"].includes(sp.status)
      ? sp.status
      : "ativa";

  const where: Prisma.LocacaoWhereInput = {
    locadoraId: usuario.locadoraId,
    status: statusFiltro as never,
    ...escopo,
  };

  const locacoes = await prisma.locacao.findMany({
    where,
    include: {
      cliente: { select: { nome: true } },
      veiculo: { select: { placa: true, marca: true, modelo: true } },
    },
    orderBy: { dataInicio: "desc" },
  });

  // ---- Indicadores ----
  const [ativas, encerradasCount] = await Promise.all([
    prisma.locacao.findMany({
      where: { locadoraId: usuario.locadoraId, status: "ativa", ...escopo },
      select: {
        id: true,
        valorAluguel: true,
        frequenciaPagamento: true,
        dataInicio: true,
        dataProximoPagamento: true,
      },
    }),
    prisma.locacao.count({
      where: { locadoraId: usuario.locadoraId, status: "encerrada", ...escopo },
    }),
  ]);

  const faturamentoProjetado = ativas.reduce(
    (s, l) =>
      s +
      Number(l.valorAluguel) *
        pagamentosPorMes(l.frequenciaPagamento as Frequencia),
    0,
  );

  // Aluguéis em atraso no mês (vencidos e não marcados como recebidos).
  const now = new Date();
  const inicioMes = startOfMonth(now);
  const pagos = await prisma.transacao.findMany({
    where: {
      locadoraId: usuario.locadoraId,
      categoria: "aluguel",
      status: "pago",
      dataVencimento: { gte: inicioMes, lte: now },
    },
    select: { locacaoId: true, dataVencimento: true },
  });
  const pagosSet = new Set(
    pagos
      .filter((p) => p.locacaoId && p.dataVencimento)
      .map((p) => `${p.locacaoId}|${chaveDia(p.dataVencimento!)}`),
  );

  let atrasoValor = 0;
  for (const l of ativas) {
    const primeira = l.dataProximoPagamento ?? l.dataInicio;
    const vencidas = datasVencimento(
      primeira,
      l.frequenciaPagamento as Frequencia,
      inicioMes,
      now,
    );
    for (const dd of vencidas) {
      if (!pagosSet.has(`${l.id}|${chaveDia(dd)}`)) {
        atrasoValor += Number(l.valorAluguel);
      }
    }
  }

  // ---- Dados para o formulário ----
  const [veiculosAll, clientes, atendentes] = await Promise.all([
    prisma.veiculo.findMany({
      where: { locadoraId: usuario.locadoraId },
      select: { id: true, placa: true, marca: true, modelo: true, status: true },
      orderBy: { placa: "asc" },
    }),
    prisma.cliente.findMany({
      where: { locadoraId: usuario.locadoraId, status: "ativo" },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: { locadoraId: usuario.locadoraId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const veiculoLabel = (v: {
    placa: string;
    marca: string | null;
    modelo: string | null;
  }) => `${v.placa} · ${[v.marca, v.modelo].filter(Boolean).join(" ") || "veículo"}`;

  const veiculosDispOpt = veiculosAll
    .filter((v) => v.status === "disponivel")
    .map((v) => ({ id: v.id, label: veiculoLabel(v) }));
  const clientesOpt = clientes.map((c) => ({ id: c.id, label: c.nome }));
  const atendentesOpt = atendentes.map((a) => ({ id: a.id, label: a.nome }));

  // Opções de veículo para edição: disponíveis + o atual da locação.
  const veiculosParaEdicao = (currentId: string) =>
    veiculosAll
      .filter((v) => v.status === "disponivel" || v.id === currentId)
      .map((v) => ({ id: v.id, label: veiculoLabel(v) }));

  const pad = (n: number) => String(n).padStart(2, "0");
  const toDatetimeLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const toDateInput = (d: Date | null) =>
    d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : null;

  return (
    <>
      <PageHeader
        title="Locações"
        subtitle="Contratos de aluguel da frota"
        action={
          <div className="flex gap-2">
            <ExcelButton
              href={`/api/export/locacoes?status=${statusFiltro}`}
            />
            {!investidor && (
              <NovaLocacaoButton
                veiculos={veiculosDispOpt}
                clientes={clientesOpt}
                atendentes={atendentesOpt}
              />
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Locações ativas" value={ativas.length} accent="success" />
        <StatCard label="Encerradas" value={encerradasCount} />
        <StatCard
          label="Faturamento mensal projetado"
          value={formatBRL(faturamentoProjetado)}
        />
        <StatCard
          label="Aluguéis em atraso (mês)"
          value={formatBRL(atrasoValor)}
          accent={atrasoValor > 0 ? "danger" : undefined}
        />
      </div>

      {/* Filtro por situação */}
      <form className="mb-4 flex items-end gap-3">
        <Select name="status" defaultValue={statusFiltro} className="sm:w-52">
          <option value="ativa">Ativas</option>
          <option value="agendada">Agendadas</option>
          <option value="encerrada">Encerradas</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {locacoes.length === 0 ? (
        <EmptyState>
          Nenhuma locação {locacaoStatusLabel[statusFiltro].toLowerCase()}.
          Clique em <strong>Nova locação</strong> para criar.
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Locatário</Th>
              <Th>Veículo</Th>
              <Th>Aluguel</Th>
              <Th>Frequência</Th>
              <Th>Início</Th>
              <Th>Próx. pagamento</Th>
              <Th>Situação</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <tbody>
            {locacoes.map((l) => (
              <Tr key={l.id}>
                <Td className="font-medium">{l.cliente.nome}</Td>
                <Td>
                  <span className="font-semibold">{l.veiculo.placa}</span>
                  <span className="block text-xs text-muted">
                    {[l.veiculo.marca, l.veiculo.modelo]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </Td>
                <Td>{formatBRL(l.valorAluguel.toString())}</Td>
                <Td>{frequenciaLabel[l.frequenciaPagamento]}</Td>
                <Td>{formatDate(l.dataInicio)}</Td>
                <Td>{formatDate(l.dataProximoPagamento)}</Td>
                <Td>
                  <Badge tone={locacaoStatusTone[l.status]}>
                    {locacaoStatusLabel[l.status]}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <ViewButton
                      title={`Locação — ${l.cliente.nome}`}
                      rows={[
                        { label: "Locatário", value: l.cliente.nome },
                        { label: "Veículo", value: `${l.veiculo.placa} ${[l.veiculo.marca, l.veiculo.modelo].filter(Boolean).join(" ")}` },
                        { label: "Aluguel", value: formatBRL(l.valorAluguel.toString()) },
                        { label: "Caução", value: l.valorCaucao ? formatBRL(l.valorCaucao.toString()) : "—" },
                        { label: "Multa por atraso", value: l.multaAtraso ? formatBRL(l.multaAtraso.toString()) : "—" },
                        { label: "Juros ao mês", value: l.jurosMes ? `${l.jurosMes}%` : "—" },
                        { label: "Frequência", value: frequenciaLabel[l.frequenciaPagamento] },
                        { label: "Início", value: formatDate(l.dataInicio) },
                        { label: "Próx. pagamento", value: formatDate(l.dataProximoPagamento) },
                        { label: "Tempo mínimo (dias)", value: l.tempoMinimoDias },
                        { label: "Local de retirada", value: l.localRetirada },
                        { label: "Local de devolução", value: l.localDevolucao },
                        { label: "KM na entrega", value: l.kmEntrega },
                        { label: "Combustível", value: l.nivelCombustivel },
                        { label: "Franquia km/dia", value: l.franquiaKmDiaria },
                        { label: "Raio de circulação", value: l.raioCirculacao },
                        { label: "Seguro p/ terceiros", value: l.seguroTerceiros ? "Sim" : "Não" },
                        { label: "Promessa de compra", value: l.promessaCompra ? "Sim" : "Não" },
                        { label: "Caução pendente", value: l.caucaoPendente ? "Sim" : "Não" },
                        { label: "Caução parcelada", value: l.caucaoParcelada ? "Sim" : "Não" },
                        { label: "Situação", value: locacaoStatusLabel[l.status] },
                        { label: "Encerramento", value: formatDate(l.dataEncerramento) },
                      ]}
                    />
                    {!investidor && (
                      <>
                    <EditarLocacaoButton
                      veiculos={veiculosParaEdicao(l.veiculoId)}
                      clientes={clientesOpt}
                      atendentes={atendentesOpt}
                      locacao={{
                        id: l.id,
                        veiculoId: l.veiculoId,
                        clienteId: l.clienteId,
                        valorAluguel: l.valorAluguel.toString(),
                        valorCaucao: l.valorCaucao?.toString() ?? null,
                        multaAtraso: l.multaAtraso?.toString() ?? null,
                        jurosMes: l.jurosMes?.toString() ?? null,
                        dataInicio: toDatetimeLocal(l.dataInicio),
                        dataProximoPagamento: toDateInput(l.dataProximoPagamento),
                        tempoMinimoDias: l.tempoMinimoDias,
                        frequenciaPagamento: l.frequenciaPagamento,
                        localRetirada: l.localRetirada,
                        localDevolucao: l.localDevolucao,
                        kmEntrega: l.kmEntrega,
                        nivelCombustivel: l.nivelCombustivel,
                        franquiaKmDiaria: l.franquiaKmDiaria,
                        raioCirculacao: l.raioCirculacao,
                        atendenteId: l.atendenteId,
                        seguroTerceiros: l.seguroTerceiros,
                        promessaCompra: l.promessaCompra,
                        caucaoPendente: l.caucaoPendente,
                        caucaoParcelada: l.caucaoParcelada,
                        status: l.status,
                      }}
                    />
                    {l.status !== "encerrada" && (
                      <EncerrarLocacaoButton
                        id={l.id}
                        label={`${l.cliente.nome} · ${l.veiculo.placa}`}
                      />
                    )}
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
