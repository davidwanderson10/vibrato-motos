import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import {
  clienteStatusLabel,
  locacaoStatusLabel,
  locacaoStatusTone,
} from "@/lib/enums";
import { formatBRL, formatDate } from "@/lib/utils";
import { chaveDia } from "@/lib/pagamentos";
import { presignedGetUrl } from "@/lib/storage";
import { EditarClienteButton, type ClienteDTO } from "../cliente-form";
import { DocumentosCliente } from "../documentos-cliente";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requireScreen("clientes");
  const { id } = await params;

  const cliente = await prisma.cliente.findFirst({
    where: { id, locadoraId: usuario.locadoraId },
    include: {
      locacoes: {
        include: { veiculo: { select: { placa: true, marca: true, modelo: true } } },
        orderBy: { dataInicio: "desc" },
      },
      documentos: { orderBy: { criadoEm: "desc" } },
    },
  });
  if (!cliente) notFound();

  const toDate = (d: Date | null) => (d ? chaveDia(d) : null);
  const dto: ClienteDTO = {
    id: cliente.id,
    nome: cliente.nome,
    cpf: cliente.cpf,
    rg: cliente.rg,
    email: cliente.email,
    telefone: cliente.telefone,
    cep: cliente.cep,
    logradouro: cliente.logradouro,
    numero: cliente.numero,
    complemento: cliente.complemento,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    estado: cliente.estado,
    cnhNumero: cliente.cnhNumero,
    cnhValidade: toDate(cliente.cnhValidade),
    dataNascimento: toDate(cliente.dataNascimento),
    ref1Nome: cliente.ref1Nome,
    ref1Telefone: cliente.ref1Telefone,
    ref2Nome: cliente.ref2Nome,
    ref2Telefone: cliente.ref2Telefone,
    status: cliente.status,
  };

  // Endereço completo em uma linha (quando houver).
  const enderecoCompleto =
    [
      [cliente.logradouro, cliente.numero].filter(Boolean).join(", "),
      cliente.complemento,
      cliente.bairro,
      [cliente.cidade, cliente.estado].filter(Boolean).join("/"),
      cliente.cep,
    ]
      .filter(Boolean)
      .join(" · ") || cliente.endereco;

  // URLs temporárias para os documentos.
  const docs = await Promise.all(
    cliente.documentos.map(async (d) => ({
      id: d.id,
      nome: d.nome,
      url: await presignedGetUrl(d.chave),
    })),
  );

  return (
    <>
      <Link
        href="/clientes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos clientes
      </Link>

      <PageHeader
        title={cliente.nome}
        subtitle={`Cliente ${clienteStatusLabel[cliente.status].toLowerCase()}`}
        action={<EditarClienteButton cliente={dto} full />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Dados</CardTitle>
            <Badge tone={cliente.status === "ativo" ? "success" : "neutral"}>
              {clienteStatusLabel[cliente.status]}
            </Badge>
          </CardHeader>
          <CardContent>
            <InfoRow label="CPF" value={cliente.cpf} />
            <InfoRow label="RG" value={cliente.rg} />
            <InfoRow label="E-mail" value={cliente.email} />
            <InfoRow label="Telefone" value={cliente.telefone} />
            <InfoRow label="Endereço" value={enderecoCompleto} />
            <InfoRow label="CNH" value={cliente.cnhNumero} />
            <InfoRow
              label="Validade CNH"
              value={formatDate(cliente.cnhValidade)}
            />
            <InfoRow
              label="Nascimento"
              value={formatDate(cliente.dataNascimento)}
            />
            <InfoRow
              label="Referência 1"
              value={
                cliente.ref1Nome
                  ? `${cliente.ref1Nome}${cliente.ref1Telefone ? ` · ${cliente.ref1Telefone}` : ""}`
                  : null
              }
            />
            <InfoRow
              label="Referência 2"
              value={
                cliente.ref2Nome
                  ? `${cliente.ref2Nome}${cliente.ref2Telefone ? ` · ${cliente.ref2Telefone}` : ""}`
                  : null
              }
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <div className="mb-6">
            <DocumentosCliente clienteId={cliente.id} docs={docs} />
          </div>

          <h3 className="mb-2 text-sm font-semibold text-muted">
            Histórico de locações ({cliente.locacoes.length})
          </h3>
          {cliente.locacoes.length === 0 ? (
            <EmptyState>Este cliente ainda não teve locações.</EmptyState>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Veículo</Th>
                  <Th>Aluguel</Th>
                  <Th>Início</Th>
                  <Th>Situação</Th>
                </tr>
              </Thead>
              <tbody>
                {cliente.locacoes.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <span className="font-semibold">{l.veiculo.placa}</span>
                      <span className="block text-xs text-muted">
                        {[l.veiculo.marca, l.veiculo.modelo]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    </Td>
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
    </>
  );
}
