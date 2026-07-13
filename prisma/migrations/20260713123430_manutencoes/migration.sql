-- CreateEnum
CREATE TYPE "ManutencaoStatus" AS ENUM ('agendada', 'em_andamento', 'finalizada');

-- CreateTable
CREATE TABLE "manutencao" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "veiculo_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "km_veiculo" INTEGER,
    "oficina" TEXT,
    "descricao" TEXT,
    "pecas_servicos" TEXT,
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ManutencaoStatus" NOT NULL DEFAULT 'finalizada',
    "transacao_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manutencao_transacao_id_key" ON "manutencao"("transacao_id");

-- CreateIndex
CREATE INDEX "manutencao_locadora_id_idx" ON "manutencao"("locadora_id");

-- CreateIndex
CREATE INDEX "manutencao_veiculo_id_idx" ON "manutencao"("veiculo_id");

-- CreateIndex
CREATE INDEX "manutencao_data_idx" ON "manutencao"("data");

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_transacao_id_fkey" FOREIGN KEY ("transacao_id") REFERENCES "transacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
