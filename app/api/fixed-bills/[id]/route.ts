import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { fixedBillSchema } from "@/lib/schemas";
import { resyncFixedBillDueDates } from "@/lib/finance";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, fixedBillSchema);

  const bill = await prisma.fixedBill.update({ where: { id }, data });
  await resyncFixedBillDueDates(id, bill.dueDay);

  return NextResponse.json(bill);
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // Os logs mensais somem junto (onDelete: Cascade).
  await prisma.fixedBill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
