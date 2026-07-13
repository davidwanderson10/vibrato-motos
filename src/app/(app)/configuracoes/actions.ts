"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { uploadObject } from "@/lib/storage";

export type CfgState = { ok?: boolean; error?: string } | undefined;

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);
const strNull = z.preprocess(emptyToNull, z.string().nullable());

const dadosSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da empresa"),
  cnpj: strNull,
  responsavel: strNull,
  whatsapp: strNull,
  endereco: strNull,
});

export async function updateLocadora(
  _prev: CfgState,
  formData: FormData,
): Promise<CfgState> {
  const usuario = await requireStaff();

  const parsed = dadosSchema.safeParse({
    nome: formData.get("nome"),
    cnpj: formData.get("cnpj"),
    responsavel: formData.get("responsavel"),
    whatsapp: formData.get("whatsapp"),
    endereco: formData.get("endereco"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Logo (opcional)
  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 5 * 1024 * 1024) return { error: "Logo acima de 5 MB" };
    if (!logo.type.startsWith("image/"))
      return { error: "A logo deve ser uma imagem" };
    const ext = (logo.name.split(".").pop() || "png").toLowerCase();
    const chave = `locadora/${usuario.locadoraId}/logo-${crypto.randomUUID()}.${ext}`;
    await uploadObject(chave, Buffer.from(await logo.arrayBuffer()), logo.type);
    logoUrl = chave;
  }

  await prisma.locadora.update({
    where: { id: usuario.locadoraId },
    data: { ...parsed.data, ...(logoUrl ? { logoUrl } : {}) },
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function alterarPerfil(
  _prev: CfgState,
  formData: FormData,
): Promise<CfgState> {
  const usuario = await requireUser();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome" };
  await prisma.usuario.update({ where: { id: usuario.id }, data: { nome } });
  revalidatePath("/configuracoes");
  return { ok: true };
}

const emailSchema = z.object({
  novoEmail: z.string().email("E-mail inválido"),
  senhaAtual: z.string().min(1, "Informe a senha atual"),
});

export async function alterarEmail(
  _prev: CfgState,
  formData: FormData,
): Promise<CfgState> {
  const usuario = await requireUser();

  const parsed = emailSchema.safeParse({
    novoEmail: formData.get("novoEmail"),
    senhaAtual: formData.get("senhaAtual"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const ok = await bcrypt.compare(parsed.data.senhaAtual, usuario.senhaHash);
  if (!ok) return { error: "Senha atual incorreta" };

  const email = parsed.data.novoEmail.toLowerCase().trim();
  const existe = await prisma.usuario.findFirst({
    where: { email, id: { not: usuario.id } },
    select: { id: true },
  });
  if (existe) return { error: "Já existe um usuário com esse e-mail" };

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: usuario.id }, data: { email } }),
    prisma.locadora.update({
      where: { id: usuario.locadoraId },
      data: { email },
    }),
  ]);

  revalidatePath("/configuracoes");
  return { ok: true };
}

const senhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: z.string().min(6, "A nova senha deve ter ao menos 6 caracteres"),
    confirmar: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: "As senhas não conferem",
    path: ["confirmar"],
  });

export async function alterarSenha(
  _prev: CfgState,
  formData: FormData,
): Promise<CfgState> {
  const usuario = await requireUser();

  const parsed = senhaSchema.safeParse({
    senhaAtual: formData.get("senhaAtual"),
    novaSenha: formData.get("novaSenha"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const ok = await bcrypt.compare(parsed.data.senhaAtual, usuario.senhaHash);
  if (!ok) return { error: "Senha atual incorreta" };

  const senhaHash = await bcrypt.hash(parsed.data.novaSenha, 10);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash },
  });

  return { ok: true };
}
