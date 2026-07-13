"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { INVESTIDOR_TELAS } from "@/lib/permissoes";

export type UsuarioFormState = { ok?: boolean; error?: string } | undefined;

const CARGOS = ["admin", "socio", "diretor", "gerente", "operador", "investidor"];

const schema = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(1, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  senha: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(6, "A senha deve ter ao menos 6 caracteres").optional(),
  ),
  cargo: z.enum(CARGOS as [string, ...string[]]),
});

export async function saveUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const admin = await requireUser();
  if (admin.cargo !== "admin") return { error: "Sem permissão" };

  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    cargo: formData.get("cargo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  const email = d.email.toLowerCase().trim();
  const isInvestidor = d.cargo === "investidor";

  // Permissões de tela (só valem para investidor).
  const permissoes = isInvestidor
    ? formData.getAll("permissoes").map(String).filter((p) => INVESTIDOR_TELAS.includes(p as never))
    : [];

  // Motos atribuídas (só para investidor).
  const veiculoIds = isInvestidor
    ? formData.getAll("veiculos").map(String)
    : [];

  // E-mail único
  const jaExiste = await prisma.usuario.findFirst({
    where: { email, ...(d.id ? { id: { not: d.id } } : {}) },
    select: { id: true },
  });
  if (jaExiste) return { error: "Já existe um usuário com esse e-mail" };

  let usuarioId = d.id;

  if (d.id) {
    const data: Record<string, unknown> = {
      nome: d.nome,
      email,
      cargo: d.cargo,
      permissoes,
    };
    if (d.senha) data.senhaHash = await bcrypt.hash(d.senha, 10);
    await prisma.usuario.update({
      where: { id: d.id, locadoraId: admin.locadoraId },
      data,
    });
  } else {
    if (!d.senha) return { error: "Informe uma senha inicial" };
    const novo = await prisma.usuario.create({
      data: {
        locadoraId: admin.locadoraId,
        nome: d.nome,
        email,
        senhaHash: await bcrypt.hash(d.senha, 10),
        cargo: d.cargo as never,
        permissoes,
      },
    });
    usuarioId = novo.id;
  }

  // Reconcilia as motos do investidor (ou limpa se deixou de ser).
  // Primeiro tira todas as motos atualmente vinculadas a este usuário...
  await prisma.veiculo.updateMany({
    where: { locadoraId: admin.locadoraId, investidorId: usuarioId },
    data: { investidorId: null },
  });
  // ...e vincula as selecionadas (validando que são da locadora).
  if (isInvestidor && veiculoIds.length > 0) {
    await prisma.veiculo.updateMany({
      where: { id: { in: veiculoIds }, locadoraId: admin.locadoraId },
      data: { investidorId: usuarioId, propria: false },
    });
  }

  revalidatePath("/usuarios");
  revalidatePath("/frota");
  return { ok: true };
}

export async function toggleUsuarioAtivo(id: string, ativo: boolean) {
  const admin = await requireUser();
  if (admin.cargo !== "admin") return;
  if (id === admin.id) return; // não desativa a si mesmo
  await prisma.usuario.updateMany({
    where: { id, locadoraId: admin.locadoraId },
    data: { ativo },
  });
  revalidatePath("/usuarios");
}
