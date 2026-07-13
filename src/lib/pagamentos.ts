import { addDays, addMonths } from "date-fns";

export type Frequencia = "diario" | "semanal" | "quinzenal" | "mensal";

/** Avança uma data conforme a frequência de pagamento. */
export function proximaData(d: Date, freq: Frequencia): Date {
  switch (freq) {
    case "diario":
      return addDays(d, 1);
    case "semanal":
      return addDays(d, 7);
    case "quinzenal":
      return addDays(d, 15);
    case "mensal":
      return addMonths(d, 1);
  }
}

/** Quantos pagamentos, em média, cabem em um mês (para projeção mensal). */
export function pagamentosPorMes(freq: Frequencia): number {
  switch (freq) {
    case "diario":
      return 30;
    case "semanal":
      return 30 / 7;
    case "quinzenal":
      return 2;
    case "mensal":
      return 1;
  }
}

/**
 * Gera as datas de vencimento esperadas de uma locação dentro de [inicio, fim].
 * `primeiraData` é a data do primeiro pagamento esperado.
 */
export function datasVencimento(
  primeiraData: Date,
  freq: Frequencia,
  inicio: Date,
  fim: Date,
  cap = 1000,
): Date[] {
  const out: Date[] = [];
  let d = new Date(primeiraData);
  // avança até entrar na janela
  let guard = 0;
  while (d < inicio && guard < cap) {
    d = proximaData(d, freq);
    guard++;
  }
  while (d <= fim && out.length < cap) {
    out.push(new Date(d));
    d = proximaData(d, freq);
  }
  return out;
}

/** Chave dd/mm/aaaa para comparar/deduplicar datas ignorando hora. */
export function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
