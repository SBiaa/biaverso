import { prisma } from "@/lib/prisma";

export async function ensureFixedBillLogsForMonth(month: number, year: number) {
  const activeBills = await prisma.fixedBill.findMany({
    where: { active: true },
    select: { id: true },
  });

  const existingLogs = await prisma.fixedBillLog.findMany({
    where: { month, year, fixedBillId: { in: activeBills.map((b) => b.id) } },
    select: { fixedBillId: true },
  });
  const existingIds = new Set(existingLogs.map((l) => l.fixedBillId));

  const missing = activeBills.filter((b) => !existingIds.has(b.id));

  if (missing.length > 0) {
    await prisma.fixedBillLog.createMany({
      data: missing.map((b) => ({ fixedBillId: b.id, month, year })),
    });
  }
}
