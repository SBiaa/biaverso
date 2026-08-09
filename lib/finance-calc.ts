// Contas de data e dinheiro do financeiro, sem banco — usadas no servidor e no cliente.

/**
 * Data em UTC (meia-noite), como as datas vindas de <input type="date">.
 * O dia é limitado ao último dia do mês: dia 31 em fevereiro vira 28/29.
 */
export function utcDate(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay)));
}

export function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function daysUntil(date: Date) {
  return Math.round((date.getTime() - todayUtc().getTime()) / 86_400_000);
}

export function addInvoiceMonths(month: number, year: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { month: (total % 12) + 1, year: Math.floor(total / 12) };
}

/** Compara mês/ano de fatura: negativo se A vem antes de B. */
export function compareInvoiceMonths(
  a: { month: number; year: number },
  b: { month: number; year: number },
) {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/**
 * Divide o total em parcelas de centavos exatos. A sobra do arredondamento vai
 * para a primeira parcela, como os cartões costumam fazer.
 */
export function splitInstallments(total: number, installments: number) {
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / installments);
  const amounts = Array.from({ length: installments }, () => baseCents / 100);
  amounts[0] = (baseCents + (totalCents - baseCents * installments)) / 100;
  return amounts;
}

/** Vencimento da fatura de um mês. */
export function invoiceDueDate(month: number, year: number, dueDay: number) {
  return utcDate(year, month, dueDay);
}

/**
 * Fatura em que uma compra cai: depois do fechamento, ela vai para a próxima.
 * Sem dia de fechamento cadastrado, assume o mês da própria compra.
 */
export function invoiceForPurchase(
  purchaseDate: Date,
  closingDay: number | null | undefined,
) {
  const month = purchaseDate.getUTCMonth() + 1;
  const year = purchaseDate.getUTCFullYear();
  if (!closingDay || purchaseDate.getUTCDate() <= closingDay) {
    return { month, year };
  }
  return addInvoiceMonths(month, year, 1);
}

/** Status de uma conta não paga, considerando a data de vencimento. */
export function unpaidStatus(dueDate: Date) {
  return dueDate < todayUtc() ? "ATRASADO" : "PENDENTE";
}
