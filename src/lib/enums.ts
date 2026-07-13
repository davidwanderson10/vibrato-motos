// Rótulos legíveis (pt-BR) e cores para os enums do Prisma.

type Tone = "neutral" | "success" | "danger" | "warning" | "info" | "brand";

export const veiculoStatusLabel: Record<string, string> = {
  disponivel: "Disponível",
  alugado: "Alugado",
  em_manutencao: "Em manutenção",
  retirada_agendada: "Retirada agendada",
  reservado: "Reservado",
  indisponivel: "Indisponível",
  bloqueado: "Bloqueado",
  apropriacao_indevida: "Apropriação indevida",
  aguardando_retirada_oficina: "Aguardando retirada (oficina)",
  aguardando_orcamento: "Aguardando orçamento",
  orcamento_aprovado: "Orçamento aprovado",
  reservado_venda: "Reservado p/ venda",
  apreendido: "Apreendido",
  furto_roubo: "Furto / roubo",
  estoque: "Estoque",
  perda_total: "Perda total",
};

export const veiculoStatusTone: Record<string, Tone> = {
  disponivel: "success",
  alugado: "info",
  em_manutencao: "warning",
  retirada_agendada: "info",
  reservado: "info",
  indisponivel: "neutral",
  bloqueado: "danger",
  apropriacao_indevida: "danger",
  aguardando_retirada_oficina: "warning",
  aguardando_orcamento: "warning",
  orcamento_aprovado: "info",
  reservado_venda: "info",
  apreendido: "danger",
  furto_roubo: "danger",
  estoque: "neutral",
  perda_total: "danger",
};

export const veiculoStatusValues = Object.keys(veiculoStatusLabel);

export const tipoVeiculoLabel: Record<string, string> = {
  moto: "Moto",
  carro: "Carro",
};

export const frequenciaLabel: Record<string, string> = {
  diario: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

export const locacaoStatusLabel: Record<string, string> = {
  ativa: "Ativa",
  encerrada: "Encerrada",
  agendada: "Agendada",
};

export const locacaoStatusTone: Record<string, Tone> = {
  ativa: "success",
  encerrada: "neutral",
  agendada: "info",
};

export const clienteStatusLabel: Record<string, string> = {
  ativo: "Ativo",
  ex_cliente: "Ex-cliente",
};

export const manutencaoStatusLabel: Record<string, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
};

export const manutencaoStatusTone: Record<string, Tone> = {
  agendada: "info",
  em_andamento: "warning",
  finalizada: "success",
};

export const formaPagamentoLabel: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  ted: "TED",
  especie: "Espécie",
};

export const statusTransacaoLabel: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  cancelado: "Cancelado",
};

export const statusTransacaoTone: Record<string, Tone> = {
  pendente: "warning",
  pago: "success",
  cancelado: "neutral",
};

// Categorias de transação agrupadas por tipo (para os selects de Finanças).
export const categoriaEntradaLabel: Record<string, string> = {
  aluguel: "Aluguel",
  caucao: "Caução",
  juros: "Juros",
  multa_atraso: "Multa por atraso",
  venda_moto: "Venda de moto",
  venda_carro: "Venda de carro",
  pagamento_inicial_locacao_venda: "Pagamento inicial (locação + venda)",
  venda_peca: "Venda de peça",
  multa_transito: "Multa de trânsito",
  manutencao: "Manutenção",
  outras_entradas: "Outras entradas",
};

export const categoriaSaidaLabel: Record<string, string> = {
  compra_pecas: "Compra de peças",
  devolucao_caucao: "Devolução de caução",
  seguro: "Seguro",
  rastreador: "Rastreador",
  impostos: "Impostos",
  manutencao: "Manutenção",
  aluguel_espaco: "Aluguel do espaço",
  telefone: "Telefone",
  internet: "Internet",
  energia: "Energia",
  folha_equipe: "Folha de equipe",
  encargos: "Encargos",
  compra_moto: "Compra de moto",
  compra_carro: "Compra de carro",
  multa_transito: "Multa de trânsito",
  ipva: "IPVA",
  licenciamento: "Licenciamento",
  marketing: "Marketing",
  royalties: "Royalties",
  guincho: "Guincho",
  taxa_espaco: "Taxa de espaço",
  lavagem_veiculo: "Lavagem de veículo",
  taxa_administrativa_financeira: "Taxa administrativa financeira",
  fundo_marketing: "Fundo de marketing",
  sistema: "Sistema",
  contabilidade: "Contabilidade",
  outras_saidas: "Outras saídas",
};

export const categoriaLabel: Record<string, string> = {
  ...categoriaEntradaLabel,
  ...categoriaSaidaLabel,
};
