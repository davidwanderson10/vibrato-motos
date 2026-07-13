"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { parseDateOnly } from "@/lib/utils";
import { uploadObject, deleteObject } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS_OK = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export type ManutencaoFormState = { ok?: boolean; error?: string } | undefined;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const strNull = z.preprocess(emptyToNull, z.string().nullable());
const FORMAS = ["pix", "boleto", "cartao_credito", "cartao_debito", "ted", "especie"];

const schema = z.object({
  id: strNull,
  veiculoId: z.string().min(1, "Selecione a moto"),
  data: z.string().min(1, "Informe a data"),
  kmVeiculo: z.preprocess(emptyToNull, z.coerce.number().int().min(0).nullable()),
  oficina: strNull,
  descricao: strNull,
  pecasServicos: strNull,
  valor: z.coerce.number().min(0).default(0),
  status: z.enum(["agendada", "em_andamento", "finalizada"]),
  pago: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  formaPagamento: z.preprocess(
    emptyToNull,
    z.string().nullable().refine((f) => f === null || FORMAS.includes(f), "Forma inválida"),
  ),
  contaBancariaId: strNull,
});

export async function saveManutencao(
  _prev: ManutencaoFormState,
  formData: FormData,
): Promise<ManutencaoFormState> {
  const usuario = await requireStaff();

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  const veiculo = await prisma.veiculo.findFirst({
    where: { id: d.veiculoId, locadoraId: usuario.locadoraId },
    select: { id: true },
  });
  if (!veiculo) return { error: "Moto inválida" };

  const data = parseDateOnly(d.data);
  const obsDespesa =
    `Manutenção${d.oficina ? ` — ${d.oficina}` : ""}` +
    (d.descricao ? `: ${d.descricao}` : "");

  const despesaData = {
    tipo: "saida" as const,
    categoria: "manutencao" as const,
    valor: d.valor,
    veiculoId: d.veiculoId,
    dataVencimento: data,
    dataPagamento: d.pago ? data : null,
    status: (d.pago ? "pago" : "pendente") as never,
    formaPagamento: (d.formaPagamento ?? null) as never,
    contaBancariaId: d.contaBancariaId,
    observacao: obsDespesa,
  };

  const manutencaoData = {
    veiculoId: d.veiculoId,
    data,
    kmVeiculo: d.kmVeiculo,
    oficina: d.oficina,
    descricao: d.descricao,
    pecasServicos: d.pecasServicos,
    valor: d.valor,
    status: d.status as never,
  };

  let manutencaoId: string;
  try {
    manutencaoId = await prisma.$transaction(async (tx) => {
      if (d.id) {
        const existente = await tx.manutencao.findFirst({
          where: { id: d.id, locadoraId: usuario.locadoraId },
          select: { id: true, transacaoId: true },
        });
        if (!existente) throw new Error("Manutenção não encontrada");

        await tx.manutencao.update({
          where: { id: d.id },
          data: manutencaoData,
        });

        if (d.valor > 0) {
          if (existente.transacaoId) {
            await tx.transacao.update({
              where: { id: existente.transacaoId },
              data: despesaData,
            });
          } else {
            const t = await tx.transacao.create({
              data: { ...despesaData, locadoraId: usuario.locadoraId },
            });
            await tx.manutencao.update({
              where: { id: d.id },
              data: { transacaoId: t.id },
            });
          }
        } else if (existente.transacaoId) {
          // valor zerado: remove a despesa vinculada
          await tx.manutencao.update({
            where: { id: d.id },
            data: { transacaoId: null },
          });
          await tx.transacao.delete({ where: { id: existente.transacaoId } });
        }
        return d.id;
      } else {
        const m = await tx.manutencao.create({
          data: { ...manutencaoData, locadoraId: usuario.locadoraId },
        });
        if (d.valor > 0) {
          const t = await tx.transacao.create({
            data: { ...despesaData, locadoraId: usuario.locadoraId },
          });
          await tx.manutencao.update({
            where: { id: m.id },
            data: { transacaoId: t.id },
          });
        }
        return m.id;
      }
    });
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "Manutenção não encontrada"
          ? e.message
          : "Não foi possível salvar a manutenção.",
    };
  }

  // Anexos (recibo/NF) — upload após a transação.
  const arquivos = formData
    .getAll("arquivos")
    .filter((a): a is File => a instanceof File && a.size > 0);
  for (const arquivo of arquivos) {
    if (arquivo.size > MAX_BYTES) continue;
    if (arquivo.type && !TIPOS_OK.includes(arquivo.type)) continue;
    const safe = arquivo.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const chave = `manutencoes/${manutencaoId}/${crypto.randomUUID()}-${safe}`;
    await uploadObject(chave, Buffer.from(await arquivo.arrayBuffer()), arquivo.type || undefined);
    await prisma.documentoManutencao.create({
      data: { manutencaoId, nome: arquivo.name, chave },
    });
  }

  revalidatePath("/manutencoes");
  revalidatePath("/financas");
  return { ok: true };
}

export async function deleteDocumentoManutencao(id: string) {
  const usuario = await requireStaff();
  const doc = await prisma.documentoManutencao.findFirst({
    where: { id, manutencao: { locadoraId: usuario.locadoraId } },
    select: { id: true, chave: true },
  });
  if (!doc) return;
  try {
    await deleteObject(doc.chave);
  } catch {
    // ignora falha no storage
  }
  await prisma.documentoManutencao.delete({ where: { id: doc.id } });
  revalidatePath("/manutencoes");
}

export async function deleteManutencao(id: string) {
  const usuario = await requireStaff();
  const m = await prisma.manutencao.findFirst({
    where: { id, locadoraId: usuario.locadoraId },
    select: { id: true, transacaoId: true, documentos: { select: { chave: true } } },
  });
  if (!m) return;
  // Remove os anexos do storage.
  for (const doc of m.documentos) {
    await deleteObject(doc.chave).catch(() => {});
  }
  await prisma.$transaction(async (tx) => {
    await tx.manutencao.delete({ where: { id: m.id } });
    if (m.transacaoId) {
      await tx.transacao.delete({ where: { id: m.transacaoId } }).catch(() => {});
    }
  });
  revalidatePath("/manutencoes");
  revalidatePath("/financas");
}
