import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { isInvestidor, porVeiculoWhere, veiculoWhere } from "@/lib/permissoes";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { UploadDocumentoButton, DocumentoRowActions } from "./documento-manager";

export default async function DocumentosPage() {
  const usuario = await requireScreen("documentos");
  const investidor = isInvestidor(usuario);
  const loc = usuario.locadoraId;

  const [documentos, veiculos, locacoes] = await Promise.all([
    prisma.documento.findMany({
      where: { locadoraId: loc, ...porVeiculoWhere(usuario) },
      include: {
        veiculo: { select: { placa: true } },
        locacao: {
          select: {
            cliente: { select: { nome: true } },
            veiculo: { select: { placa: true } },
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.veiculo.findMany({
      where: { locadoraId: loc, ...veiculoWhere(usuario) },
      select: { id: true, placa: true, marca: true, modelo: true },
      orderBy: { placa: "asc" },
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

  const veiculosOpt = veiculos.map((v) => ({
    id: v.id,
    label: [v.placa, v.marca, v.modelo].filter(Boolean).join(" · "),
  }));
  const locacoesOpt = locacoes.map((l) => ({
    id: l.id,
    label: `${l.cliente.nome} · ${l.veiculo.placa}`,
  }));

  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle="Repositório de documentos vinculados a motos e/ou locações"
        action={
          !investidor ? (
            <UploadDocumentoButton veiculos={veiculosOpt} locacoes={locacoesOpt} />
          ) : undefined
        }
      />

      {documentos.length === 0 ? (
        <EmptyState>
          Nenhum documento.{" "}
          {!investidor && (
            <>
              Clique em <strong>Novo documento</strong> para enviar arquivos.
            </>
          )}
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Documento</Th>
              <Th>Moto</Th>
              <Th>Locação</Th>
              <Th>Enviado em</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <tbody>
            {documentos.map((d) => (
              <Tr key={d.id}>
                <Td className="font-medium">
                  {d.nome}
                  {d.descricao && (
                    <span className="block text-xs text-muted">{d.descricao}</span>
                  )}
                </Td>
                <Td>
                  {d.veiculo ? (
                    <Badge tone="info">{d.veiculo.placa}</Badge>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td className="text-sm text-muted">
                  {d.locacao
                    ? `${d.locacao.cliente.nome} · ${d.locacao.veiculo.placa}`
                    : "—"}
                </Td>
                <Td className="whitespace-nowrap text-sm text-muted">
                  {formatDate(d.criadoEm)}
                </Td>
                <Td>
                  <DocumentoRowActions id={d.id} podeExcluir={!investidor} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
