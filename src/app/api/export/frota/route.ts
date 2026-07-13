import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccess, veiculoWhere } from "@/lib/permissoes";
import { veiculoStatusValues, veiculoStatusLabel, tipoVeiculoLabel } from "@/lib/enums";
import { gerarXlsx, respostaXlsx } from "@/lib/excel";

export async function GET(request: Request) {
  const usuario = await getCurrentUser();
  if (!usuario) return new Response("Não autorizado", { status: 401 });
  if (!canAccess(usuario, "frota"))
    return new Response("Sem permissão", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const tipo = sp.get("tipo");
  const status = sp.get("status");
  const q = sp.get("q")?.trim();

  const where: Prisma.VeiculoWhereInput = {
    locadoraId: usuario.locadoraId,
    ...veiculoWhere(usuario),
  };
  if (tipo === "moto" || tipo === "carro") where.tipo = tipo;
  if (status && veiculoStatusValues.includes(status))
    where.status = status as never;
  if (q) {
    where.OR = [
      { placa: { contains: q, mode: "insensitive" } },
      { marca: { contains: q, mode: "insensitive" } },
      { modelo: { contains: q, mode: "insensitive" } },
    ];
  }

  const veiculos = await prisma.veiculo.findMany({
    where,
    include: { investidor: { select: { nome: true } } },
    orderBy: [{ status: "asc" }, { placa: "asc" }],
  });

  const linhas = veiculos.map((v) => ({
    placa: v.placa,
    tipo: tipoVeiculoLabel[v.tipo] ?? v.tipo,
    marca: v.marca ?? "",
    modelo: v.modelo ?? "",
    ano: v.ano ?? "",
    cor: v.cor ?? "",
    km: v.kmAtual ?? "",
    valorCompra: v.valorCompra ? Number(v.valorCompra) : "",
    valorFipe: v.valorFipe ? Number(v.valorFipe) : "",
    status: veiculoStatusLabel[v.status] ?? v.status,
    propria: v.propria ? "Sim" : "Não",
    proprietario: v.investidor?.nome ?? v.proprietario ?? "",
    vendedor: v.vendedor ?? "",
    renavam: v.renavam ?? "",
  }));

  const buffer = await gerarXlsx("Frota", [
    { header: "Placa", key: "placa", width: 12 },
    { header: "Tipo", key: "tipo", width: 10 },
    { header: "Marca", key: "marca" },
    { header: "Modelo", key: "modelo", width: 22 },
    { header: "Ano", key: "ano", width: 8 },
    { header: "Cor", key: "cor", width: 12 },
    { header: "KM", key: "km", width: 10 },
    { header: "Valor de compra", key: "valorCompra", width: 16 },
    { header: "Valor FIPE", key: "valorFipe", width: 16 },
    { header: "Status", key: "status", width: 22 },
    { header: "Própria", key: "propria", width: 10 },
    { header: "Proprietário/Investidor", key: "proprietario", width: 24 },
    { header: "Vendedor", key: "vendedor", width: 24 },
    { header: "Renavam", key: "renavam", width: 16 },
  ], linhas);

  const hoje = new Date().toISOString().slice(0, 10);
  return respostaXlsx(buffer, `frota-${hoje}.xlsx`);
}
