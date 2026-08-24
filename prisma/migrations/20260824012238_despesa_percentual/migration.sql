-- CreateEnum
CREATE TYPE "TipoValorDespesa" AS ENUM ('fixo', 'percentual');

-- AlterTable
ALTER TABLE "despesa_recorrente" ADD COLUMN     "percentual" DECIMAL(6,3),
ADD COLUMN     "tipo_valor" "TipoValorDespesa" NOT NULL DEFAULT 'fixo',
ALTER COLUMN "valor" SET DEFAULT 0;
