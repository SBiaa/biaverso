import { NextResponse } from "next/server";
import { parseBody, route } from "@/lib/api";
import { upsertCycleLog } from "@/lib/ciclo";
import { cycleLogUpsertSchema } from "@/lib/schemas";

/**
 * Grava o registro de um dia — cria, atualiza ou apaga, dependendo do que
 * sobra depois de juntar com o resto do formulário (ver upsertCycleLog). Não
 * há um POST/PATCH separado por id: a `date` identifica o dia, e o cliente não
 * precisa saber se já existia um registro para chamar isto.
 */
export const POST = route(async (request: Request) => {
  const { date, ...data } = await parseBody(request, cycleLogUpsertSchema);
  const saved = await upsertCycleLog({ date, ...data });
  return NextResponse.json(saved);
});
