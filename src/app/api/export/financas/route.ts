import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, porVeiculoWhere } from "@/lib/permissoes";
import {
  categoriaLabel,
  formaPagamentoLabel,
  statusTransacaoLabel,
} from "@/lib/enums";
import { parseDateOnly } from "@/lib/utils";
import { gerarXlsx, respostaXlsx } from "@/lib/excel";

const fmtData = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "");

export async function GET(request: Request) {
  const usuario = await getCurrentUser();
  if (!usuario) return new Response("Não autorizado", { status: 401 });
  if (!canAccess(usuario, "financas"))
    return new Response("Sem permissão", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const tipo = sp.get("tipo");
  const status = sp.get("status");
  const forma = sp.get("forma");
  const de = sp.get("de");
  const ate = sp.get("ate");
  const motosSel = (sp.get("motos") ?? "").split(",").filter(Boolean);

  const where: Prisma.TransacaoWhereInput = {
    locadoraId: usuario.locadoraId,
    ...porVeiculoWhere(usuario),
  };
  if (tipo === "entrada" || tipo === "saida") where.tipo = tipo;
  if (["pendente", "pago", "cancelado"].includes(status ?? ""))
    where.status = status as never;
  if (
    ["pix", "boleto", "cartao_credito", "cartao_debito", "ted", "especie"].includes(
      forma ?? "",
    )
  )
    where.formaPagamento = forma as never;
  if (de || ate) {
    where.dataVencimento = {};
    if (de) where.dataVencimento.gte = parseDateOnly(de);
    if (ate) where.dataVencimento.lte = parseDateOnly(ate);
  }
  if (motosSel.length) where.veiculoId = { in: motosSel };

  const transacoes = await prisma.transacao.findMany({
    where,
    include: {
      contaBancaria: { select: { banco: true } },
      veiculo: { select: { placa: true } },
      locacao: {
        select: {
          cliente: { select: { nome: true } },
          veiculo: { select: { placa: true } },
        },
      },
    },
    orderBy: [{ dataVencimento: "desc" }, { criadoEm: "desc" }],
  });

  const linhas = transacoes.map((t) => ({
    data: fmtData(t.dataPagamento ?? t.dataVencimento),
    tipo: t.tipo === "entrada" ? "Entrada" : "Saída",
    categoria: categoriaLabel[t.categoria] ?? t.categoria,
    valor: Number(t.valor),
    status: statusTransacaoLabel[t.status] ?? t.status,
    forma: t.formaPagamento ? formaPagamentoLabel[t.formaPagamento] : "",
    conta: t.contaBancaria?.banco ?? "",
    veiculo: t.veiculo?.placa ?? t.locacao?.veiculo.placa ?? "",
    vinculo: t.locacao
      ? `${t.locacao.cliente.nome} · ${t.locacao.veiculo.placa}`
      : "",
    observacao: t.observacao ?? "",
  }));

  const buffer = await gerarXlsx("Financas", [
    { header: "Data", key: "data", width: 14 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Categoria", key: "categoria", width: 24 },
    { header: "Valor", key: "valor", width: 14 },
    { header: "Status", key: "status", width: 12 },
    { header: "Forma", key: "forma", width: 16 },
    { header: "Conta", key: "conta", width: 16 },
    { header: "Veículo", key: "veiculo", width: 12 },
    { header: "Vínculo", key: "vinculo", width: 26 },
    { header: "Observação", key: "observacao", width: 30 },
  ], linhas);

  const hoje = new Date().toISOString().slice(0, 10);
  return respostaXlsx(buffer, `financas-${hoje}.xlsx`);
}
