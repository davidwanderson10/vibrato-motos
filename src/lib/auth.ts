import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canAccess, firstAllowedHref, type Screen } from "@/lib/permissoes";

/** Usuário atual + locadora, ou null. Memoizado por request. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    include: { locadora: true },
  });

  if (!usuario || !usuario.ativo) return null;
  return usuario;
});

/** Exige usuário autenticado; redireciona para /login se não houver. */
export async function requireUser() {
  const usuario = await getCurrentUser();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Exige acesso a uma tela; redireciona se o usuário não tiver permissão. */
export async function requireScreen(screen: Screen) {
  const usuario = await requireUser();
  if (!canAccess(usuario, screen)) redirect(firstAllowedHref(usuario));
  return usuario;
}

/** Exige que o usuário seja da equipe (não investidor). Barra mutações sensíveis. */
export async function requireStaff() {
  const usuario = await requireUser();
  if (usuario.cargo === "investidor") {
    throw new Error("Sem permissão para esta ação.");
  }
  return usuario;
}

/** True quando ainda não existe nenhuma locadora (primeira execução). */
export async function needsSetup(): Promise<boolean> {
  const count = await prisma.locadora.count();
  return count === 0;
}
