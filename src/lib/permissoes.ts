// Controle de acesso por tela e escopo de dados.
// Regra geral: staff (admin e demais cargos) vê tudo; "investidor" é restrito.

export type Screen =
  | "dashboard"
  | "locacoes"
  | "frota"
  | "checklist"
  | "financas"
  | "manutencoes"
  | "clientes"
  | "usuarios"
  | "configuracoes";

/** Telas que podem ser liberadas para um investidor. */
export const INVESTIDOR_TELAS: Screen[] = [
  "dashboard",
  "frota",
  "locacoes",
  "financas",
];

interface UsuarioLike {
  id: string;
  cargo: string;
  permissoes: string[];
}

export function isInvestidor(u: UsuarioLike): boolean {
  return u.cargo === "investidor";
}

export function isAdmin(u: UsuarioLike): boolean {
  return u.cargo === "admin";
}

/** Pode acessar determinada tela? */
export function canAccess(u: UsuarioLike, screen: Screen): boolean {
  if (screen === "configuracoes") return true; // todos veem o próprio perfil
  if (screen === "usuarios") return u.cargo === "admin"; // só admin gerencia
  if (!isInvestidor(u)) return true; // staff vê tudo
  return INVESTIDOR_TELAS.includes(screen) && u.permissoes.includes(screen);
}

/** Primeira rota que o usuário pode acessar (para redirecionar acessos negados). */
export function firstAllowedHref(u: UsuarioLike): string {
  if (!isInvestidor(u)) return "/dashboard";
  const first = INVESTIDOR_TELAS.find((s) => u.permissoes.includes(s));
  return first ? `/${first}` : "/configuracoes";
}

/** Filtro Prisma para veículos visíveis ao usuário. */
export function veiculoWhere(u: UsuarioLike): Record<string, unknown> {
  return isInvestidor(u) ? { investidorId: u.id } : {};
}

/** Filtro Prisma para entidades que têm relação com veículo (locação, transação). */
export function porVeiculoWhere(u: UsuarioLike): Record<string, unknown> {
  return isInvestidor(u) ? { veiculo: { investidorId: u.id } } : {};
}
