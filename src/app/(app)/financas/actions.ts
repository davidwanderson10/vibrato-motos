"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireScreen } from "@/lib/auth";
import { parseDateOnly } from "@/lib/utils";
import { categoriaLabel } from "@/lib/enums";
import { uploadObject, deleteObject, presignedGetUrl } from "@/lib/storage";

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
    veiculoId: strNull,
    observacao: strNull,
  })
  .refine((d) => d.status !== "pago" || !!d.dataPagamento, {
    message: "Informe a data do pagamento para status Pago",
    path: ["dataPagamento"],
  });

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const TIPOS_OK = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export async function saveTransacao(
  _prev: TransacaoFormState,
  formData: FormData,
): Promise<TransacaoFormState> {
  const usuario = await requireStaff();
  const loc = usuario.locadoraId;

  const arquivo = formData.get("comprovante");
  const removerComprovante = formData.get("removerComprovante") === "1";

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  // Se a transação está vinculada a uma locação e nenhuma moto foi escolhida,
  // atribui a moto da própria locação (mantém o "Resultado por veículo" correto).
  let veiculoId = d.veiculoId;
  if (d.locacaoId && !veiculoId) {
    const locacao = await prisma.locacao.findFirst({
      where: { id: d.locacaoId, locadoraId: loc },
      select: { veiculoId: true },
    });
    veiculoId = locacao?.veiculoId ?? null;
  }

  // Valida a moto (quando informada) contra a locadora do usuário.
  if (veiculoId) {
    const veiculo = await prisma.veiculo.findFirst({
      where: { id: veiculoId, locadoraId: loc },
      select: { id: true },
    });
    if (!veiculo) return { error: "Moto inválida" };
  }

  // ---- Comprovante (opcional) ----
  let novaChave: string | null | undefined = undefined; // undefined = não mexe
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > MAX_BYTES) return { error: "Comprovante acima de 10 MB" };
    if (arquivo.type && !TIPOS_OK.includes(arquivo.type)) {
      return { error: "Comprovante inválido (use imagem ou PDF)" };
    }
    const safeName = arquivo.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const chave = `comprovantes/${loc}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    try {
      await uploadObject(chave, buffer, arquivo.type || undefined);
    } catch {
      return { error: "Falha ao enviar o comprovante." };
    }
    novaChave = chave;
  } else if (removerComprovante) {
    novaChave = null;
  }

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
    veiculoId,
    observacao: d.observacao,
  };

  try {
    if (d.id) {
      // Ao substituir/remover, apaga o objeto antigo do storage.
      if (novaChave !== undefined) {
        const atual = await prisma.transacao.findFirst({
          where: { id: d.id, locadoraId: loc },
          select: { comprovanteUrl: true },
        });
        if (atual?.comprovanteUrl && atual.comprovanteUrl !== novaChave) {
          try {
            await deleteObject(atual.comprovanteUrl);
          } catch {
            // storage pode falhar; segue atualizando o banco
          }
        }
      }
      await prisma.transacao.update({
        where: { id: d.id, locadoraId: loc },
        data: novaChave !== undefined ? { ...data, comprovanteUrl: novaChave } : data,
      });
    } else {
      await prisma.transacao.create({
        data: {
          ...data,
          locadoraId: loc,
          comprovanteUrl: novaChave ?? null,
        },
      });
    }
  } catch {
    return { error: "Não foi possível salvar o lançamento." };
  }

  revalidatePath("/financas");
  return { ok: true };
}

/** URL temporária para visualizar o comprovante de um lançamento. */
export async function getComprovanteUrl(
  id: string,
): Promise<{ url?: string; error?: string }> {
  const usuario = await requireScreen("financas");
  const t = await prisma.transacao.findFirst({
    where: { id, locadoraId: usuario.locadoraId },
    select: { comprovanteUrl: true },
  });
  if (!t?.comprovanteUrl) return { error: "Sem comprovante" };
  try {
    return { url: await presignedGetUrl(t.comprovanteUrl) };
  } catch {
    return { error: "Não foi possível abrir o comprovante." };
  }
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
