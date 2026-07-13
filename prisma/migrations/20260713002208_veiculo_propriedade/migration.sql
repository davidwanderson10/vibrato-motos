-- AlterTable
ALTER TABLE "veiculo" ADD COLUMN     "propria" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "proprietario" TEXT,
ADD COLUMN     "vendedor" TEXT;
