import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { computeNextDueAt } from "@/lib/beleza";
import { careAppointmentPatchSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const data = await parseBody(request, careAppointmentPatchSchema);

  const current = await prisma.careAppointment.findUniqueOrThrow({
    where: { id },
    select: { intervalDays: true, lastDoneAt: true },
  });

  // Mudar o intervalo ou a última vez tem que reagendar junto — senão o
  // `nextDueAt` gravado continuaria valendo pelo intervalo antigo.
  const intervalDays = data.intervalDays ?? current.intervalDays;
  const lastDoneAt = data.lastDoneAt === undefined ? current.lastDoneAt : data.lastDoneAt;
  const reschedules = data.intervalDays !== undefined || data.lastDoneAt !== undefined;

  return NextResponse.json(
    await prisma.careAppointment.update({
      where: { id },
      data: {
        ...data,
        ...(reschedules
          ? { nextDueAt: lastDoneAt ? computeNextDueAt(lastDoneAt, intervalDays) : null }
          : {}),
      },
    }),
  );
});

export const DELETE = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  // O histórico do cuidado some junto (Cascade). As transações já lançadas no
  // financeiro ficam — elas são gasto registrado, não parte do cuidado.
  await prisma.careAppointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
