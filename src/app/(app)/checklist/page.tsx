import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { datasVencimento, chaveDia, type Frequencia } from "@/lib/pagamentos";
import { ReceberPagamento } from "./receber-pagamento";
import { Calendario } from "./calendario";
import { DespesasView } from "./despesas-view";

type SP = { mes?: string; view?: string; aba?: string };

interface Item {
  locacaoId: string;
  dia: string;
  recebido: boolean;
  valorEsperado: string;
  clienteNome: string;
  veicPlaca: string;
  recebidoValor: string | null;
  recebidoData: string | null;
  recebidoForma: string | null;
  recebidoObs: string | null;
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const usuario = await requireScreen("checklist");
  const sp = await searchParams;
  const view = sp.view === "calendario" ? "calendario" : "lista";
  const aba = sp.aba === "despesas" ? "despesas" : "alugueis";

  // Mês selecionado (?mes=YYYY-MM) ou atual.
  let mesDate = new Date();
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    mesDate = new Date(y, m - 1, 1);
  }
  const inicioMes = startOfMonth(mesDate);
  const fimMes = endOfMonth(mesDate);

  const mesParam = format(mesDate, "yyyy-MM");
  const prevMes = format(subMonths(mesDate, 1), "yyyy-MM");
  const nextMes = format(addMonths(mesDate, 1), "yyyy-MM");
  const navHref = (mes: string) => `/checklist?mes=${mes}&view=${view}&aba=${aba}`;
  const viewHref = (v: string) => `/checklist?mes=${mesParam}&view=${v}&aba=${aba}`;
  const abaHref = (a: string) => `/checklist?mes=${mesParam}&view=${view}&aba=${a}`;

  // ---- Dados da aba Aluguéis ----
  let alugueisContent: React.ReactNode = null;
  if (aba === "alugueis") {
    const locacoes = await prisma.locacao.findMany({
      where: {
        locadoraId: usuario.locadoraId,
        dataInicio: { lte: fimMes },
        OR: [{ dataEncerramento: null }, { dataEncerramento: { gte: inicioMes } }],
      },
      include: {
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true } },
      },
    });

    const pagos = await prisma.transacao.findMany({
      where: {
        locadoraId: usuario.locadoraId,
        categoria: "aluguel",
        dataVencimento: { gte: inicioMes, lte: fimMes },
      },
      select: {
        locacaoId: true,
        dataVencimento: true,
        valor: true,
        dataPagamento: true,
        formaPagamento: true,
        observacao: true,
      },
    });
    const recebidosMap = new Map<
      string,
      { valor: string; data: string | null; forma: string | null; obs: string | null }
    >();
    for (const p of pagos) {
      if (!p.locacaoId || !p.dataVencimento) continue;
      recebidosMap.set(`${p.locacaoId}|${chaveDia(p.dataVencimento)}`, {
        valor: p.valor.toString(),
        data: p.dataPagamento ? chaveDia(p.dataPagamento) : null,
        forma: p.formaPagamento,
        obs: p.observacao,
      });
    }

    const itens: Item[] = [];
    for (const l of locacoes) {
      const primeira = l.dataProximoPagamento ?? l.dataInicio;
      const fimGeracao =
        l.dataEncerramento && l.dataEncerramento < fimMes
          ? l.dataEncerramento
          : fimMes;
      const dues = datasVencimento(
        primeira,
        l.frequenciaPagamento as Frequencia,
        inicioMes,
        fimGeracao,
      );
      for (const dd of dues) {
        const dia = chaveDia(dd);
        const rec = recebidosMap.get(`${l.id}|${dia}`);
        itens.push({
          locacaoId: l.id,
          dia,
          recebido: !!rec,
          valorEsperado: l.valorAluguel.toString(),
          clienteNome: l.cliente.nome,
          veicPlaca: l.veiculo.placa,
          recebidoValor: rec?.valor ?? null,
          recebidoData: rec?.data ?? null,
          recebidoForma: rec?.forma ?? null,
          recebidoObs: rec?.obs ?? null,
        });
      }
    }
    itens.sort((a, b) => a.dia.localeCompare(b.dia));

    const totalEsperado = itens.reduce((s, i) => s + Number(i.valorEsperado), 0);
    const totalRecebido = itens
      .filter((i) => i.recebido)
      .reduce((s, i) => s + Number(i.recebidoValor ?? 0), 0);
    const totalPendente = itens
      .filter((i) => !i.recebido)
      .reduce((s, i) => s + Number(i.valorEsperado), 0);

    const chips = new Map<string, React.ReactNode[]>();
    for (const i of itens) {
      const arr = chips.get(i.dia) ?? [];
      arr.push(<ReceberPagamento key={`${i.locacaoId}-${i.dia}`} {...i} variant="chip" />);
      chips.set(i.dia, arr);
    }

    alugueisContent = (
      <>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Esperado no mês" value={formatBRL(totalEsperado)} />
          <StatCard label="Recebido" value={formatBRL(totalRecebido)} accent="success" />
          <StatCard
            label="Pendente"
            value={formatBRL(totalPendente)}
            accent={totalPendente > 0 ? "warning" : undefined}
          />
        </div>

        {itens.length === 0 ? (
          <EmptyState>
            Nenhum aluguel esperado neste mês. Locações ativas geram os pagamentos
            automaticamente conforme a frequência.
          </EmptyState>
        ) : view === "lista" ? (
          <Table>
            <Thead>
              <tr>
                <Th>Vencimento</Th>
                <Th>Locatário</Th>
                <Th>Veículo</Th>
                <Th>Valor</Th>
                <Th className="text-center">Recebido</Th>
              </tr>
            </Thead>
            <tbody>
              {itens.map((i) => {
                const [y, m, d] = i.dia.split("-");
                return (
                  <Tr key={`${i.locacaoId}-${i.dia}`}>
                    <Td className="whitespace-nowrap">{`${d}/${m}/${y}`}</Td>
                    <Td className="font-medium">{i.clienteNome}</Td>
                    <Td>{i.veicPlaca}</Td>
                    <Td>{formatBRL(i.valorEsperado)}</Td>
                    <Td className="text-center">
                      <div className="flex justify-center">
                        <ReceberPagamento {...i} variant="row" />
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
      </>
    );
  }

  const tabCls = (ativo: boolean) =>
    `flex h-9 items-center gap-1.5 px-4 text-sm font-medium ${
      ativo ? "bg-brand text-brand-fg" : "text-muted hover:bg-background"
    }`;

  return (
    <>
      <PageHeader
        title="Checklist"
        subtitle="Aluguéis a receber e despesas a pagar no mês"
      />

      {/* Abas */}
      <div className="mb-4 inline-flex overflow-hidden rounded-lg border border-border bg-surface">
        <Link href={abaHref("alugueis")} className={tabCls(aba === "alugueis")}>
          <ArrowDownCircle className="h-4 w-4" /> Aluguéis (a receber)
        </Link>
        <Link
          href={abaHref("despesas")}
          className={`border-l border-border ${tabCls(aba === "despesas")}`}
        >
          <ArrowUpCircle className="h-4 w-4" /> Despesas (a pagar)
        </Link>
      </div>

      {/* Navegação de mês + alternador de visão */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={navHref(prevMes)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-background"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-40 text-center text-sm font-semibold capitalize">
            {format(mesDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Link
            href={navHref(nextMes)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-background"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="inline-flex overflow-hidden rounded-lg border border-border bg-surface">
          <Link
            href={viewHref("lista")}
            className={`flex h-9 items-center gap-1.5 px-3 text-sm font-medium ${
              view === "lista" ? "bg-brand text-brand-fg" : "text-muted hover:bg-background"
            }`}
          >
            <List className="h-4 w-4" /> Lista
          </Link>
          <Link
            href={viewHref("calendario")}
            className={`flex h-9 items-center gap-1.5 border-l border-border px-3 text-sm font-medium ${
              view === "calendario"
                ? "bg-brand text-brand-fg"
                : "text-muted hover:bg-background"
            }`}
          >
            <CalendarDays className="h-4 w-4" /> Calendário
          </Link>
        </div>
      </div>

      {aba === "alugueis" ? (
        alugueisContent
      ) : (
        <DespesasView locadoraId={usuario.locadoraId} mesDate={mesDate} view={view} />
      )}

      <p className="mt-4 text-xs text-muted">
        {aba === "alugueis"
          ? "Marcar como recebido gera uma entrada de aluguel no módulo Finanças."
          : "Marcar como pago gera uma saída no módulo Finanças, vinculada à moto quando houver."}
      </p>
    </>
  );
}
