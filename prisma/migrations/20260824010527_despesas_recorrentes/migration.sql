-- AlterTable
ALTER TABLE "transacao" ADD COLUMN     "despesa_recorrente_id" TEXT;

-- CreateTable
CREATE TABLE "despesa_recorrente" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "veiculo_id" TEXT,
    "conta_bancaria_id" TEXT,
    "categoria" "CategoriaTransacao" NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "frequencia" "FrequenciaPagamento" NOT NULL DEFAULT 'mensal',
    "primeira_data" TIMESTAMP(3) NOT NULL,
    "forma_pagamento" "FormaPagamento",
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesa_recorrente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "despesa_recorrente_locadora_id_idx" ON "despesa_recorrente"("locadora_id");

-- CreateIndex
CREATE INDEX "despesa_recorrente_veiculo_id_idx" ON "despesa_recorrente"("veiculo_id");

-- CreateIndex
CREATE INDEX "transacao_despesa_recorrente_id_idx" ON "transacao"("despesa_recorrente_id");

-- AddForeignKey
ALTER TABLE "transacao" ADD CONSTRAINT "transacao_despesa_recorrente_id_fkey" FOREIGN KEY ("despesa_recorrente_id") REFERENCES "despesa_recorrente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesa_recorrente" ADD CONSTRAINT "despesa_recorrente_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesa_recorrente" ADD CONSTRAINT "despesa_recorrente_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesa_recorrente" ADD CONSTRAINT "despesa_recorrente_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
