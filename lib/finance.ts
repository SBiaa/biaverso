import { prisma } from "@/lib/prisma";
import { todayUtc, unpaidStatus, utcDate } from "@/lib/finance-calc";

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
