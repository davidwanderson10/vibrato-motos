"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireUser } from "@/lib/auth";
import { veiculoStatusValues } from "@/lib/enums";
import { parseDateOnly } from "@/lib/utils";
import { uploadObject, deleteObject } from "@/lib/storage";

export type VeiculoFormState = { ok?: boolean; error?: string } | undefined;

const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;

const veiculoSchema = z.object({
  id: z.string().optional(),
  tipo: z.enum(["moto", "carro"]),
  placa: z.string().trim().min(1, "Informe a placa"),
  renavam: z.preprocess(emptyToNull, z.string().nullable()),
  marca: z.preprocess(emptyToNull, z.string().nullable()),
  modelo: z.preprocess(emptyToNull, z.string().nullable()),
  cor: z.preprocess(emptyToNull, z.string().nullable()),
  ano: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1900).max(2100).nullable(),
  ),
  kmAtual: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).nullable(),
  ),
  valorCompra: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).nullable(),
  ),
  valorFipe: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable()),
  status: z.enum(veiculoStatusValues as [string, ...string[]]),
  dataAquisicao: z.preprocess(emptyToNull, z.string().nullable()),
  vendedor: z.preprocess(emptyToNull, z.string().nullable()),
  propria: z.preprocess((v) => v !== "nao", z.boolean()),
  proprietario: z.preprocess(emptyToNull, z.string().nullable()),
});

export async function saveVeiculo(
  _prev: VeiculoFormState,
  formData: FormData,
): Promise<VeiculoFormState> {
  const usuario = await requireStaff();

  const parsed = veiculoSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  const data = {
    tipo: d.tipo,
    placa: d.placa.toUpperCase(),
    renavam: d.renavam,
    marca: d.marca,
    modelo: d.modelo,
    cor: d.cor,
    ano: d.ano,
    kmAtual: d.kmAtual,
    valorCompra: d.valorCompra,
    valorFipe: d.valorFipe,
    status: d.status as never,
    dataAquisicao: d.dataAquisicao ? parseDateOnly(d.dataAquisicao) : null,
    vendedor: d.vendedor,
    propria: d.propria,
    proprietario: d.propria ? null : d.proprietario,
  };

  try {
    if (d.id) {
      // Garante que o veículo pertence à locadora do usuário.
      await prisma.veiculo.update({
        where: { id: d.id, locadoraId: usuario.locadoraId },
        data,
      });
    } else {
      await prisma.veiculo.create({
        data: { ...data, locadoraId: usuario.locadoraId },
      });
    }
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "Já existe um veículo com essa placa." };
    }
    throw e;
  }

  revalidatePath("/frota");
  return { ok: true };
}

export async function deleteVeiculo(id: string) {
  const usuario = await requireStaff();
  await prisma.veiculo.delete({
    where: { id, locadoraId: usuario.locadoraId },
  });
  revalidatePath("/frota");
}

// ===== Ações permitidas ao investidor (escopadas à moto dele) =====

/** Verifica se o usuário pode editar este veículo (staff qualquer; investidor só o dele). */
async function veiculoEditavel(
  veiculoId: string,
  usuario: { id: string; locadoraId: string; cargo: string },
) {
  return prisma.veiculo.findFirst({
    where: {
      id: veiculoId,
      locadoraId: usuario.locadoraId,
      ...(usuario.cargo === "investidor" ? { investidorId: usuario.id } : {}),
    },
    select: { id: true },
  });
}

const limitadoSchema = z.object({
  id: z.string().min(1),
  valorFipe: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable()),
  kmAtual: z.preprocess(emptyToNull, z.coerce.number().int().min(0).nullable()),
  observacoes: z.preprocess(emptyToNull, z.string().nullable()),
});

/** Edição limitada da moto (FIPE, km, observações) — usada por investidor e staff. */
export async function updateVeiculoLimitado(
  _prev: VeiculoFormState,
  formData: FormData,
): Promise<VeiculoFormState> {
  const usuario = await requireUser();
  const parsed = limitadoSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  const permitido = await veiculoEditavel(d.id, usuario);
  if (!permitido) return { error: "Sem permissão para editar este veículo." };

  await prisma.veiculo.update({
    where: { id: d.id },
    data: {
      valorFipe: d.valorFipe,
      kmAtual: d.kmAtual,
      observacoes: d.observacoes,
    },
  });

  revalidatePath("/frota");
  revalidatePath(`/frota/${d.id}`);
  return { ok: true };
}

const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS_OK = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

/** Upload de documento da moto (nota fiscal, seguro, etc.). */
export async function uploadDocumentoVeiculo(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const usuario = await requireUser();
  const veiculoId = String(formData.get("veiculoId") ?? "");
  const arquivo = formData.get("arquivo");

  const permitido = await veiculoEditavel(veiculoId, usuario);
  if (!permitido) return { error: "Sem permissão" };

  if (!(arquivo instanceof File) || arquivo.size === 0)
    return { error: "Selecione um arquivo" };
  if (arquivo.size > MAX_BYTES) return { error: "Arquivo acima de 10 MB" };
  if (arquivo.type && !TIPOS_OK.includes(arquivo.type))
    return { error: "Tipo não permitido (use imagem ou PDF)" };

  const safeName = arquivo.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const chave = `veiculos/${veiculoId}/${crypto.randomUUID()}-${safeName}`;
  await uploadObject(chave, Buffer.from(await arquivo.arrayBuffer()), arquivo.type || undefined);
  await prisma.documentoVeiculo.create({
    data: { veiculoId, nome: arquivo.name, chave },
  });

  revalidatePath(`/frota/${veiculoId}`);
}

/** Remove documento da moto. */
export async function deleteDocumentoVeiculo(id: string) {
  const usuario = await requireUser();
  const doc = await prisma.documentoVeiculo.findFirst({
    where: {
      id,
      veiculo: {
        locadoraId: usuario.locadoraId,
        ...(usuario.cargo === "investidor" ? { investidorId: usuario.id } : {}),
      },
    },
    select: { id: true, chave: true, veiculoId: true },
  });
  if (!doc) return;
  try {
    await deleteObject(doc.chave);
  } catch {
    // ignora falha no storage
  }
  await prisma.documentoVeiculo.delete({ where: { id: doc.id } });
  revalidatePath(`/frota/${doc.veiculoId}`);
}
