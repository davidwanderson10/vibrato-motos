import { subDays } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { ExcelButton } from "@/components/ui/excel-button";
import { ViewButton } from "@/components/ui/view-button";
import { presignedGetUrl } from "@/lib/storage";
import { Paperclip } from "lucide-react";
import { manutencaoStatusLabel, manutencaoStatusTone } from "@/lib/enums";
import { formatBRL, formatDate } from "@/lib/utils";
import { chaveDia } from "@/lib/pagamentos";
import {
  NovaManutencaoButton,
  EditarManutencaoButton,
  type ManutencaoDTO,
  type Opcao,
} from "./manutencao-form";
import { DeleteManutencaoButton } from "./delete-manutencao";

type SP = { veiculo?: string; status?: string };

export default async function ManutencoesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const usuario = await requireScreen("manutencoes");
  const sp = await searchParams;
  const loc = usuario.locadoraId;

  const where: Prisma.ManutencaoWhereInput = { locadoraId: loc };
  if (sp.veiculo) where.veiculoId = sp.veiculo;
  if (["agendada", "em_andamento", "finalizada"].includes(sp.status ?? ""))
    where.status = sp.status as never;

  const [manutencoes, veiculos, contas, custo30Agg] = await Promise.all([
    prisma.manutencao.findMany({
      where,
      include: {
        veiculo: { select: { placa: true, marca: true, modelo: true } },
        transacao: {
          select: { status: true, formaPagamento: true, contaBancariaId: true },
        },
        documentos: { orderBy: { criadoEm: "desc" } },
      },
      orderBy: { data: "desc" },
    }),
    prisma.veiculo.findMany({
      where: { locadoraId: loc },
      select: { id: true, placa: true, marca: true, modelo: true },
      orderBy: { placa: "asc" },
    }),
    prisma.contaBancaria.findMany({
      where: { locadoraId: loc },
      orderBy: { banco: "asc" },
    }),
    prisma.manutencao.aggregate({
      _sum: { valor: true },
      where: { locadoraId: loc, data: { gte: subDays(new Date(), 30) } },
    }),
  ]);

  const custoTotal = manutencoes.reduce((s, m) => s + Number(m.valor), 0);
  const custo30 = Number(custo30Agg._sum.valor ?? 0);

  // URLs assinadas dos anexos de cada manutenção.
  const docsMap = new Map<string, { id: string; nome: string; url: string }[]>();
  for (const m of manutencoes) {
    docsMap.set(
      m.id,
      await Promise.all(
        m.documentos.map(async (d) => ({
          id: d.id,
          nome: d.nome,
          url: await presignedGetUrl(d.chave),
        })),
      ),
    );
  }

  const veiculoLabel = (v: { placa: string; marca: string | null; modelo: string | null }) =>
    `${v.placa} · ${[v.marca, v.modelo].filter(Boolean).join(" ") || "veículo"}`;
  const veiculoOpts: Opcao[] = veiculos.map((v) => ({ id: v.id, label: veiculoLabel(v) }));
  const contaOpts: Opcao[] = contas.map((c) => ({ id: c.id, label: c.banco }));

  const exportQs = new URLSearchParams();
  if (sp.veiculo) exportQs.set("veiculo", sp.veiculo);
  if (sp.status) exportQs.set("status", sp.status);

  return (
    <>
      <PageHeader
        title="Manutenções"
        subtitle="Serviços e peças da frota"
        action={
          <div className="flex gap-2">
            <ExcelButton href={`/api/export/manutencoes?${exportQs.toString()}`} />
            <NovaManutencaoButton veiculos={veiculoOpts} contas={contaOpts} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Custo (últimos 30 dias)" value={formatBRL(custo30)} accent="danger" />
        <StatCard label="Custo no filtro atual" value={formatBRL(custoTotal)} />
        <StatCard label="Manutenções" value={manutencoes.length} />
      </div>

      {/* Filtros */}
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <Select name="veiculo" defaultValue={sp.veiculo ?? ""} className="sm:w-56">
          <option value="">Todas as motos</option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.placa}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""} className="sm:w-44">
          <option value="">Todos os status</option>
          <option value="agendada">Agendada</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizada">Finalizada</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {manutencoes.length === 0 ? (
        <EmptyState>
          Nenhuma manutenção registrada. Clique em{" "}
          <strong>Nova manutenção</strong> para lançar um serviço.
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Data</Th>
              <Th>Moto</Th>
              <Th>Serviço / peças</Th>
              <Th>Oficina</Th>
              <Th>KM</Th>
              <Th className="text-right">Valor</Th>
              <Th>Situação</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <tbody>
            {manutencoes.map((m) => {
              const dto: ManutencaoDTO = {
                id: m.id,
                veiculoId: m.veiculoId,
                data: chaveDia(m.data),
                kmVeiculo: m.kmVeiculo,
                oficina: m.oficina,
                descricao: m.descricao,
                pecasServicos: m.pecasServicos,
                valor: m.valor.toString(),
                status: m.status,
                pago: m.transacao ? m.transacao.status === "pago" : true,
                formaPagamento: m.transacao?.formaPagamento ?? null,
                contaBancariaId: m.transacao?.contaBancariaId ?? null,
                documentos: docsMap.get(m.id) ?? [],
              };
              return (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap">{formatDate(m.data)}</Td>
                  <Td className="font-semibold">{m.veiculo.placa}</Td>
                  <Td>
                    <div>{m.descricao || "—"}</div>
                    {m.pecasServicos && (
                      <span className="block text-xs text-muted">
                        {m.pecasServicos}
                      </span>
                    )}
                    {m.documentos.length > 0 && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                        <Paperclip className="h-3 w-3" />
                        {m.documentos.length} anexo
                        {m.documentos.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </Td>
                  <Td>{m.oficina ?? "—"}</Td>
                  <Td>{m.kmVeiculo != null ? m.kmVeiculo.toLocaleString("pt-BR") : "—"}</Td>
                  <Td className="text-right font-semibold">
                    {formatBRL(m.valor.toString())}
                  </Td>
                  <Td>
                    <Badge tone={manutencaoStatusTone[m.status]}>
                      {manutencaoStatusLabel[m.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <ViewButton
                        title={`Manutenção — ${m.veiculo.placa}`}
                        rows={[
                          { label: "Moto", value: m.veiculo.placa },
                          { label: "Data", value: formatDate(m.data) },
                          { label: "KM", value: m.kmVeiculo?.toLocaleString("pt-BR") },
                          { label: "Oficina", value: m.oficina },
                          { label: "Serviço", value: m.descricao },
                          { label: "Peças / serviços", value: m.pecasServicos },
                          { label: "Valor", value: formatBRL(m.valor.toString()) },
                          { label: "Situação", value: manutencaoStatusLabel[m.status] },
                          { label: "Anexos", value: `${m.documentos.length}` },
                        ]}
                      />
                      <EditarManutencaoButton
                        veiculos={veiculoOpts}
                        contas={contaOpts}
                        manutencao={dto}
                      />
                      <DeleteManutencaoButton
                        id={m.id}
                        label={`${m.veiculo.placa} · ${formatDate(m.data)}`}
                      />
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
