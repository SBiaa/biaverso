import { prisma } from "@/lib/prisma";
import type { TransactionCategory } from "@/app/generated/prisma/enums";
import {
  addInvoiceMonths,
  billAmountForMonth,
  compareInvoiceMonths,
  splitInstallments,
  unpaidStatus,
  utcDate,
} from "@/lib/finance-calc";
import { getMonthRange, todayUtc } from "@/lib/utils";

// Só existe um cartão — a configuração fica sempre nesta linha.
export const CREDIT_CARD_ID = "single";

// ---------------------------------------------------------------- contas fixas

export async function ensureFixedBillLogsForMonth(month: number, year: number) {
  const activeBills = await prisma.fixedBill.findMany({
    where: { active: true },
    select: { id: true, dueDay: true },
  });

  const existingLogs = await prisma.fixedBillLog.findMany({
    where: { month, year, fixedBillId: { in: activeBills.map((b) => b.id) } },
    select: { fixedBillId: true },
  });
  const existingIds = new Set(existingLogs.map((l) => l.fixedBillId));

  const missing = activeBills.filter((b) => !existingIds.has(b.id));

  if (missing.length > 0) {
    await prisma.fixedBillLog.createMany({
      data: missing.map((b) => ({
        fixedBillId: b.id,
        month,
        year,
        dueDate: utcDate(year, month, b.dueDay),
      })),
    });
  }

  await syncOverdueFixedBillLogs(month, year);
}

/** Marca como ATRASADO o que passou do vencimento e ainda não foi pago. */
export async function syncOverdueFixedBillLogs(month: number, year: number) {
  const today = todayUtc();

  await prisma.fixedBillLog.updateMany({
    where: { month, year, status: "PENDENTE", dueDate: { lt: today } },
    data: { status: "ATRASADO" },
  });
  await prisma.fixedBillLog.updateMany({
    where: { month, year, status: "ATRASADO", dueDate: { gte: today } },
    data: { status: "PENDENTE" },
  });
}

/**
 * Reaplica o dia de vencimento da conta nos logs do mês atual em diante.
 * Os meses passados ficam com a data que valia na época.
 */
export async function resyncFixedBillDueDates(
  fixedBillId: string,
  dueDay: number,
) {
  const today = todayUtc();
  const currentMonth = today.getUTCMonth() + 1;
  const currentYear = today.getUTCFullYear();

  const logs = await prisma.fixedBillLog.findMany({
    where: {
      fixedBillId,
      OR: [
        { year: { gt: currentYear } },
        { year: currentYear, month: { gte: currentMonth } },
      ],
    },
    select: { id: true, month: true, year: true, status: true },
  });

  await prisma.$transaction(
    logs.map((log) => {
      const dueDate = utcDate(log.year, log.month, dueDay);
      return prisma.fixedBillLog.update({
        where: { id: log.id },
        data: {
          dueDate,
          status: log.status === "PAGO" ? log.status : unpaidStatus(dueDate),
        },
      });
    }),
  );
}

// --------------------------------------------------------------------- cartão

export function getCreditCard() {
  return prisma.creditCard.findUnique({ where: { id: CREDIT_CARD_ID } });
}

/**
 * Cria a compra parcelada e uma parcela por fatura, a partir da fatura
 * escolhida. Cada parcela já nasce sabendo que é a "n de total", que é o que
 * permite a projeção somar os meses futuros sem interpretar o rótulo.
 */
export async function createInstallmentPurchase(data: {
  description: string;
  totalAmount: number;
  installments: number;
  firstInvoiceMonth: number;
  firstInvoiceYear: number;
  purchaseDate: Date;
  category: TransactionCategory;
  businessId?: string | null;
  notes?: string | null;
}) {
  const amounts = splitInstallments(data.totalAmount, data.installments);
  const shared = {
    description: data.description,
    purchaseDate: data.purchaseDate,
    category: data.category,
    businessId: data.businessId ?? null,
    notes: data.notes ?? null,
  };

  return prisma.$transaction(async (tx) => {
    // A compra vem primeiro porque o grupo das parcelas é o id dela — um
    // `create` aninhado não conseguiria enxergar esse id.
    const purchase = await tx.creditCardPurchase.create({
      data: {
        ...shared,
        totalAmount: data.totalAmount,
        installments: data.installments,
      },
    });

    await tx.creditCardEntry.createMany({
      data: amounts.map((amount, index) => {
        const invoice = addInvoiceMonths(
          data.firstInvoiceMonth,
          data.firstInvoiceYear,
          index,
        );
        return {
          ...shared,
          amount,
          invoiceMonth: invoice.month,
          invoiceYear: invoice.year,
          installment: `${index + 1}/${data.installments}`,
          installmentGroupId: purchase.id,
          installmentNumber: index + 1,
          installmentTotal: data.installments,
          purchaseId: purchase.id,
        };
      }),
    });

    return tx.creditCardPurchase.findUniqueOrThrow({
      where: { id: purchase.id },
      include: { entries: { orderBy: { installmentNumber: "asc" } } },
    });
  });
}

/**
 * Item da fatura já unificado: compra avulsa/parcela e assinatura no cartão
 * moram na mesma lista, e o `kind` diz de onde cada linha veio.
 */
export type InvoiceItem = {
  kind: "AVULSO" | "ASSINATURA";
  /** Id do CreditCardEntry ou do FixedBillLog, conforme o `kind`. */
  id: string;
  description: string;
  amount: number;
  /** Data que ordena a lista: compra do avulso, vencimento da assinatura. */
  date: string;
  category: string | null;
  installment: string | null;
  business: { id: string; name: string; color: string } | null;
  notes: string | null;
  /** Só em AVULSO: se veio de compra parcelada, o id da compra. */
  purchaseId: string | null;
  /** Daqui para baixo, só em ASSINATURA. */
  fixedBillId: string | null;
  fixedBillType: string | null;
  dueDay: number | null;
  defaultAmount: number | null;
  amountOverride: number | null;
  status: string | null;
};

export type Invoice = {
  month: number;
  year: number;
  items: InvoiceItem[];
  /** Só compras avulsas e parcelas. */
  entriesTotal: number;
  /** Só assinaturas cobradas no cartão. */
  subscriptionsTotal: number;
  total: number;
};

/**
 * Fatura do mês somando as duas origens: os lançamentos avulsos e as contas
 * fixas marcadas como pagas no cartão. Assinatura no cartão não tem (nem deve
 * ter) lançamento manual — ela entra por aqui.
 */
export async function getInvoice(month: number, year: number): Promise<Invoice> {
  // Abrir a fatura de um mês materializa os logs daquele mês, então uma conta
  // cadastrada depois passa a valer para os meses já visitados também.
  await ensureFixedBillLogsForMonth(month, year);

  const [entries, subscriptionLogs] = await Promise.all([
    prisma.creditCardEntry.findMany({
      where: { invoiceMonth: month, invoiceYear: year },
      include: { business: true },
    }),
    prisma.fixedBillLog.findMany({
      where: {
        month,
        year,
        fixedBill: { paymentMethod: "CARTAO_CREDITO", active: true },
      },
      include: { fixedBill: true },
    }),
  ]);

  const entryItems: InvoiceItem[] = entries.map((entry) => ({
    kind: "AVULSO",
    id: entry.id,
    description: entry.description,
    amount: entry.amount,
    date: entry.purchaseDate.toISOString(),
    category: entry.category,
    installment: entry.installment,
    business: entry.business
      ? {
          id: entry.business.id,
          name: entry.business.name,
          color: entry.business.color,
        }
      : null,
    notes: entry.notes,
    purchaseId: entry.purchaseId,
    fixedBillId: null,
    fixedBillType: null,
    dueDay: null,
    defaultAmount: null,
    amountOverride: null,
    status: null,
  }));

  const subscriptionItems: InvoiceItem[] = subscriptionLogs.map((log) => ({
    kind: "ASSINATURA",
    id: log.id,
    description: log.fixedBill.name,
    amount: billAmountForMonth(log.amountOverride, log.fixedBill.amount),
    date: log.dueDate.toISOString(),
    category: null,
    installment: null,
    business: null,
    notes: log.fixedBill.notes,
    purchaseId: null,
    fixedBillId: log.fixedBillId,
    fixedBillType: log.fixedBill.type,
    dueDay: log.fixedBill.dueDay,
    defaultAmount: log.fixedBill.amount,
    amountOverride: log.amountOverride,
    status: log.status,
  }));

  const items = [...entryItems, ...subscriptionItems].sort(
    (a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description),
  );

  const sum = (list: InvoiceItem[]) => list.reduce((acc, i) => acc + i.amount, 0);
  const entriesTotal = sum(entryItems);
  const subscriptionsTotal = sum(subscriptionItems);

  return {
    month,
    year,
    items,
    entriesTotal,
    subscriptionsTotal,
    total: entriesTotal + subscriptionsTotal,
  };
}

// --------------------------------------------------------------- planejamento

export type PlanTransaction = {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  business: { id: string; name: string; color: string } | null;
};

export type PlanFixedBill = {
  logId: string;
  fixedBillId: string;
  name: string;
  amount: number;
  defaultAmount: number;
  amountOverride: number | null;
  dueDay: number;
  dueDate: string;
  type: string;
  paymentMethod: string;
  status: string;
};

export type MonthPlan = {
  month: number;
  year: number;
  /** Mês ainda por vir: os números são previsão, não o que já aconteceu. */
  isFuture: boolean;
  isCurrent: boolean;
  incomes: PlanTransaction[];
  incomeTotal: number;
  expenses: PlanTransaction[];
  expenseTransactionsTotal: number;
  fixedBills: PlanFixedBill[];
  fixedBillsTotal: number;
  invoice: Invoice;
  expenseTotal: number;
  balance: number;
};

/**
 * Fecha o mês em previsão: o que já está lançado mais o que se repete todo mês.
 *
 * Duas coisas seriam contadas duas vezes se somadas cruas, e por isso ficam de
 * fora do total (mas continuam visíveis na tela):
 * - assinatura no cartão aparece na lista de contas fixas E na fatura — do
 *   cartão só entra o que é compra avulsa/parcela;
 * - transação de categoria "Cartão de crédito" é o pagamento da fatura, que já
 *   entra inteira pela projeção do cartão.
 */
export async function getMonthPlan(
  month: number,
  year: number,
): Promise<MonthPlan> {
  const { start, end } = getMonthRange(new Date(Date.UTC(year, month - 1, 1)));
  const today = todayUtc();
  const diff = compareInvoiceMonths(
    { month, year },
    { month: today.getUTCMonth() + 1, year: today.getUTCFullYear() },
  );

  const [invoice, transactions, logs] = await Promise.all([
    // Já garante os FixedBillLog do mês, inclusive de mês futuro.
    getInvoice(month, year),
    prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
      include: { business: true },
      orderBy: { date: "asc" },
    }),
    prisma.fixedBillLog.findMany({
      where: { month, year, fixedBill: { active: true } },
      include: { fixedBill: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const toPlanTransaction = (t: (typeof transactions)[number]): PlanTransaction => ({
    id: t.id,
    name: t.name,
    amount: t.amount,
    date: t.date.toISOString(),
    category: t.category,
    business: t.business
      ? { id: t.business.id, name: t.business.name, color: t.business.color }
      : null,
  });

  const incomes = transactions
    .filter((t) => t.type === "ENTRADA")
    .map(toPlanTransaction);
  const expenses = transactions
    .filter((t) => t.type === "SAIDA" && t.category !== "CARTAO_CREDITO")
    .map(toPlanTransaction);

  const fixedBills: PlanFixedBill[] = logs.map((log) => ({
    logId: log.id,
    fixedBillId: log.fixedBillId,
    name: log.fixedBill.name,
    amount: billAmountForMonth(log.amountOverride, log.fixedBill.amount),
    defaultAmount: log.fixedBill.amount,
    amountOverride: log.amountOverride,
    dueDay: log.fixedBill.dueDay,
    dueDate: log.dueDate.toISOString(),
    type: log.fixedBill.type,
    paymentMethod: log.fixedBill.paymentMethod,
    status: log.status,
  }));

  const total = (list: { amount: number }[]) =>
    list.reduce((acc, i) => acc + i.amount, 0);

  const incomeTotal = total(incomes);
  const expenseTransactionsTotal = total(expenses);
  const fixedBillsTotal = total(fixedBills);
  // Do cartão entra só `entriesTotal`: as assinaturas já vieram em fixedBills.
  const expenseTotal =
    fixedBillsTotal + expenseTransactionsTotal + invoice.entriesTotal;

  return {
    month,
    year,
    isFuture: diff > 0,
    isCurrent: diff === 0,
    incomes,
    incomeTotal,
    expenses,
    expenseTransactionsTotal,
    fixedBills,
    fixedBillsTotal,
    invoice,
    expenseTotal,
    balance: incomeTotal - expenseTotal,
  };
}
