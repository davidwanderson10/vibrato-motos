"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { parseDateOnly } from "@/lib/utils";
import { categoriaLabel } from "@/lib/enums";

export type TransacaoFormState = { ok?: boolean; error?: string } | undefined;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const strNull = z.preprocess(emptyToNull, z.string().nullable());

const FORMAS = [
  "pix",
  "boleto",
  "cartao_credito",
  "cartao_debito",
  "ted",
  "especie",
];

const schema = z
  .object({
    id: strNull,
    tipo: z.enum(["entrada", "saida"]),
    categoria: z.string().refine((c) => c in categoriaLabel, "Categoria inválida"),
    valor: z.coerce.number().min(0, "Informe o valor"),
    dataVencimento: strNull,
    dataPagamento: strNull,
    status: z.enum(["pendente", "pago", "cancelado"]),
    formaPagamento: z.preprocess(
      emptyToNull,
      z
        .string()
        .nullable()
        .refine((f) => f === null || FORMAS.includes(f), "Forma inválida"),
    ),
    contaBancariaId: strNull,
    locacaoId: strNull,
    observacao: strNull,
  })
  .refine((d) => d.status !== "pago" || !!d.dataPagamento, {
    message: "Informe a data do pagamento para status Pago",
    path: ["dataPagamento"],
  });

export async function saveTransacao(
  _prev: TransacaoFormState,
  formData: FormData,
): Promise<TransacaoFormState> {
  const usuario = await requireStaff();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  const data = {
    tipo: d.tipo,
    categoria: d.categoria as never,
    valor: d.valor,
    dataVencimento: d.dataVencimento ? parseDateOnly(d.dataVencimento) : null,
    dataPagamento:
      d.status === "pago" && d.dataPagamento
        ? parseDateOnly(d.dataPagamento)
        : null,
    status: d.status,
    formaPagamento: (d.formaPagamento ?? null) as never,
    contaBancariaId: d.contaBancariaId,
    locacaoId: d.locacaoId,
    observacao: d.observacao,
  };

  try {
    if (d.id) {
      await prisma.transacao.update({
        where: { id: d.id, locadoraId: usuario.locadoraId },
        data,
      });
    } else {
      await prisma.transacao.create({
        data: { ...data, locadoraId: usuario.locadoraId },
      });
    }
  } catch {
    return { error: "Não foi possível salvar o lançamento." };
  }

  revalidatePath("/financas");
  return { ok: true };
}

export async function confirmarTransacao(id: string) {
  const usuario = await requireStaff();
  await prisma.transacao.updateMany({
    where: { id, locadoraId: usuario.locadoraId },
    data: { status: "pago", dataPagamento: new Date() },
  });
  revalidatePath("/financas");
}

export async function cancelarTransacao(id: string) {
  const usuario = await requireStaff();
  await prisma.transacao.updateMany({
    where: { id, locadoraId: usuario.locadoraId },
    data: { status: "cancelado" },
  });
  revalidatePath("/financas");
}

export async function deleteTransacao(id: string) {
  const usuario = await requireStaff();
  await prisma.transacao.deleteMany({
    where: { id, locadoraId: usuario.locadoraId },
  });
  revalidatePath("/financas");
}

// ---- Contas bancárias ----

export async function createConta(formData: FormData) {
  const usuario = await requireStaff();
  const banco = String(formData.get("banco") ?? "").trim();
  if (!banco) return;
  await prisma.contaBancaria.create({
    data: {
      locadoraId: usuario.locadoraId,
      banco,
      agencia: String(formData.get("agencia") ?? "").trim() || null,
      conta: String(formData.get("conta") ?? "").trim() || null,
      tipo: String(formData.get("tipo") ?? "").trim() || null,
    },
  });
  revalidatePath("/financas");
}

export async function deleteConta(id: string) {
  const usuario = await requireStaff();
  await prisma.contaBancaria.deleteMany({
    where: { id, locadoraId: usuario.locadoraId },
  });
  revalidatePath("/financas");
}
