-- AlterEnum
ALTER TYPE "Cargo" ADD VALUE 'investidor';

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "permissoes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "veiculo" ADD COLUMN     "investidor_id" TEXT,
ADD COLUMN     "observacoes" TEXT;

-- CreateTable
CREATE TABLE "documento_veiculo" (
    "id" TEXT NOT NULL,
    "veiculo_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documento_veiculo_veiculo_id_idx" ON "documento_veiculo"("veiculo_id");

-- CreateIndex
CREATE INDEX "veiculo_investidor_id_idx" ON "veiculo"("investidor_id");

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_investidor_id_fkey" FOREIGN KEY ("investidor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_veiculo" ADD CONSTRAINT "documento_veiculo_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
