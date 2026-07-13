-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('admin', 'socio', 'diretor', 'gerente', 'operador');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('moto', 'carro');

-- CreateEnum
CREATE TYPE "VeiculoStatus" AS ENUM ('disponivel', 'alugado', 'em_manutencao', 'retirada_agendada', 'reservado', 'indisponivel', 'bloqueado', 'apropriacao_indevida', 'aguardando_retirada_oficina', 'aguardando_orcamento', 'orcamento_aprovado', 'reservado_venda', 'apreendido', 'furto_roubo', 'estoque', 'perda_total');

-- CreateEnum
CREATE TYPE "ClienteStatus" AS ENUM ('ativo', 'ex_cliente');

-- CreateEnum
CREATE TYPE "FrequenciaPagamento" AS ENUM ('diario', 'semanal', 'quinzenal', 'mensal');

-- CreateEnum
CREATE TYPE "LocacaoStatus" AS ENUM ('ativa', 'encerrada', 'agendada');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "StatusTransacao" AS ENUM ('pendente', 'pago', 'cancelado');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('pix', 'boleto', 'cartao_credito', 'cartao_debito', 'ted', 'especie');

-- CreateEnum
CREATE TYPE "CategoriaTransacao" AS ENUM ('aluguel', 'caucao', 'juros', 'multa_atraso', 'venda_moto', 'venda_carro', 'pagamento_inicial_locacao_venda', 'venda_peca', 'multa_transito', 'manutencao', 'outras_entradas', 'compra_pecas', 'devolucao_caucao', 'seguro', 'rastreador', 'impostos', 'aluguel_espaco', 'telefone', 'internet', 'energia', 'folha_equipe', 'encargos', 'compra_moto', 'compra_carro', 'ipva', 'licenciamento', 'marketing', 'royalties', 'guincho', 'taxa_espaco', 'lavagem_veiculo', 'taxa_administrativa_financeira', 'fundo_marketing', 'sistema', 'contabilidade', 'outras_saidas');

-- CreateTable
CREATE TABLE "locadora" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT,
    "endereco" TEXT,
    "logo_url" TEXT,
    "plano" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locadora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "telefone" TEXT,
    "cargo" "Cargo" NOT NULL DEFAULT 'operador',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conta_bancaria" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT,
    "conta" TEXT,
    "tipo" TEXT,

    CONSTRAINT "conta_bancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculo" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL,
    "placa" TEXT NOT NULL,
    "renavam" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "ano" INTEGER,
    "cor" TEXT,
    "valor_compra" DECIMAL(12,2),
    "valor_fipe" DECIMAL(12,2),
    "km_atual" INTEGER,
    "status" "VeiculoStatus" NOT NULL DEFAULT 'disponivel',
    "data_aquisicao" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "cnh_numero" TEXT,
    "cnh_validade" TIMESTAMP(3),
    "data_nascimento" TIMESTAMP(3),
    "status" "ClienteStatus" NOT NULL DEFAULT 'ativo',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locacao" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "veiculo_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "atendente_id" TEXT,
    "valor_caucao" DECIMAL(12,2),
    "valor_aluguel" DECIMAL(12,2) NOT NULL,
    "multa_atraso" DECIMAL(12,2),
    "juros_mes" DECIMAL(6,3),
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_proximo_pagamento" TIMESTAMP(3),
    "tempo_minimo_dias" INTEGER,
    "frequencia_pagamento" "FrequenciaPagamento" NOT NULL DEFAULT 'mensal',
    "local_retirada" TEXT,
    "local_devolucao" TEXT,
    "km_entrega" INTEGER,
    "nivel_combustivel" TEXT,
    "franquia_km_diaria" INTEGER,
    "raio_circulacao" TEXT,
    "seguro_terceiros" BOOLEAN NOT NULL DEFAULT false,
    "promessa_compra" BOOLEAN NOT NULL DEFAULT false,
    "caucao_pendente" BOOLEAN NOT NULL DEFAULT false,
    "caucao_parcelada" BOOLEAN NOT NULL DEFAULT false,
    "status" "LocacaoStatus" NOT NULL DEFAULT 'ativa',
    "data_encerramento" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacao" (
    "id" TEXT NOT NULL,
    "locadora_id" TEXT NOT NULL,
    "locacao_id" TEXT,
    "veiculo_id" TEXT,
    "conta_bancaria_id" TEXT,
    "tipo" "TipoTransacao" NOT NULL,
    "categoria" "CategoriaTransacao" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data_vencimento" TIMESTAMP(3),
    "data_pagamento" TIMESTAMP(3),
    "status" "StatusTransacao" NOT NULL DEFAULT 'pendente',
    "forma_pagamento" "FormaPagamento",
    "comprovante_url" TEXT,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_locadora_id_idx" ON "usuario"("locadora_id");

-- CreateIndex
CREATE INDEX "conta_bancaria_locadora_id_idx" ON "conta_bancaria"("locadora_id");

-- CreateIndex
CREATE INDEX "veiculo_locadora_id_idx" ON "veiculo"("locadora_id");

-- CreateIndex
CREATE INDEX "veiculo_status_idx" ON "veiculo"("status");

-- CreateIndex
CREATE UNIQUE INDEX "veiculo_locadora_id_placa_key" ON "veiculo"("locadora_id", "placa");

-- CreateIndex
CREATE INDEX "cliente_locadora_id_idx" ON "cliente"("locadora_id");

-- CreateIndex
CREATE INDEX "cliente_cpf_idx" ON "cliente"("cpf");

-- CreateIndex
CREATE INDEX "locacao_locadora_id_idx" ON "locacao"("locadora_id");

-- CreateIndex
CREATE INDEX "locacao_status_idx" ON "locacao"("status");

-- CreateIndex
CREATE INDEX "locacao_veiculo_id_idx" ON "locacao"("veiculo_id");

-- CreateIndex
CREATE INDEX "locacao_cliente_id_idx" ON "locacao"("cliente_id");

-- CreateIndex
CREATE INDEX "transacao_locadora_id_idx" ON "transacao"("locadora_id");

-- CreateIndex
CREATE INDEX "transacao_tipo_idx" ON "transacao"("tipo");

-- CreateIndex
CREATE INDEX "transacao_status_idx" ON "transacao"("status");

-- CreateIndex
CREATE INDEX "transacao_categoria_idx" ON "transacao"("categoria");

-- CreateIndex
CREATE INDEX "transacao_locacao_id_idx" ON "transacao"("locacao_id");

-- CreateIndex
CREATE INDEX "transacao_data_vencimento_idx" ON "transacao"("data_vencimento");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta_bancaria" ADD CONSTRAINT "conta_bancaria_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locacao" ADD CONSTRAINT "locacao_atendente_id_fkey" FOREIGN KEY ("atendente_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao" ADD CONSTRAINT "transacao_locadora_id_fkey" FOREIGN KEY ("locadora_id") REFERENCES "locadora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao" ADD CONSTRAINT "transacao_locacao_id_fkey" FOREIGN KEY ("locacao_id") REFERENCES "locacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao" ADD CONSTRAINT "transacao_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacao" ADD CONSTRAINT "transacao_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "conta_bancaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
