import { prisma } from "@/lib/prisma";
import { addUtcDays, todayUtc } from "@/lib/utils";
import {
  careUrgency,
  computeNextDueAt,
  EXPIRY_ALERT_DAYS,
  expiryStatus,
  safeStepIndex,
  scheduleNextDate,
  sortRoutineTimes,
  type AppointmentView,
  type ProductOption,
  type ProductView,
  type RoutineView,
  type ScheduleView,
} from "@/lib/beleza-shared";
import type { Prisma } from "@/app/generated/prisma/client";

// Server-only: este arquivo importa "@/lib/prisma", então nunca pode ser
// importado de um componente "use client" — use "@/lib/beleza-shared".
export * from "@/lib/beleza-shared";

// ------------------------------------------------------------------ rotinas

const routineInclude = {
  steps: {
    orderBy: { order: "asc" },
    include: { product: { select: { name: true } } },
  },
} as const;

type RoutineWithSteps = {
  id: string;
  name: string;
  timeOfDay: string;
  active: boolean;
  order: number;
  checklist: boolean;
  steps: {
    id: string;
    title: string;
    notes: string | null;
    order: number;
    productId: string | null;
    product: { name: string } | null;
  }[];
};

function toRoutineView(
  routine: RoutineWithSteps,
  done: boolean,
  doneStepIds: ReadonlySet<string> = new Set(),
): RoutineView {
  return {
    id: routine.id,
    name: routine.name,
    timeOfDay: routine.timeOfDay,
    active: routine.active,
    order: routine.order,
    done,
    checklist: routine.checklist,
    steps: routine.steps.map((s) => ({
      id: s.id,
      title: s.title,
      notes: s.notes,
      order: s.order,
      productId: s.productId,
      productName: s.product?.name ?? null,
      done: doneStepIds.has(s.id),
    })),
  };
}

/** Rotinas ativas do dia, já sabendo quais foram cumpridas na data. */
export async function getRoutinesForDay(date: Date = todayUtc()): Promise<RoutineView[]> {
  const [routines, logs, stepLogs] = await Promise.all([
    prisma.careRoutine.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: routineInclude,
    }),
    prisma.careRoutineLog.findMany({ where: { date, done: true } }),
    prisma.careRoutineStepLog.findMany({
      where: { date, done: true },
      select: { stepId: true },
    }),
  ]);

  const doneIds = new Set(logs.map((l) => l.routineId));
  const doneStepIds = new Set(stepLogs.map((l) => l.stepId));
  return sortRoutineTimes(routines).map((r) =>
    toRoutineView(r, doneIds.has(r.id), doneStepIds),
  );
}

/** Todas as rotinas, ativas e inativas — a tela de gerenciamento. */
export async function getAllRoutines(): Promise<RoutineView[]> {
  const routines = await prisma.careRoutine.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: routineInclude,
  });
  return sortRoutineTimes(routines).map((r) => toRoutineView(r, false));
}

// --------------------------------------------------------------- cronogramas

/** Quantas etapas do histórico cada cronograma carrega para a tela. */
const SCHEDULE_HISTORY_LIMIT = 8;

export async function getSchedules(
  { onlyActive = false }: { onlyActive?: boolean } = {},
): Promise<ScheduleView[]> {
  const today = todayUtc();

  const schedules = await prisma.careSchedule.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: { product: { select: { name: true } } },
      },
      logs: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: SCHEDULE_HISTORY_LIMIT,
        include: { step: { select: { title: true } } },
      },
    },
  });

  return schedules.map((schedule) => {
    const steps = schedule.steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      order: s.order,
      intervalDays: s.intervalDays,
      productId: s.productId,
      productName: s.product?.name ?? null,
    }));

    const currentStepIndex = safeStepIndex(schedule.currentStep, steps.length);
    const lastLog = schedule.logs[0] ?? null;
    const nextDueAt =
      steps.length > 0
        ? scheduleNextDate(steps, lastLog && { date: lastLog.date, stepId: lastLog.stepId }, today)
        : null;
    const { urgency, days } = careUrgency(nextDueAt, today);

    return {
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      active: schedule.active,
      currentStep: schedule.currentStep,
      steps,
      currentStepIndex,
      nextDueAt: nextDueAt?.toISOString() ?? null,
      daysUntilNext: days,
      urgency,
      history: schedule.logs.map((l) => ({
        id: l.id,
        date: l.date.toISOString(),
        stepTitle: l.step.title,
        notes: l.notes,
      })),
    };
  });
}

// ------------------------------------------------------------------ cuidados

const APPOINTMENT_HISTORY_LIMIT = 10;

export async function getAppointments(
  { onlyActive = true }: { onlyActive?: boolean } = {},
): Promise<AppointmentView[]> {
  const today = todayUtc();

  const appointments = await prisma.careAppointment.findMany({
    where: onlyActive ? { active: true } : undefined,
    // Sem data marcada vai para o fim: `nulls: "last"` em vez do padrão do Postgres.
    orderBy: [{ nextDueAt: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    include: {
      logs: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: APPOINTMENT_HISTORY_LIMIT,
      },
    },
  });

  return appointments.map((a) => {
    const { urgency, days } = careUrgency(a.nextDueAt, today);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      intervalDays: a.intervalDays,
      lastDoneAt: a.lastDoneAt?.toISOString() ?? null,
      nextDueAt: a.nextDueAt?.toISOString() ?? null,
      notes: a.notes,
      active: a.active,
      urgency,
      daysUntilDue: days,
      history: a.logs.map((l) => ({
        id: l.id,
        date: l.date.toISOString(),
        cost: l.cost,
        notes: l.notes,
      })),
    };
  });
}

/**
 * Cuidados vencidos para a data — a parte de beleza que entra no /dia. Inclui
 * os atrasados: um cuidado esquecido não pode sumir da tela do dia só porque a
 * data já passou.
 */
export async function getAppointmentsDueBy(date: Date = todayUtc()) {
  const appointments = await prisma.careAppointment.findMany({
    where: { active: true, nextDueAt: { lte: date } },
    orderBy: [{ nextDueAt: "asc" }, { name: "asc" }],
  });

  return appointments.map((a) => {
    const { urgency, days } = careUrgency(a.nextDueAt, date);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      urgency,
      daysUntilDue: days,
    };
  });
}

/** Grava o cuidado feito e reagenda: lastDoneAt = data, nextDueAt = data + intervalo. */
export async function markAppointmentDone(
  appointmentId: string,
  { date, cost, notes }: { date: Date; cost?: number | null; notes?: string | null },
) {
  const appointment = await prisma.careAppointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: { intervalDays: true },
  });

  const [log, updated] = await prisma.$transaction([
    prisma.careAppointmentLog.create({
      data: { appointmentId, date, cost: cost ?? null, notes: notes ?? null },
    }),
    prisma.careAppointment.update({
      where: { id: appointmentId },
      data: { lastDoneAt: date, nextDueAt: computeNextDueAt(date, appointment.intervalDays) },
    }),
  ]);

  return { log, appointment: updated };
}

// ------------------------------------------------------------------ produtos

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  openedAt: Date | null;
  expiresAt: Date | null;
  pao: number | null;
  finished: boolean;
  finishedAt: Date | null;
  runningLow: boolean;
  cost: number | null;
  notes: string | null;
};

export function toProductView(product: ProductRow, today: Date = todayUtc()): ProductView {
  const { status, days } = expiryStatus(product.expiresAt, today);
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    openedAt: product.openedAt?.toISOString() ?? null,
    expiresAt: product.expiresAt?.toISOString() ?? null,
    pao: product.pao,
    finished: product.finished,
    finishedAt: product.finishedAt?.toISOString() ?? null,
    runningLow: product.runningLow,
    cost: product.cost,
    notes: product.notes,
    status,
    daysUntilExpiry: days,
  };
}

/** `status`: "ativos" (padrão), "acabados" ou "todos". */
export async function getProducts({
  category,
  status = "ativos",
}: { category?: string; status?: string } = {}): Promise<ProductView[]> {
  const today = todayUtc();

  const products = await prisma.beautyProduct.findMany({
    where: {
      ...(category ? { category: category as Prisma.BeautyProductWhereInput["category"] } : {}),
      ...(status === "todos" ? {} : { finished: status === "acabados" }),
    },
    // Validade mais perto primeiro; produto sem validade cai no fim.
    orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { name: "asc" }],
  });

  return products.map((p) => toProductView(p, today));
}

/**
 * Card "Produtos abrindo/vencendo" da home: validade em até 30 dias (ou já
 * vencida) mais os que foram marcados como quase acabando.
 */
export async function getProductAlerts(today: Date = todayUtc()): Promise<{
  expiring: ProductView[];
  runningLow: ProductView[];
}> {
  const limit = addUtcDays(today, EXPIRY_ALERT_DAYS);

  const [expiring, runningLow] = await Promise.all([
    prisma.beautyProduct.findMany({
      where: { finished: false, expiresAt: { not: null, lt: limit } },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.beautyProduct.findMany({
      where: { finished: false, runningLow: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    expiring: expiring.map((p) => toProductView(p, today)),
    runningLow: runningLow.map((p) => toProductView(p, today)),
  };
}

/** Produtos disponíveis para vincular a um passo — só os que não acabaram. */
export async function getProductOptions(): Promise<ProductOption[]> {
  return prisma.beautyProduct.findMany({
    where: { finished: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, brand: true },
  });
}

// ------------------------------------------------------------- financeiro

/**
 * Lançamento de saída para um gasto de beleza. Só é chamado quando a tela pede
 * — ver `createTransaction` nos schemas.
 */
export async function createBeautyTransaction({
  name,
  amount,
  date,
  notes,
}: {
  name: string;
  amount: number;
  date: Date;
  notes?: string | null;
}) {
  return prisma.transaction.create({
    data: {
      name,
      type: "SAIDA",
      amount,
      date,
      category: "BELEZA",
      notes: notes ?? null,
    },
  });
}
