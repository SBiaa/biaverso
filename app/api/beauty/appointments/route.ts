import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { computeNextDueAt, getAppointments } from "@/lib/beleza";
import { careAppointmentCreateSchema } from "@/lib/schemas";

export const GET = route(async () => {
  return NextResponse.json(await getAppointments({ onlyActive: false }));
});

export const POST = route(async (request: Request) => {
  const { lastDoneAt, ...data } = await parseBody(request, careAppointmentCreateSchema);

  // Cuidado cadastrado já com a última vez preenchida entra com a próxima data
  // calculada; sem ela, fica sem vencimento até ser marcado como feito.
  const appointment = await prisma.careAppointment.create({
    data: {
      ...data,
      lastDoneAt: lastDoneAt ?? null,
      nextDueAt: lastDoneAt ? computeNextDueAt(lastDoneAt, data.intervalDays) : null,
    },
  });

  return NextResponse.json(appointment);
});
