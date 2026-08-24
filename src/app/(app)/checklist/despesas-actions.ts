"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { parseDateOnly } from "@/lib/utils";
import { categoriaSaidaLabel } from "@/lib/enums";

export type DespesaFormState = { ok?: boolean; error?: string } | undefined;

const FORMAS = ["pix", "boleto", "cartao_credito", "cartao_debito", "ted", "especie"];

function diaRange(dia: string) {
  const [y, m, d] = dia.split("-").map(Number);
  const inicio = new Date(y, m - 1, d);
  return { inicio, fim: addDays(inicio, 1) };
}

/**
 * Marca (ou atualiza) o pagamento de uma ocorrência de despesa recorrente.
 * `veiculoId` distingue as linhas por moto (modo percentual). Pode ser null.
 */
export async function pagarDespesa(
  despesaId: string,
  veiculoId: string | null,
  dia: string, // yyyy-mm-dd (vencimento esperado)
  valor: number,
  dataPagamento: string | null,
  formaPagamento: string | null,
  observacao: string | null,
) {
  const usuario = await requireStaff();

  const despesa = await prisma.despesaRecorrente.findFirst({
    where: { id: despesaId, locadoraId: usuario.locadoraId },
    select: { id: true, categoria: true, contaBancariaId: true },
  });
  if (!despesa) return;

  // Valida a moto (quando informada).
  if (veiculoId) {
    const v = await prisma.veiculo.findFirst({
      where: { id: veiculoId, locadoraId: usuario.locadoraId },
      select: { id: true },
    });
    if (!v) return;
  }

  const valorFinal = Number.isFinite(valor) && valor >= 0 ? valor : 0;
  const forma =
    formaPagamento && FORMAS.includes(formaPagamento) ? formaPagamento : null;
  const pagoEm = dataPagamento ? parseDateOnly(dataPagamento) : new Date();
  const { inicio, fim } = diaRange(dia);

  const existente = await prisma.transacao.findFirst({
    where: {
      locadoraId: usuario.locadoraId,
      despesaRecorrenteId: despesaId,
      veiculoId: veiculoId ?? null,
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
        despesaRecorrenteId: despesaId,
        veiculoId: veiculoId ?? null,
        contaBancariaId: despesa.contaBancariaId,
        tipo: "saida",
        categoria: despesa.categoria,
        dataVencimento: inicio,
        ...data,
      },
    });
  }

  revalidatePath("/checklist");
  revalidatePath("/financas");
}

/** Desmarca o pagamento de uma ocorrência (volta a pendente). */
export async function desmarcarDespesa(
  despesaId: string,
  veiculoId: string | null,
  dia: string,
) {
  const usuario = await requireStaff();
  const { inicio, fim } = diaRange(dia);
  await prisma.transacao.deleteMany({
    where: {
      locadoraId: usuario.locadoraId,
      despesaRecorrenteId: despesaId,
      veiculoId: veiculoId ?? null,
      dataVencimento: { gte: inicio, lt: fim },
    },
  });
  revalidatePath("/checklist");
  revalidatePath("/financas");
}

// ---- CRUD dos modelos de despesa recorrente ----

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const strNull = z.preprocess(emptyToNull, z.string().nullable());
const numNull = z.preprocess(emptyToNull, z.coerce.number().nullable());

const schema = z
  .object({
    id: strNull,
    tipoValor: z.enum(["fixo", "percentual"]),
    categoria: z
      .string()
      .refine((c) => c in categoriaSaidaLabel, "Categoria inválida"),
    descricao: strNull,
    valor: numNull,
    percentual: numNull,
    frequencia: z.enum(["diario", "semanal", "quinzenal", "mensal"]),
    primeiraData: z.string().min(1, "Informe a data do 1º vencimento"),
    veiculoId: strNull,
    contaBancariaId: strNull,
    formaPagamento: z.preprocess(
      emptyToNull,
      z.string().nullable().refine((f) => f === null || FORMAS.includes(f), "Forma inválida"),
    ),
    ativa: z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean()),
  })
  .refine((d) => d.tipoValor !== "fixo" || (d.valor ?? 0) > 0, {
    message: "Informe o valor",
    path: ["valor"],
  })
  .refine((d) => d.tipoValor !== "percentual" || (d.percentual ?? 0) > 0, {
    message: "Informe o percentual (ex.: 6)",
    path: ["percentual"],
  });

export async function saveDespesa(
  _prev: DespesaFormState,
  formData: FormData,
): Promise<DespesaFormState> {
  const usuario = await requireStaff();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  const isPct = d.tipoValor === "percentual";

  // Valida vínculos (moto só no modo fixo; percentual aplica a todas).
  if (!isPct && d.veiculoId) {
    const v = await prisma.veiculo.findFirst({
      where: { id: d.veiculoId, locadoraId: usuario.locadoraId },
      select: { id: true },
    });
    if (!v) return { error: "Moto inválida" };
  }
  if (d.contaBancariaId) {
    const c = await prisma.contaBancaria.findFirst({
      where: { id: d.contaBancariaId, locadoraId: usuario.locadoraId },
      select: { id: true },
    });
    if (!c) return { error: "Conta inválida" };
  }

  const data = {
    categoria: d.categoria as never,
    descricao: d.descricao,
    tipoValor: d.tipoValor,
    valor: isPct ? 0 : (d.valor ?? 0),
    percentual: isPct ? (d.percentual ?? 0) : null,
    // Percentual é sempre mensal e aplica a todas as motos.
    frequencia: isPct ? ("mensal" as const) : d.frequencia,
    primeiraData: parseDateOnly(d.primeiraData),
    veiculoId: isPct ? null : d.veiculoId,
    contaBancariaId: d.contaBancariaId,
    formaPagamento: (d.formaPagamento ?? null) as never,
    ativa: d.ativa,
  };

  try {
    if (d.id) {
      await prisma.despesaRecorrente.update({
        where: { id: d.id, locadoraId: usuario.locadoraId },
        data,
      });
    } else {
      await prisma.despesaRecorrente.create({
        data: { ...data, locadoraId: usuario.locadoraId },
      });
    }
  } catch {
    return { error: "Não foi possível salvar a despesa recorrente." };
  }

  revalidatePath("/checklist");
  return { ok: true };
}

/** Exclui o modelo. As transações já geradas ficam (só perdem o vínculo). */
export async function deleteDespesa(id: string) {
  const usuario = await requireStaff();
  await prisma.despesaRecorrente.deleteMany({
    where: { id, locadoraId: usuario.locadoraId },
  });
  revalidatePath("/checklist");
}
