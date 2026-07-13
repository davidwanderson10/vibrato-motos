import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, List, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/ui/card";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { formatBRL } from "@/lib/utils";
import { datasVencimento, chaveDia, type Frequencia } from "@/lib/pagamentos";
import { ReceberPagamento } from "./receber-pagamento";

type SP = { mes?: string; view?: string };

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

  // Mês selecionado (?mes=YYYY-MM) ou atual.
  let mesDate = new Date();
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split("-").map(Number);
    mesDate = new Date(y, m - 1, 1);
  }
  const inicioMes = startOfMonth(mesDate);
  const fimMes = endOfMonth(mesDate);

  // Locações que estavam vigentes em algum momento do mês.
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

  // Pagamentos já registrados como recebidos no mês (com valor real).
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
    {
      valor: string;
      data: string | null;
      forma: string | null;
      obs: string | null;
    }
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

  // Gera os pagamentos esperados do mês.
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

  const mesParam = format(mesDate, "yyyy-MM");
  const prevMes = format(subMonths(mesDate, 1), "yyyy-MM");
  const nextMes = format(addMonths(mesDate, 1), "yyyy-MM");
  const navHref = (mes: string) => `/checklist?mes=${mes}&view=${view}`;
  const viewHref = (v: string) => `/checklist?mes=${mesParam}&view=${v}`;

  return (
    <>
      <PageHeader
        title="Checklist de pagamentos"
        subtitle="Aluguéis esperados no mês — marque os recebidos"
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Esperado no mês" value={formatBRL(totalEsperado)} />
        <StatCard
          label="Recebido"
          value={formatBRL(totalRecebido)}
          accent="success"
        />
        <StatCard
          label="Pendente"
          value={formatBRL(totalPendente)}
          accent={totalPendente > 0 ? "warning" : undefined}
        />
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
        <Calendario mesDate={mesDate} itens={itens} />
      )}

      <p className="mt-4 text-xs text-muted">
        Marcar como recebido gera uma entrada de <strong>aluguel</strong> no
        módulo Finanças. Pagamentos pendentes e de outros tipos aparecem no
        histórico financeiro completo.
      </p>
    </>
  );
}

function Calendario({ mesDate, itens }: { mesDate: Date; itens: Item[] }) {
  const inicioGrid = startOfWeek(startOfMonth(mesDate), { weekStartsOn: 0 });
  const fimGrid = endOfWeek(endOfMonth(mesDate), { weekStartsOn: 0 });
  const dias: Date[] = [];
  for (let d = inicioGrid; d <= fimGrid; d = addDays(d, 1)) dias.push(d);

  const porDia = new Map<string, Item[]>();
  for (const i of itens) {
    const arr = porDia.get(i.dia) ?? [];
    arr.push(i);
    porDia.set(i.dia, arr);
  }

  const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
            const items = porDia.get(key) ?? [];
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
                <div className="space-y-1">
                  {items.map((i) => (
                    <ReceberPagamento
                      key={`${i.locacaoId}-${i.dia}`}
                      {...i}
                      variant="chip"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
