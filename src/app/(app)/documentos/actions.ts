"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireScreen } from "@/lib/auth";
import { porVeiculoWhere } from "@/lib/permissoes";
import { uploadObject, deleteObject, presignedGetUrl } from "@/lib/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const TIPOS_OK = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

/** Faz upload de um ou mais documentos, com vínculo opcional a moto e/ou locação. */
export async function uploadDocumentos(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const usuario = await requireStaff();
  const loc = usuario.locadoraId;

  const veiculoId = String(formData.get("veiculoId") ?? "") || null;
  const locacaoId = String(formData.get("locacaoId") ?? "") || null;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const arquivos = formData.getAll("arquivos").filter((a): a is File => a instanceof File && a.size > 0);

  if (arquivos.length === 0) return { error: "Selecione ao menos um arquivo" };

  // Valida vínculos contra a locadora do usuário.
  if (veiculoId) {
    const v = await prisma.veiculo.findFirst({
      where: { id: veiculoId, locadoraId: loc },
      select: { id: true },
    });
    if (!v) return { error: "Moto inválida" };
  }
  if (locacaoId) {
    const l = await prisma.locacao.findFirst({
      where: { id: locacaoId, locadoraId: loc },
      select: { id: true },
    });
    if (!l) return { error: "Locação inválida" };
  }

  for (const arquivo of arquivos) {
    if (arquivo.size > MAX_BYTES) return { error: `"${arquivo.name}" acima de 10 MB` };
    if (arquivo.type && !TIPOS_OK.includes(arquivo.type)) {
      return { error: `"${arquivo.name}": tipo não permitido (use imagem ou PDF)` };
    }
    const safeName = arquivo.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const chave = `documentos/${loc}/${crypto.randomUUID()}-${safeName}`;
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    await uploadObject(chave, buffer, arquivo.type || undefined);
    await prisma.documento.create({
      data: { locadoraId: loc, veiculoId, locacaoId, descricao, nome: arquivo.name, chave },
    });
  }

  revalidatePath("/documentos");
}

/** Remove um documento (storage + banco). */
export async function deleteDocumento(id: string) {
  const usuario = await requireStaff();
  const doc = await prisma.documento.findFirst({
    where: { id, locadoraId: usuario.locadoraId },
    select: { id: true, chave: true },
  });
  if (!doc) return;
  try {
    await deleteObject(doc.chave);
  } catch {
    // se falhar no storage, ainda remove do banco
  }
  await prisma.documento.delete({ where: { id: doc.id } });
  revalidatePath("/documentos");
}

/** URL temporária para visualizar/baixar um documento (respeita o escopo do investidor). */
export async function getDocumentoUrl(
  id: string,
): Promise<{ url?: string; error?: string }> {
  const usuario = await requireScreen("documentos");
  const doc = await prisma.documento.findFirst({
    where: { id, locadoraId: usuario.locadoraId, ...porVeiculoWhere(usuario) },
    select: { chave: true },
  });
  if (!doc) return { error: "Documento não encontrado" };
  try {
    return { url: await presignedGetUrl(doc.chave) };
  } catch {
    return { error: "Não foi possível abrir o documento." };
  }
}
