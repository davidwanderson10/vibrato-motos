-- AlterTable
ALTER TABLE "cliente" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "ref1_nome" TEXT,
ADD COLUMN     "ref1_telefone" TEXT,
ADD COLUMN     "ref2_nome" TEXT,
ADD COLUMN     "ref2_telefone" TEXT;

-- CreateTable
CREATE TABLE "documento_cliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documento_cliente_cliente_id_idx" ON "documento_cliente"("cliente_id");

-- AddForeignKey
ALTER TABLE "documento_cliente" ADD CONSTRAINT "documento_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
