import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton para evitar múltiplas conexões durante o hot-reload do Next.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  // Em serverless (Vercel) cada instância abre seu próprio pool. Mantemos poucas
  // conexões por instância e liberamos as ociosas rápido para não estourar o
  // limite do pooler do Supabase. Use SEMPRE o Transaction pooler (porta 6543).
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 1),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
