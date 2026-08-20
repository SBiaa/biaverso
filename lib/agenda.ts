import { prisma } from "@/lib/prisma";
import { addUtcDays, toDateInputValue, todayUtc } from "@/lib/utils";
import { calendarClient, getAuthClient } from "@/lib/google-calendar";
import type { Event } from "@/app/generated/prisma/client";
import type { AgendaEvent, GoogleSyncStatus } from "@/lib/agenda-shared";

// Consultas da agenda — código de servidor. Tipos e helpers puros ficam em
// "@/lib/agenda-shared", que os componentes de cliente podem importar.

/** Quanto do passado a agenda ainda mostra. */
const DAYS_BACK = 7;

export function serializeEvent(event: Event): AgendaEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: toDateInputValue(event.date),
    time: event.time,
    endTime: event.endTime,
    allDay: event.allDay,
    category: event.category,
    syncStatus: event.syncStatus,
    googleEventId: event.googleEventId,
  };
}

export async function getAgendaEvents(): Promise<AgendaEvent[]> {
  const events = await prisma.event.findMany({
    where: { date: { gte: addUtcDays(todayUtc(), -DAYS_BACK) } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return events.map(serializeEvent);
}

/**
 * Apaga um evento no app e também no Google.
 *
 * Sem apagar lá, a próxima sincronização traz o evento de volta. Mora aqui, e
 * não na rota, porque o encontro do coven também precisa disto quando é
 * excluído: ele tem um evento espelho na agenda.
 *
 * Devolve se o Google foi mesmo limpo — desconectado, evento já removido lá ou
 * calendário somente leitura fazem o app seguir em frente do mesmo jeito.
 */
export async function deleteEventEverywhere(id: string): Promise<{ googleDeleted: boolean }> {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return { googleDeleted: true };

  let googleDeleted = true;

  if (event.googleEventId) {
    try {
      const calendar = calendarClient(await getAuthClient());
      await calendar.events.delete({
        calendarId: event.googleCalendarId ?? "primary",
        eventId: event.googleEventId,
      });
    } catch {
      googleDeleted = false;
    }
  }

  await prisma.event.delete({ where: { id } });

  return { googleDeleted };
}

/** Estado da conexão com o Google — alimenta a tela de configurações e a rota de status. */
export async function getGoogleSyncStatus(): Promise<GoogleSyncStatus> {
  const [auth, lastSync, pendingCount] = await Promise.all([
    prisma.googleAuth.findFirst({ select: { email: true } }),
    prisma.syncLog.findFirst({ orderBy: { syncedAt: "desc" } }),
    prisma.event.count({ where: { syncStatus: "PENDENTE" } }),
  ]);

  return {
    connected: auth !== null,
    email: auth?.email ?? null,
    pendingCount,
    lastSync: lastSync
      ? {
          syncedAt: lastSync.syncedAt.toISOString(),
          eventsFrom: lastSync.eventsFrom,
          eventsTo: lastSync.eventsTo,
          errors: lastSync.errors,
        }
      : null,
  };
}
