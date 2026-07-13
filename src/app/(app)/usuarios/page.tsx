import { prisma } from "@/lib/prisma";
import { requireScreen } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td, EmptyState } from "@/components/ui/table";
import {
  NovoUsuarioButton,
  EditarUsuarioButton,
  type UsuarioDTO,
  type VeiculoOpt,
} from "./usuario-form";
import { AtivoToggle } from "./ativo-toggle";

const cargoLabel: Record<string, string> = {
  admin: "Administrador",
  socio: "Sócio",
  diretor: "Diretor",
  gerente: "Gerente",
  operador: "Operador",
  investidor: "Investidor",
};

export default async function UsuariosPage() {
  const admin = await requireScreen("usuarios");

  const [usuarios, veiculos] = await Promise.all([
    prisma.usuario.findMany({
      where: { locadoraId: admin.locadoraId },
      include: { veiculosInvestidor: { select: { id: true } } },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.veiculo.findMany({
      where: { locadoraId: admin.locadoraId },
      select: { id: true, placa: true, marca: true, modelo: true },
      orderBy: { placa: "asc" },
    }),
  ]);

  const veiculoOpts: VeiculoOpt[] = veiculos.map((v) => ({
    id: v.id,
    label: `${v.placa} · ${[v.marca, v.modelo].filter(Boolean).join(" ") || "veículo"}`,
  }));

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Equipe e investidores — controle de acesso"
        action={<NovoUsuarioButton veiculos={veiculoOpts} />}
      />

      <Table>
        <Thead>
          <tr>
            <Th>Nome</Th>
            <Th>E-mail</Th>
            <Th>Cargo</Th>
            <Th>Motos</Th>
            <Th>Situação</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </Thead>
        <tbody>
          {usuarios.map((u) => {
            const dto: UsuarioDTO = {
              id: u.id,
              nome: u.nome,
              email: u.email,
              cargo: u.cargo,
              permissoes: u.permissoes,
              veiculoIds: u.veiculosInvestidor.map((v) => v.id),
            };
            return (
              <Tr key={u.id}>
                <Td className="font-medium">
                  {u.nome}
                  {u.id === admin.id && (
                    <span className="ml-1 text-xs text-muted">(você)</span>
                  )}
                </Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge tone={u.cargo === "investidor" ? "warning" : u.cargo === "admin" ? "brand" : "neutral"}>
                    {cargoLabel[u.cargo] ?? u.cargo}
                  </Badge>
                </Td>
                <Td>
                  {u.cargo === "investidor" ? u.veiculosInvestidor.length : "—"}
                </Td>
                <Td>
                  <Badge tone={u.ativo ? "success" : "neutral"}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <EditarUsuarioButton veiculos={veiculoOpts} usuario={dto} />
                    <AtivoToggle
                      id={u.id}
                      ativo={u.ativo}
                      disabled={u.id === admin.id}
                    />
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
