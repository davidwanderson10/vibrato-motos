import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, porVeiculoWhere } from "@/lib/permissoes";
import { locacaoStatusLabel, frequenciaLabel } from "@/lib/enums";
import { gerarXlsx, respostaXlsx } from "@/lib/excel";

const fmtData = (d: Date | null) =>
  d ? d.toLocaleDateString("pt-BR") : "";

export async function GET(request: Request) {
  const usuario = await getCurrentUser();
  if (!usuario) return new Response("Não autorizado", { status: 401 });
  if (!canAccess(usuario, "locacoes"))
    return new Response("Sem permissão", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const status = sp.get("status");
  const statusFiltro = ["ativa", "encerrada", "agendada"].includes(status ?? "")
    ? (status as string)
    : "ativa";

  const where: Prisma.LocacaoWhereInput = {
    locadoraId: usuario.locadoraId,
    status: statusFiltro as never,
    ...porVeiculoWhere(usuario),
  };

  const locacoes = await prisma.locacao.findMany({
    where,
    include: {
      cliente: { select: { nome: true, cpf: true } },
      veiculo: { select: { placa: true, marca: true, modelo: true } },
      atendente: { select: { nome: true } },
    },
    orderBy: { dataInicio: "desc" },
  });

  const linhas = locacoes.map((l) => ({
    locatario: l.cliente.nome,
    cpf: l.cliente.cpf ?? "",
    placa: l.veiculo.placa,
    veiculo: [l.veiculo.marca, l.veiculo.modelo].filter(Boolean).join(" "),
    valorAluguel: Number(l.valorAluguel),
    valorCaucao: l.valorCaucao ? Number(l.valorCaucao) : "",
    frequencia: frequenciaLabel[l.frequenciaPagamento] ?? l.frequenciaPagamento,
    inicio: fmtData(l.dataInicio),
    proximoPagamento: fmtData(l.dataProximoPagamento),
    status: locacaoStatusLabel[l.status] ?? l.status,
    encerramento: fmtData(l.dataEncerramento),
    atendente: l.atendente?.nome ?? "",
  }));

  const buffer = await gerarXlsx("Locacoes", [
    { header: "Locatário", key: "locatario", width: 24 },
    { header: "CPF", key: "cpf", width: 16 },
    { header: "Placa", key: "placa", width: 12 },
    { header: "Veículo", key: "veiculo", width: 22 },
    { header: "Aluguel", key: "valorAluguel", width: 14 },
    { header: "Caução", key: "valorCaucao", width: 14 },
    { header: "Frequência", key: "frequencia", width: 14 },
    { header: "Início", key: "inicio", width: 14 },
    { header: "Próx. pagamento", key: "proximoPagamento", width: 16 },
    { header: "Situação", key: "status", width: 14 },
    { header: "Encerramento", key: "encerramento", width: 14 },
    { header: "Atendente", key: "atendente", width: 20 },
  ], linhas);

  const hoje = new Date().toISOString().slice(0, 10);
  return respostaXlsx(buffer, `locacoes-${statusFiltro}-${hoje}.xlsx`);
}
