-- CreateTable
CREATE TABLE "documento" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "locacao_id" TEXT,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documento_locadora_id_idx" ON "documento"("locadora_id");

-- CreateIndex
CREATE INDEX "documento_veiculo_id_idx" ON "documento"("veiculo_id");

-- CreateIndex
CREATE INDEX "documento_locacao_id_idx" ON "documento"("locacao_id");

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_locacao_id_fkey" FOREIGN KEY ("locacao_id") REFERENCES "locacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
