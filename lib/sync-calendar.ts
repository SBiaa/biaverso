import type { calendar_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { Event } from "@/app/generated/prisma/client";
import {
  APP_TIME_ZONE,
  addOneHour,
  buildGoogleDateTime,
  calendarClient,
  getAuthClient,
  googleInstantToApp,
  normalizeTime,
} from "@/lib/google-calendar";
import { addUtcDays, parseDateOnly, toDateInputValue, todayUtc } from "@/lib/utils";

/** Janela sincronizada: 1 mês para trás, 6 meses para frente. */
const MONTHS_BACK = 1;
const MONTHS_AHEAD = 6;

/**
 * Escrever no evento durante a própria sync mexe no `updatedAt`, que ficaria
 * milissegundos à frente do `lastSyncedAt` gravado no mesmo passo. Sem uma folga,
 * todo evento pareceria "editado no app" e o app nunca mais aceitaria mudanças do
 * Google. Uma edição de verdade é feita por uma pessoa, sempre muito além disso.
 */
const LOCAL_EDIT_TOLERANCE_MS = 5_000;

export type SyncResult = {
  fromGoogle: number;
  toGoogle: number;
  errors: string[];
};

/** O app venceu o conflito? true quando houve edição local depois da última sync. */
function wasEditedLocally(event: Pick<Event, "updatedAt" | "lastSyncedAt">) {
  if (!event.lastSyncedAt) return true;
  return (
    event.updatedAt.getTime() >
    event.lastSyncedAt.getTime() + LOCAL_EDIT_TOLERANCE_MS
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function monthsFromToday(months: number) {
  const today = todayUtc();
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + months, today.getUTCDate()),
  );
}

/**
 * Um evento do app vira payload do Google. Eventos sem hora entram como dia
 * inteiro — o Google recusa `dateTime` incompleto.
 */
function toGooglePayload(event: Event): calendar_v3.Schema$Event {
  const startTime = normalizeTime(event.time);

  if (event.allDay || !startTime) {
    return {
      summary: event.title,
      description: event.description ?? undefined,
      // No Google a data final de um evento de dia inteiro é exclusiva.
      start: { date: toDateInputValue(event.date) },
      end: { date: toDateInputValue(addUtcDays(event.date, 1)) },
    };
  }

  const endTime = normalizeTime(event.endTime) ?? addOneHour(startTime);
  // Hora final menor que a inicial só faz sentido virando o dia.
  const endDate = endTime <= startTime ? addUtcDays(event.date, 1) : event.date;

  return {
    summary: event.title,
    description: event.description ?? undefined,
    start: {
      dateTime: buildGoogleDateTime(event.date, startTime),
      timeZone: APP_TIME_ZONE,
    },
    end: {
      dateTime: buildGoogleDateTime(endDate, endTime),
      timeZone: APP_TIME_ZONE,
    },
  };
}

/** Campos de um evento do Google no formato do app. Null quando a data não dá para ler. */
function fromGooglePayload(gEvent: calendar_v3.Schema$Event) {
  const startDateTime = gEvent.start?.dateTime;
  const startDate = gEvent.start?.date;

  if (startDateTime) {
    const start = googleInstantToApp(startDateTime);
    const endDateTime = gEvent.end?.dateTime;
    return {
      title: gEvent.summary ?? "Sem título",
      description: gEvent.description ?? null,
      date: start.date,
      time: start.time,
      endTime: endDateTime ? googleInstantToApp(endDateTime).time : null,
      allDay: false,
    };
  }

  if (startDate) {
    const date = parseDateOnly(startDate);
    if (!date) return null;
    return {
      title: gEvent.summary ?? "Sem título",
      description: gEvent.description ?? null,
      date,
      time: null,
      endTime: null,
      allDay: true,
    };
  }

  return null;
}

/**
 * A home lista os eventos através do `Day`, então todo evento precisa estar
 * ligado ao dia dele. O Map evita um upsert por evento na mesma data.
 */
function dayLinker() {
  const cache = new Map<string, string>();

  return async function dayIdFor(date: Date) {
    const key = toDateInputValue(date);
    const cached = cache.get(key);
    if (cached) return cached;

    const day = await prisma.day.upsert({
      where: { date },
      update: {},
      create: { date },
      select: { id: true },
    });
    cache.set(key, day.id);
    return day.id;
  };
}

async function pullFromGoogle(
  calendar: calendar_v3.Calendar,
  calendars: calendar_v3.Schema$CalendarListEntry[],
  dayIdFor: (date: Date) => Promise<string>,
  errors: string[],
) {
  let count = 0;

  const timeMin = monthsFromToday(-MONTHS_BACK).toISOString();
  const timeMax = monthsFromToday(MONTHS_AHEAD).toISOString();

  for (const cal of calendars) {
    if (!cal.id) continue;

    try {
      let pageToken: string | undefined;

      do {
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 2500,
          pageToken,
        });

        for (const gEvent of response.data.items ?? []) {
          if (!gEvent.id || gEvent.status === "cancelled") continue;

          try {
            const fields = fromGooglePayload(gEvent);
            if (!fields) continue;

            const existing = await prisma.event.findUnique({
              where: { googleEventId: gEvent.id },
            });

            if (!existing) {
              await prisma.event.create({
                data: {
                  ...fields,
                  googleEventId: gEvent.id,
                  googleCalendarId: cal.id,
                  dayId: await dayIdFor(fields.date),
                  lastSyncedAt: new Date(),
                  syncStatus: "SINCRONIZADO",
                },
              });
              count++;
              continue;
            }

            // Conflito: o app prevalece. A edição local vai para o Google na fase 2.
            if (wasEditedLocally(existing)) continue;

            await prisma.event.update({
              where: { id: existing.id },
              data: {
                ...fields,
                googleCalendarId: cal.id,
                dayId: await dayIdFor(fields.date),
                lastSyncedAt: new Date(),
                syncStatus: "SINCRONIZADO",
              },
            });
            count++;
          } catch (error) {
            errors.push(`Evento "${gEvent.summary ?? gEvent.id}": ${errorMessage(error)}`);
          }
        }

        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (error) {
      errors.push(`Calendário "${cal.summary ?? cal.id}": ${errorMessage(error)}`);
    }
  }

  return count;
}

async function pushToGoogle(
  calendar: calendar_v3.Calendar,
  calendars: calendar_v3.Schema$CalendarListEntry[],
  errors: string[],
) {
  let count = 0;

  const primaryCalendar = calendars.find((c) => c.primary)?.id ?? "primary";

  // Nunca enviado ao Google, ou editado no app desde a última sync.
  //
  // ERRO entra junto porque a tentativa anterior falhou sem entregar a edição:
  // o pull também pula esse evento (a edição local é mais nova que a última
  // sync, e nesse caso o app prevalece), então sem tentar de novo aqui ele
  // ficaria travado no "!" para sempre e a alteração nunca chegaria lá.
  const localEvents = await prisma.event.findMany({
    where: {
      OR: [{ googleEventId: null }, { syncStatus: { in: ["PENDENTE", "ERRO"] } }],
    },
  });

  for (const event of localEvents) {
    try {
      const payload = toGooglePayload(event);

      if (event.googleEventId) {
        await calendar.events.update({
          calendarId: event.googleCalendarId ?? primaryCalendar,
          eventId: event.googleEventId,
          requestBody: payload,
        });

        await prisma.event.update({
          where: { id: event.id },
          data: { lastSyncedAt: new Date(), syncStatus: "SINCRONIZADO" },
        });
      } else {
        const created = await calendar.events.insert({
          calendarId: primaryCalendar,
          requestBody: payload,
        });

        await prisma.event.update({
          where: { id: event.id },
          data: {
            googleEventId: created.data.id,
            googleCalendarId: primaryCalendar,
            lastSyncedAt: new Date(),
            syncStatus: "SINCRONIZADO",
          },
        });
      }

      count++;
    } catch (error) {
      errors.push(`Evento "${event.title}": ${errorMessage(error)}`);
      // Um evento com problema não pode parar os outros.
      await prisma.event
        .update({ where: { id: event.id }, data: { syncStatus: "ERRO" } })
        .catch(() => {});
    }
  }

  return count;
}

/**
 * Sincronização bidirecional. Puxa de todos os calendários da conta e depois
 * envia o que está pendente no app. Em conflito o app prevalece.
 */
export async function syncCalendar(): Promise<SyncResult> {
  const auth = await getAuthClient();
  const calendar = calendarClient(auth);

  const errors: string[] = [];
  const dayIdFor = dayLinker();

  // Uma leitura só da lista de calendários serve para as duas direções.
  const calendarList = await calendar.calendarList.list({ maxResults: 250 });
  const calendars = calendarList.data.items ?? [];

  const fromGoogle = await pullFromGoogle(calendar, calendars, dayIdFor, errors);
  const toGoogle = await pushToGoogle(calendar, calendars, errors);

  await prisma.syncLog.create({
    data: {
      direction: "BIDIRECIONAL",
      eventsFrom: fromGoogle,
      eventsTo: toGoogle,
      errors: errors.length > 0 ? errors.join("\n") : null,
    },
  });

  return { fromGoogle, toGoogle, errors };
}

/**
 * O polling de 5 minutos e o botão manual podem cair juntos. Uma sync por vez
 * evita que as duas criem o mesmo evento em duplicidade.
 */
let running: Promise<SyncResult> | null = null;

export function syncCalendarOnce(): Promise<SyncResult> {
  running ??= syncCalendar().finally(() => {
    running = null;
  });
  return running;
}
