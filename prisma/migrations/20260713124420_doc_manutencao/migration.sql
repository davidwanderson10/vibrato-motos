-- CreateTable
CREATE TABLE "documento_manutencao" (
    "id" TEXT NOT NULL,
    "manutencao_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documento_manutencao_manutencao_id_idx" ON "documento_manutencao"("manutencao_id");

-- AddForeignKey
ALTER TABLE "documento_manutencao" ADD CONSTRAINT "documento_manutencao_manutencao_id_fkey" FOREIGN KEY ("manutencao_id") REFERENCES "manutencao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
