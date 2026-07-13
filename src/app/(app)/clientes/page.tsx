import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import { clienteStatusLabel } from "@/lib/enums";
import { chaveDia } from "@/lib/pagamentos";
import { formatDate } from "@/lib/utils";
import { ViewButton } from "@/components/ui/view-button";
import { EditarClienteButton, type ClienteDTO } from "./cliente-form";

type SP = { status?: string; q?: string };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const usuario = await requireScreen("clientes");
  const sp = await searchParams;
  const statusFiltro =
    sp.status === "ex_cliente" || sp.status === "ativo" ? sp.status : "todos";

  const where: Prisma.ClienteWhereInput = { locadoraId: usuario.locadoraId };
  if (statusFiltro !== "todos") where.status = statusFiltro as never;
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { cpf: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const clientes = await prisma.cliente.findMany({
    where,
    include: {
      locacoes: {
        where: { status: "ativa" },
        select: { veiculo: { select: { placa: true } } },
        take: 1,
      },
    },
    orderBy: { nome: "asc" },
  });

  const toDate = (d: Date | null) => (d ? chaveDia(d) : null);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Locatários cadastrados (o cadastro é feito ao criar uma locação)"
      />

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto sm:flex-1">
          <Input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por nome, CPF ou e-mail..."
          />
        </div>
        <Select name="status" defaultValue={statusFiltro} className="sm:w-48">
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="ex_cliente">Ex-clientes</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {clientes.length === 0 ? (
        <EmptyState>
          Nenhum cliente encontrado. Clientes são cadastrados automaticamente ao
          criar uma locação.
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Nome</Th>
              <Th>Contato</Th>
              <Th>CPF</Th>
              <Th>Veículo alugado</Th>
              <Th>Status</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </Thead>
          <tbody>
            {clientes.map((c) => {
              const dto: ClienteDTO = {
                id: c.id,
                nome: c.nome,
                cpf: c.cpf,
                rg: c.rg,
                email: c.email,
                telefone: c.telefone,
                cep: c.cep,
                logradouro: c.logradouro,
                numero: c.numero,
                complemento: c.complemento,
                bairro: c.bairro,
                cidade: c.cidade,
                estado: c.estado,
                cnhNumero: c.cnhNumero,
                cnhValidade: toDate(c.cnhValidade),
                dataNascimento: toDate(c.dataNascimento),
                ref1Nome: c.ref1Nome,
                ref1Telefone: c.ref1Telefone,
                ref2Nome: c.ref2Nome,
                ref2Telefone: c.ref2Telefone,
                status: c.status,
              };
              const placa = c.locacoes[0]?.veiculo.placa;
              return (
                <Tr key={c.id}>
                  <Td className="font-medium">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="hover:text-brand hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </Td>
                  <Td className="text-sm">
                    {c.email && <span className="block">{c.email}</span>}
                    {c.telefone && (
                      <span className="block text-muted">{c.telefone}</span>
                    )}
                    {!c.email && !c.telefone && "—"}
                  </Td>
                  <Td>{c.cpf ?? "—"}</Td>
                  <Td>
                    {placa ? (
                      <Badge tone="info">{placa}</Badge>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={c.status === "ativo" ? "success" : "neutral"}>
                      {clienteStatusLabel[c.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <ViewButton
                        title={c.nome}
                        rows={[
                          { label: "Nome", value: c.nome },
                          { label: "CPF", value: c.cpf },
                          { label: "RG", value: c.rg },
                          { label: "E-mail", value: c.email },
                          { label: "Telefone", value: c.telefone },
                          {
                            label: "Endereço",
                            value:
                              [
                                [c.logradouro, c.numero].filter(Boolean).join(", "),
                                c.bairro,
                                [c.cidade, c.estado].filter(Boolean).join("/"),
                                c.cep,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—",
                          },
                          { label: "CNH", value: c.cnhNumero },
                          { label: "Validade CNH", value: formatDate(c.cnhValidade) },
                          { label: "Nascimento", value: formatDate(c.dataNascimento) },
                          {
                            label: "Referência 1",
                            value: c.ref1Nome
                              ? `${c.ref1Nome}${c.ref1Telefone ? ` · ${c.ref1Telefone}` : ""}`
                              : "—",
                          },
                          {
                            label: "Referência 2",
                            value: c.ref2Nome
                              ? `${c.ref2Nome}${c.ref2Telefone ? ` · ${c.ref2Telefone}` : ""}`
                              : "—",
                          },
                          { label: "Situação", value: clienteStatusLabel[c.status] },
                        ]}
                      />
                      <EditarClienteButton cliente={dto} />
                      <Link href={`/clientes/${c.id}`}>
                        <Button size="sm" variant="ghost">
                          Detalhes
                        </Button>
                      </Link>
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
