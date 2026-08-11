import { NextResponse } from "next/server";
import { parseBody, route } from "@/lib/api";
import { createBeautyTransaction, markAppointmentDone } from "@/lib/beleza";
import { careAppointmentLogSchema } from "@/lib/schemas";
import { todayUtc } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

/** Marca o cuidado como feito: grava o histórico e reagenda a próxima data. */
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const { date, cost, notes, createTransaction } = await parseBody(
    request,
    careAppointmentLogSchema,
  );
  const doneAt = date ?? todayUtc();

  const { log, appointment } = await markAppointmentDone(id, { date: doneAt, cost, notes });

  // Lançamento no financeiro só quando a tela pediu e houve custo.
  const transaction =
    createTransaction && cost
      ? await createBeautyTransaction({
          name: appointment.name,
          amount: cost,
          date: doneAt,
          notes,
        })
      : null;

  return NextResponse.json({ log, appointment, transaction });
});
