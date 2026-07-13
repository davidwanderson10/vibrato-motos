import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissoes";
import { manutencaoStatusLabel } from "@/lib/enums";
import { gerarXlsx, respostaXlsx } from "@/lib/excel";

const fmtData = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "");

export async function GET(request: Request) {
  const usuario = await getCurrentUser();
  if (!usuario) return new Response("Não autorizado", { status: 401 });
  if (!canAccess(usuario, "manutencoes"))
    return new Response("Sem permissão", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const veiculo = sp.get("veiculo");
  const status = sp.get("status");

  const where: Prisma.ManutencaoWhereInput = { locadoraId: usuario.locadoraId };
  if (veiculo) where.veiculoId = veiculo;
  if (["agendada", "em_andamento", "finalizada"].includes(status ?? ""))
    where.status = status as never;

  const manutencoes = await prisma.manutencao.findMany({
    where,
    include: { veiculo: { select: { placa: true, marca: true, modelo: true } } },
    orderBy: { data: "desc" },
  });

  const linhas = manutencoes.map((m) => ({
    data: fmtData(m.data),
    placa: m.veiculo.placa,
    veiculo: [m.veiculo.marca, m.veiculo.modelo].filter(Boolean).join(" "),
    descricao: m.descricao ?? "",
    pecas: m.pecasServicos ?? "",
    oficina: m.oficina ?? "",
    km: m.kmVeiculo ?? "",
    valor: Number(m.valor),
    status: manutencaoStatusLabel[m.status] ?? m.status,
  }));

  const buffer = await gerarXlsx("Manutencoes", [
    { header: "Data", key: "data", width: 14 },
    { header: "Placa", key: "placa", width: 12 },
    { header: "Veículo", key: "veiculo", width: 22 },
    { header: "Serviço", key: "descricao", width: 28 },
    { header: "Peças/serviços", key: "pecas", width: 34 },
    { header: "Oficina", key: "oficina", width: 22 },
    { header: "KM", key: "km", width: 10 },
    { header: "Valor", key: "valor", width: 14 },
    { header: "Situação", key: "status", width: 14 },
  ], linhas);

  const hoje = new Date().toISOString().slice(0, 10);
  return respostaXlsx(buffer, `manutencoes-${hoje}.xlsx`);
}
