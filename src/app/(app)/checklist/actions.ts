"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { parseDateOnly } from "@/lib/utils";

const FORMAS = [
  "pix",
  "boleto",
  "cartao_credito",
  "cartao_debito",
  "ted",
  "especie",
];

function diaRange(dia: string) {
  const [y, m, d] = dia.split("-").map(Number);
  const inicio = new Date(y, m - 1, d);
  return { inicio, fim: addDays(inicio, 1) };
}

/**
 * Registra (ou atualiza) o recebimento de um aluguel esperado, permitindo
 * ajustar o valor real recebido (ex.: com multa/juros), a data e a forma.
 */
export async function receberPagamento(
  locacaoId: string,
  dia: string, // yyyy-mm-dd (vencimento esperado)
  valor: number,
  dataPagamento: string | null, // yyyy-mm-dd
  formaPagamento: string | null,
  observacao: string | null,
) {
  const usuario = await requireStaff();

  const locacao = await prisma.locacao.findFirst({
    where: { id: locacaoId, locadoraId: usuario.locadoraId },
    select: { id: true, veiculoId: true },
  });
  if (!locacao) return;

  const valorFinal = Number.isFinite(valor) && valor >= 0 ? valor : 0;
  const forma =
    formaPagamento && FORMAS.includes(formaPagamento) ? formaPagamento : null;
  const pagoEm = dataPagamento ? parseDateOnly(dataPagamento) : new Date();
  const { inicio, fim } = diaRange(dia);

  const existente = await prisma.transacao.findFirst({
    where: {
      locadoraId: usuario.locadoraId,
      locacaoId,
      categoria: "aluguel",
      dataVencimento: { gte: inicio, lt: fim },
    },
    select: { id: true },
  });

  const data = {
    valor: valorFinal,
    dataPagamento: pagoEm,
    status: "pago" as const,
    formaPagamento: forma as never,
    observacao: observacao?.trim() || null,
  };

  if (existente) {
    await prisma.transacao.update({ where: { id: existente.id }, data });
  } else {
    await prisma.transacao.create({
      data: {
        locadoraId: usuario.locadoraId,
        locacaoId,
        veiculoId: locacao.veiculoId,
        tipo: "entrada",
        categoria: "aluguel",
        dataVencimento: inicio,
        ...data,
      },
    });
  }

  revalidatePath("/checklist");
  revalidatePath("/financas");
}

/** Remove o recebimento (volta o aluguel para pendente). */
export async function desmarcarPagamento(locacaoId: string, dia: string) {
  const usuario = await requireStaff();
  const { inicio, fim } = diaRange(dia);
  await prisma.transacao.deleteMany({
    where: {
      locadoraId: usuario.locadoraId,
      locacaoId,
      categoria: "aluguel",
      dataVencimento: { gte: inicio, lt: fim },
    },
  });
  revalidatePath("/checklist");
  revalidatePath("/financas");
}
