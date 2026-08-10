// Tipos e helpers puros da agenda, compartilhados entre o servidor e os
// componentes "use client" — este arquivo nunca pode importar "@/lib/prisma"
// (levaria o driver do Postgres para o bundle do navegador).

/** Evento pronto para o cliente — `date` já como "YYYY-MM-DD". */
export type AgendaEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  endTime: string | null;
  allDay: boolean;
  category: string;
  syncStatus: string;
  googleEventId: string | null;
};

export type GoogleSyncStatus = {
  connected: boolean;
  email: string | null;
  pendingCount: number;
  lastSync: {
    syncedAt: string;
    eventsFrom: number;
    eventsTo: number;
    errors: string | null;
  } | null;
};

/** Agrupa por dia mantendo a ordem cronológica. */
export function groupEventsByDate(events: AgendaEvent[]) {
  const groups = new Map<string, AgendaEvent[]>();

  for (const event of events) {
    const list = groups.get(event.date);
    if (list) list.push(event);
    else groups.set(event.date, [event]);
  }

  return [...groups.entries()].map(([date, items]) => ({ date, items }));
}
