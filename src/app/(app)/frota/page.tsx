import Link from "next/link";
import { List, LayoutGrid } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { veiculoWhere, isInvestidor } from "@/lib/permissoes";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  Table,
  Thead,
  Th,
  Tr,
  Td,
  EmptyState,
} from "@/components/ui/table";
import {
  tipoVeiculoLabel,
  veiculoStatusLabel,
  veiculoStatusTone,
  veiculoStatusValues,
} from "@/lib/enums";
import { formatBRL } from "@/lib/utils";
import {
  NovoVeiculoButton,
  EditarVeiculoButton,
  type VeiculoDTO,
} from "./veiculo-form";
import { DeleteVeiculoButton } from "./delete-veiculo";
import { ExcelButton } from "@/components/ui/excel-button";
import { ViewButton, type ViewRow } from "@/components/ui/view-button";

type SP = { tipo?: string; status?: string; q?: string; view?: string };

export default async function FrotaPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const usuario = await requireScreen("frota");
  const investidor = isInvestidor(usuario);
  const escopo = veiculoWhere(usuario);
  const sp = await searchParams;
  const view = sp.view === "card" ? "card" : "list";

  // Monta a URL preservando os filtros atuais e trocando só a visualização.
  const viewHref = (v: "list" | "card") => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.tipo) params.set("tipo", sp.tipo);
    if (sp.status) params.set("status", sp.status);
    params.set("view", v);
    return `/frota?${params.toString()}`;
  };

  const where: Prisma.VeiculoWhereInput = {
    locadoraId: usuario.locadoraId,
    ...escopo,
  };
  if (sp.tipo === "moto" || sp.tipo === "carro") where.tipo = sp.tipo;
  if (sp.status && veiculoStatusValues.includes(sp.status))
    where.status = sp.status as never;
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { placa: { contains: q, mode: "insensitive" } },
      { marca: { contains: q, mode: "insensitive" } },
      { modelo: { contains: q, mode: "insensitive" } },
    ];
  }

  const veiculos = await prisma.veiculo.findMany({
    where,
    orderBy: [{ status: "asc" }, { placa: "asc" }],
  });

  // Query string dos filtros atuais para o export.
  const exportQs = new URLSearchParams();
  if (sp.tipo) exportQs.set("tipo", sp.tipo);
  if (sp.status) exportQs.set("status", sp.status);
  if (sp.q) exportQs.set("q", sp.q);

  const rowsVeiculo = (v: VeiculoDTO): ViewRow[] => [
    { label: "Placa", value: v.placa },
    { label: "Tipo", value: tipoVeiculoLabel[v.tipo] },
    { label: "Marca / Modelo", value: [v.marca, v.modelo].filter(Boolean).join(" ") },
    { label: "Ano", value: v.ano },
    { label: "Cor", value: v.cor },
    { label: "KM atual", value: v.kmAtual?.toLocaleString("pt-BR") },
    { label: "Valor de compra", value: v.valorCompra ? formatBRL(v.valorCompra) : "—" },
    { label: "Valor FIPE", value: v.valorFipe ? formatBRL(v.valorFipe) : "—" },
    { label: "Status", value: veiculoStatusLabel[v.status] },
    { label: "Própria", value: v.propria ? "Sim" : "Não" },
    { label: "Proprietário/Investidor", value: v.propria ? "—" : v.proprietario },
    { label: "Vendedor", value: v.vendedor },
    { label: "Renavam", value: v.renavam },
  ];

  // Indicadores (sobre a frota inteira, sem filtro).
  const todos = await prisma.veiculo.findMany({
    where: { locadoraId: usuario.locadoraId, ...escopo },
    select: { valorCompra: true, valorFipe: true, ano: true },
  });
  const totalCompra = todos.reduce(
    (s, v) => s + Number(v.valorCompra ?? 0),
    0,
  );
  const totalFipe = todos.reduce((s, v) => s + Number(v.valorFipe ?? 0), 0);
  const anos = todos.map((v) => v.ano).filter((a): a is number => a != null);
  const anoMedio = anos.length
    ? Math.round(anos.reduce((s, a) => s + a, 0) / anos.length)
    : null;

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const custoMesAgg = await prisma.transacao.aggregate({
    _sum: { valor: true },
    where: {
      locadoraId: usuario.locadoraId,
      tipo: "saida",
      veiculoId: { not: null },
      status: "pago",
      dataPagamento: { gte: inicioMes, lt: fimMes },
      ...(investidor ? { veiculo: { investidorId: usuario.id } } : {}),
    },
  });
  const custoMes = Number(custoMesAgg._sum.valor ?? 0);

  const dtos: VeiculoDTO[] = veiculos.map((v) => ({
    id: v.id,
    tipo: v.tipo,
    placa: v.placa,
    renavam: v.renavam,
    marca: v.marca,
    modelo: v.modelo,
    ano: v.ano,
    cor: v.cor,
    valorCompra: v.valorCompra?.toString() ?? null,
    valorFipe: v.valorFipe?.toString() ?? null,
    kmAtual: v.kmAtual,
    status: v.status,
    dataAquisicao: v.dataAquisicao
      ? v.dataAquisicao.toISOString().slice(0, 10)
      : null,
    vendedor: v.vendedor,
    propria: v.propria,
    proprietario: v.proprietario,
  }));

  return (
    <>
      <PageHeader
        title="Frota"
        subtitle="Motos e carros da locadora"
        action={
          <div className="flex gap-2">
            <ExcelButton href={`/api/export/frota?${exportQs.toString()}`} />
            {!investidor && <NovoVeiculoButton />}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Valor de compra" value={formatBRL(totalCompra)} />
        <StatCard label="Valor FIPE" value={formatBRL(totalFipe)} />
        <StatCard
          label="Custo no mês"
          value={formatBRL(custoMes)}
          accent="danger"
        />
        <StatCard label="Ano médio" value={anoMedio ?? "—"} />
      </div>

      {/* Filtros (GET, sem JS) + alternador de visualização */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form className="flex flex-1 flex-wrap items-end gap-3">
          <input type="hidden" name="view" value={view} />
          <div className="w-full sm:w-auto sm:flex-1">
            <Input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Buscar por placa, marca ou modelo..."
            />
          </div>
          <Select name="tipo" defaultValue={sp.tipo ?? ""} className="sm:w-36">
            <option value="">Todos os tipos</option>
            <option value="moto">Motos</option>
            <option value="carro">Carros</option>
          </Select>
          <Select
            name="status"
            defaultValue={sp.status ?? ""}
            className="sm:w-52"
          >
            <option value="">Todos os status</option>
            {veiculoStatusValues.map((s) => (
              <option key={s} value={s}>
                {veiculoStatusLabel[s]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>

        {/* Lista x Cards */}
        <div className="inline-flex overflow-hidden rounded-lg border border-border bg-surface">
          <Link
            href={viewHref("list")}
            title="Ver em lista"
            className={`flex h-10 items-center gap-1.5 px-3 text-sm font-medium ${
              view === "list"
                ? "bg-brand text-brand-fg"
                : "text-muted hover:bg-background"
            }`}
          >
            <List className="h-4 w-4" /> Lista
          </Link>
          <Link
            href={viewHref("card")}
            title="Ver em cards"
            className={`flex h-10 items-center gap-1.5 border-l border-border px-3 text-sm font-medium ${
              view === "card"
                ? "bg-brand text-brand-fg"
                : "text-muted hover:bg-background"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Cards
          </Link>
        </div>
      </div>

      {dtos.length === 0 ? (
        <EmptyState>
          Nenhum veículo encontrado. Clique em <strong>Novo veículo</strong>{" "}
          para cadastrar.
        </EmptyState>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dtos.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/frota/${v.id}`}
                    className="text-lg font-bold hover:text-brand hover:underline"
                  >
                    {v.placa}
                  </Link>
                  <p className="text-sm text-muted">
                    {tipoVeiculoLabel[v.tipo]}
                    {v.ano ? ` · ${v.ano}` : ""}
                  </p>
                </div>
                <Badge tone={veiculoStatusTone[v.status]}>
                  {veiculoStatusLabel[v.status]}
                </Badge>
              </div>

              <p className="mt-2 text-sm">
                {[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}
              </p>
              {!v.propria && (
                <div className="mt-1">
                  <Badge tone="warning">
                    Investidor{v.proprietario ? `: ${v.proprietario}` : ""}
                  </Badge>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                <div>
                  <p className="text-xs text-muted">KM</p>
                  <p>{v.kmAtual != null ? v.kmAtual.toLocaleString("pt-BR") : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">FIPE</p>
                  <p>{formatBRL(v.valorFipe)}</p>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                <ViewButton title={`Veículo ${v.placa}`} rows={rowsVeiculo(v)} />
                {!investidor && (
                  <>
                    <EditarVeiculoButton veiculo={v} />
                    <DeleteVeiculoButton id={v.id} placa={v.placa} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Placa</Th>
              <Th>Tipo</Th>
              <Th>Marca / Modelo</Th>
              <Th>Ano</Th>
              <Th>KM</Th>
              <Th>FIPE</Th>
              <Th>Status</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <tbody>
            {dtos.map((v) => (
              <Tr key={v.id}>
                <Td className="font-semibold">
                  <Link
                    href={`/frota/${v.id}`}
                    className="hover:text-brand hover:underline"
                  >
                    {v.placa}
                  </Link>
                </Td>
                <Td>{tipoVeiculoLabel[v.tipo]}</Td>
                <Td>
                  <div>{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</div>
                  {!v.propria && (
                    <div className="mt-0.5">
                      <Badge tone="warning">
                        Investidor{v.proprietario ? `: ${v.proprietario}` : ""}
                      </Badge>
                    </div>
                  )}
                </Td>
                <Td>{v.ano ?? "—"}</Td>
                <Td>{v.kmAtual != null ? v.kmAtual.toLocaleString("pt-BR") : "—"}</Td>
                <Td>{formatBRL(v.valorFipe)}</Td>
                <Td>
                  <Badge tone={veiculoStatusTone[v.status]}>
                    {veiculoStatusLabel[v.status]}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <ViewButton title={`Veículo ${v.placa}`} rows={rowsVeiculo(v)} />
                    {!investidor && (
                      <>
                        <EditarVeiculoButton veiculo={v} />
                        <DeleteVeiculoButton id={v.id} placa={v.placa} />
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
