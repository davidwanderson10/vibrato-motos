import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { veiculoWhere } from "@/lib/permissoes";
import { presignedGetUrl } from "@/lib/storage";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import {
  tipoVeiculoLabel,
  veiculoStatusLabel,
  veiculoStatusTone,
  locacaoStatusLabel,
  locacaoStatusTone,
} from "@/lib/enums";
import { formatBRL, formatDate } from "@/lib/utils";
import { EditarLimitado } from "../editar-limitado";
import { DocumentosVeiculo } from "../documentos-veiculo";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function VeiculoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireScreen("frota");
  const { id } = await params;

  const veiculo = await prisma.veiculo.findFirst({
    where: { id, locadoraId: usuario.locadoraId, ...veiculoWhere(usuario) },
    include: {
      investidor: { select: { nome: true } },
      documentos: { orderBy: { criadoEm: "desc" } },
      locacoes: {
        include: { cliente: { select: { nome: true } } },
        orderBy: { dataInicio: "desc" },
      },
    },
  });
  if (!veiculo) notFound();

  const docs = await Promise.all(
    veiculo.documentos.map(async (d) => ({
      id: d.id,
      nome: d.nome,
      url: await presignedGetUrl(d.chave),
    })),
  );

  return (
    <>
      <Link
        href="/frota"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à frota
      </Link>

      <PageHeader
        title={veiculo.placa}
        subtitle={
          [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") ||
          tipoVeiculoLabel[veiculo.tipo]
        }
        action={
          <Badge tone={veiculoStatusTone[veiculo.status]}>
            {veiculoStatusLabel[veiculo.status]}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Dados da moto</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Tipo" value={tipoVeiculoLabel[veiculo.tipo]} />
            <InfoRow label="Ano" value={veiculo.ano} />
            <InfoRow label="Cor" value={veiculo.cor} />
            <InfoRow
              label="KM atual"
              value={veiculo.kmAtual?.toLocaleString("pt-BR")}
            />
            <InfoRow label="Valor de compra" value={formatBRL(veiculo.valorCompra?.toString())} />
            <InfoRow label="Valor FIPE" value={formatBRL(veiculo.valorFipe?.toString())} />
            <InfoRow label="Renavam" value={veiculo.renavam} />
            <InfoRow label="Vendedor" value={veiculo.vendedor} />
            <InfoRow
              label="Propriedade"
              value={
                veiculo.propria
                  ? "Da locadora"
                  : `Investidor${veiculo.investidor?.nome ? `: ${veiculo.investidor.nome}` : veiculo.proprietario ? `: ${veiculo.proprietario}` : ""}`
              }
            />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <EditarLimitado
            id={veiculo.id}
            valorFipe={veiculo.valorFipe?.toString() ?? null}
            kmAtual={veiculo.kmAtual}
            observacoes={veiculo.observacoes}
          />

          <div>
            <DocumentosVeiculo veiculoId={veiculo.id} docs={docs} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">
              Locações desta moto ({veiculo.locacoes.length})
            </h3>
            {veiculo.locacoes.length === 0 ? (
              <EmptyState>Nenhuma locação registrada.</EmptyState>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Locatário</Th>
                    <Th>Aluguel</Th>
                    <Th>Início</Th>
                    <Th>Situação</Th>
                  </tr>
                </Thead>
                <tbody>
                  {veiculo.locacoes.map((l) => (
                    <Tr key={l.id}>
                      <Td className="font-medium">{l.cliente.nome}</Td>
                      <Td>{formatBRL(l.valorAluguel.toString())}</Td>
                      <Td>{formatDate(l.dataInicio)}</Td>
                      <Td>
                        <Badge tone={locacaoStatusTone[l.status]}>
                          {locacaoStatusLabel[l.status]}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
