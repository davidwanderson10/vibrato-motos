"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { needsSetup } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Se ainda não há locadora cadastrada, vai para o setup inicial.
  if (await needsSetup()) redirect("/setup");

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });
  if (!usuario || !usuario.ativo) {
    return { error: "E-mail ou senha incorretos" };
  }

  const ok = await bcrypt.compare(parsed.data.senha, usuario.senhaHash);
  if (!ok) {
    return { error: "E-mail ou senha incorretos" };
  }

  await createSession({ userId: usuario.id, locadoraId: usuario.locadoraId });
  redirect("/dashboard");
}

const setupSchema = z
  .object({
    nomeEmpresa: z.string().min(1, "Informe o nome da empresa"),
    cnpj: z.string().optional(),
    responsavel: z.string().min(1, "Informe o nome do responsável"),
    whatsapp: z.string().optional(),
    endereco: z.string().optional(),
    email: z.string().email("E-mail de acesso inválido"),
    senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

export async function setupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Só permite o setup se não houver locadora ainda.
  if (!(await needsSetup())) redirect("/login");

  const parsed = setupSchema.safeParse({
    nomeEmpresa: formData.get("nomeEmpresa"),
    cnpj: formData.get("cnpj"),
    responsavel: formData.get("responsavel"),
    whatsapp: formData.get("whatsapp"),
    endereco: formData.get("endereco"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  const email = d.email.toLowerCase().trim();

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return { error: "Já existe um usuário com esse e-mail" };
  }

  const senhaHash = await bcrypt.hash(d.senha, 10);

  const usuario = await prisma.$transaction(async (tx) => {
    const locadora = await tx.locadora.create({
      data: {
        nome: d.nomeEmpresa,
        cnpj: d.cnpj || null,
        whatsapp: d.whatsapp || null,
        endereco: d.endereco || null,
        email,
      },
    });
    return tx.usuario.create({
      data: {
        locadoraId: locadora.id,
        nome: d.responsavel,
        email,
        senhaHash,
        cargo: "admin",
      },
    });
  });

  await createSession({ userId: usuario.id, locadoraId: usuario.locadoraId });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
