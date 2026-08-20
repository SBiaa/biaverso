import { prisma } from "@/lib/prisma";
import { addUtcDays, todayUtc, toDateInputValue } from "@/lib/utils";
import { deleteEventEverywhere } from "@/lib/agenda";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  covenMeetingKindLabels,
  moonPhaseOfDay,
  nextMoonEventOnOrAfter,
  nextSabbat,
  OPEN_STUDY_STATUS,
  type AltarItemView,
  type DivinationView,
  type MeetingOption,
  type MeetingView,
  type RitualView,
  type StudyView,
} from "@/lib/espiritual-shared";

// Server-only: importa "@/lib/prisma", então nunca pode entrar num componente
// "use client" — de lá se importa "@/lib/espiritual-shared".
export * from "@/lib/espiritual-shared";

/**
 * As datas saem daqui como "YYYY-MM-DD", e não como Date.
 *
 * As telas precisam delas em `<input type="date">` e em comparação de dia, e
 * um Date atravessando a fronteira do servidor para o cliente já apareceu um
 * dia atrás em outros módulos deste app. String de dia não tem fuso para errar.
 */
const day = (date: Date | null) => (date ? toDateInputValue(date) : null);

// -------------------------------------------------------------- encontros

// `satisfies` e não `as const`: com `as const` o `orderBy` vira uma tupla
// readonly, que o Prisma recusa por esperar um array comum.
const meetingInclude = {
  studies: {
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, status: true, dueDate: true },
  },
} satisfies Prisma.CovenMeetingInclude;

type MeetingRow = Prisma.CovenMeetingGetPayload<{ include: typeof meetingInclude }>;

function toMeetingView(meeting: MeetingRow): MeetingView {
  return {
    id: meeting.id,
    title: meeting.title,
    kind: meeting.kind,
    date: toDateInputValue(meeting.date),
    time: meeting.time,
    endTime: meeting.endTime,
    place: meeting.place,
    agenda: meeting.agenda,
    notes: meeting.notes,
    attended: meeting.attended,
    onAgenda: meeting.eventId !== null,
    studies: meeting.studies.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      dueDate: day(s.dueDate),
    })),
  };
}

/**
 * Os encontros que ainda vêm, do mais próximo ao mais distante.
 *
 * A janela inclui ontem porque um encontro da véspera ainda é o que ela vai
 * querer anotar — some da lista no dia seguinte, não na virada da meia-noite.
 */
export async function getUpcomingMeetings(today = todayUtc()): Promise<MeetingView[]> {
  const meetings = await prisma.covenMeeting.findMany({
    where: { date: { gte: addUtcDays(today, -1) } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: meetingInclude,
  });

  return meetings.map(toMeetingView);
}

/** O que já passou, do mais recente para trás. */
export async function getPastMeetings(
  today = todayUtc(),
  take = 30,
): Promise<MeetingView[]> {
  const meetings = await prisma.covenMeeting.findMany({
    where: { date: { lt: addUtcDays(today, -1) } },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take,
    include: meetingInclude,
  });

  return meetings.map(toMeetingView);
}

// ------------------------------------------- o encontro espelhado na Agenda
//
// O módulo espiritual não fala com o Google. Ele cria um Evento comum, e a
// sincronização que já existe leva o Evento ao Google Calendar — assim o
// encontro do coven aparece no /agenda, no /dia e no celular dela, sem uma
// segunda integração para manter.

type MeetingCore = {
  title: string;
  kind: string;
  date: Date;
  time: string | null;
  endTime: string | null;
  place: string | null;
  agenda: string | null;
};

function eventDataFor(meeting: MeetingCore) {
  // O tipo e o lugar entram na descrição porque o Evento não tem campo para
  // eles — e é essa descrição que ela vê na notificação do celular.
  const lines = [covenMeetingKindLabels[meeting.kind] ?? meeting.kind];
  if (meeting.place) lines.push(`Onde: ${meeting.place}`);
  if (meeting.agenda) lines.push("", meeting.agenda);

  return {
    title: meeting.title,
    description: lines.join("\n"),
    date: meeting.date,
    // Encontro sem hora marcada vira evento de dia inteiro — o Google recusa
    // o contrário.
    time: meeting.time,
    endTime: meeting.time ? meeting.endTime : null,
    allDay: meeting.time === null,
    category: "ESPIRITUAL",
    // PENDENTE para a próxima sincronização levar a novidade ao Google.
    syncStatus: "PENDENTE",
  } as const;
}

/**
 * Cria ou atualiza o evento espelho de um encontro.
 *
 * Chamado depois de gravar o encontro. Se o evento tiver sido apagado direto na
 * Agenda, o `eventId` já voltou a ser nulo (a FK é `SetNull`) e um novo é
 * criado — o encontro sempre acaba com um compromisso na agenda.
 */
export async function writeMeetingEvent(meetingId: string) {
  const meeting = await prisma.covenMeeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return;

  const data = eventDataFor(meeting);

  // A home lista eventos através do Day, então o evento já nasce ligado ao dia.
  const dayRow = await prisma.day.upsert({
    where: { date: meeting.date },
    update: {},
    create: { date: meeting.date },
    select: { id: true },
  });

  if (meeting.eventId) {
    await prisma.event.update({
      where: { id: meeting.eventId },
      data: { ...data, dayId: dayRow.id },
    });
    return;
  }

  const event = await prisma.event.create({ data: { ...data, dayId: dayRow.id } });
  await prisma.covenMeeting.update({
    where: { id: meetingId },
    data: { eventId: event.id },
  });
}

/** Tira o encontro da agenda — do app e do Google. */
export async function removeMeetingEvent(eventId: string | null) {
  if (eventId) await deleteEventEverywhere(eventId);
}

/** Para o seletor "veio deste encontro" da tela de estudos. */
export async function getMeetingOptions(): Promise<MeetingOption[]> {
  const meetings = await prisma.covenMeeting.findMany({
    orderBy: { date: "desc" },
    take: 60,
    select: { id: true, title: true, date: true, kind: true },
  });

  return meetings.map((m) => ({
    id: m.id,
    title: m.title,
    kind: m.kind,
    date: toDateInputValue(m.date),
  }));
}

// ------------------------------------------------------ textos e exercícios

/**
 * Os estudos, com o prazo mandando na ordem.
 *
 * Quem tem data vem primeiro, do mais apertado ao mais folgado; o que não tem
 * prazo desce para o fim. O Postgres joga nulo para o fim num `asc`, que é
 * exatamente o que se quer aqui.
 */
export async function getStudies({
  status,
}: { status?: string } = {}): Promise<StudyView[]> {
  const studies = await prisma.spiritualStudy.findMany({
    where: status
      ? { status: status as Prisma.SpiritualStudyWhereInput["status"] }
      : undefined,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { meeting: { select: { title: true } } },
  });

  return studies.map((s) => ({
    id: s.id,
    title: s.title,
    kind: s.kind,
    status: s.status,
    receivedAt: day(s.receivedAt),
    dueDate: day(s.dueDate),
    deliveredAt: day(s.deliveredAt),
    content: s.content,
    notes: s.notes,
    link: s.link,
    meetingId: s.meetingId,
    meetingTitle: s.meeting?.title ?? null,
  }));
}

// ------------------------------------------------------------ diário e tiragens

export async function getRituals(take = 60): Promise<RitualView[]> {
  const rituals = await prisma.ritualLog.findMany({
    orderBy: { date: "desc" },
    take,
  });

  return rituals.map((r) => ({
    id: r.id,
    title: r.title,
    date: toDateInputValue(r.date),
    kind: r.kind,
    intention: r.intention,
    elements: r.elements,
    notes: r.notes,
    outcome: r.outcome,
  }));
}

export async function getDivinations(take = 60): Promise<DivinationView[]> {
  const readings = await prisma.divination.findMany({
    orderBy: { date: "desc" },
    take,
  });

  return readings.map((d) => ({
    id: d.id,
    date: toDateInputValue(d.date),
    method: d.method,
    deck: d.deck,
    question: d.question,
    spread: d.spread,
    cards: d.cards,
    reading: d.reading,
    outcome: d.outcome,
  }));
}

// ------------------------------------------------------------------- altar

export async function getAltarItems(): Promise<AltarItemView[]> {
  const items = await prisma.altarItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    quantity: i.quantity,
    runningLow: i.runningLow,
    properties: i.properties,
    notes: i.notes,
  }));
}

// ------------------------------------------------------------------- hoje

/**
 * O painel de abertura: o céu de hoje e o que o banco tem de mais urgente.
 *
 * O céu (sabbath, lua) é conta pura e sai de lib/astros.ts; o resto é consulta.
 * Vêm juntos porque a pergunta que a tela responde é uma só — "o que a vida de
 * bruxa está pedindo hoje?".
 */
export async function getEspiritualOverview(today = todayUtc()) {
  const [meetings, openStudies, lastRitual, lastDivination, runningLow] =
    await Promise.all([
      getUpcomingMeetings(today),
      getStudies(),
      prisma.ritualLog.findFirst({ orderBy: { date: "desc" } }),
      prisma.divination.findFirst({ orderBy: { date: "desc" } }),
      prisma.altarItem.count({ where: { runningLow: true } }),
    ]);

  const open = openStudies.filter((s) =>
    (OPEN_STUDY_STATUS as readonly string[]).includes(s.status),
  );

  return {
    sabbat: nextSabbat(today),
    moon: moonPhaseOfDay(today),
    nextNewMoon: nextMoonEventOnOrAfter("NOVA", today),
    nextFullMoon: nextMoonEventOnOrAfter("CHEIA", today),
    meetings: meetings.slice(0, 4),
    openStudies: open,
    lastRitual: lastRitual
      ? {
          id: lastRitual.id,
          title: lastRitual.title,
          date: toDateInputValue(lastRitual.date),
          kind: lastRitual.kind,
        }
      : null,
    lastDivination: lastDivination
      ? {
          id: lastDivination.id,
          date: toDateInputValue(lastDivination.date),
          method: lastDivination.method,
          question: lastDivination.question,
        }
      : null,
    runningLow,
  };
}
