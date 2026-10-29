import { prisma } from "@/lib/prisma";
import { getOrCreateDay } from "@/lib/day";
import { BUSINESS_COLORS } from "@/lib/business-visuals";
import { addUtcDays, toDateInputValue } from "@/lib/utils";
import type { ActivityCategory, TimeBlock, TimeEntry } from "@/app/generated/prisma/client";
import {
  DEFAULT_POMODORO_SETTINGS,
  type ActivityCategoryDTO,
  type PomodoroSettingsDTO,
  type ProjectOptionDTO,
  type TimeBlockDTO,
  type TimeEntryDTO,
} from "@/lib/time-tracking-shared";

// Consultas do controle de horas — código de servidor. Tipos e helpers puros
// ficam em "@/lib/time-tracking-shared", que os componentes de cliente importam.

const DEFAULT_CATEGORIES = [
  { name: "Ace", color: BUSINESS_COLORS[0], order: 0 },
  { name: "Bruxaria", color: BUSINESS_COLORS[1], order: 1 },
  { name: "Saúde", color: BUSINESS_COLORS[2], order: 2 },
  { name: "Trabalho", color: BUSINESS_COLORS[3], order: 3 },
  { name: "Estudo", color: BUSINESS_COLORS[4], order: 4 },
  { name: "Pessoal", color: BUSINESS_COLORS[5], order: 5 },
  { name: "Descanso", color: BUSINESS_COLORS[6], order: 6 },
];

/** Cria o conjunto padrão de categorias uma única vez — depois quem manda é a usuária. */
export async function ensureDefaultCategories() {
  const count = await prisma.activityCategory.count();
  if (count === 0) {
    await prisma.activityCategory.createMany({ data: DEFAULT_CATEGORIES, skipDuplicates: true });
  }
}

export function serializeCategory(category: ActivityCategory): ActivityCategoryDTO {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    active: category.active,
  };
}

export function serializeTimeBlock(block: TimeBlock): TimeBlockDTO {
  return {
    id: block.id,
    title: block.title,
    startTime: block.startTime,
    endTime: block.endTime,
    categoryId: block.categoryId,
  };
}

export function serializeTimeEntry(entry: TimeEntry): TimeEntryDTO {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt ? entry.endedAt.toISOString() : null,
    categoryId: entry.categoryId,
    projectId: entry.projectId,
    taskId: entry.taskId,
    pomodoro: entry.pomodoro,
  };
}

/** Todas as categorias (ativas e inativas) — a tela de gestão mostra as duas. */
export async function getAllCategories() {
  await ensureDefaultCategories();
  const categories = await prisma.activityCategory.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return categories.map(serializeCategory);
}

export async function getDayTimeTracking(dayId: string) {
  const [blocks, entries] = await Promise.all([
    prisma.timeBlock.findMany({ where: { dayId }, orderBy: { startTime: "asc" } }),
    prisma.timeEntry.findMany({ where: { dayId }, orderBy: { startedAt: "asc" } }),
  ]);

  return {
    blocks: blocks.map(serializeTimeBlock),
    entries: entries.map(serializeTimeEntry),
  };
}

/** O registro em andamento (sem `endedAt`), se houver — só existe um por vez. */
export async function getRunningEntry(): Promise<TimeEntryDTO | null> {
  const entry = await prisma.timeEntry.findFirst({ where: { endedAt: null } });
  return entry ? serializeTimeEntry(entry) : null;
}

export type RangeDayBlocks = {
  dayId: string;
  date: string;
  blocks: TimeBlockDTO[];
};

/** Os blocos planejados de `numDays` dias a partir de `start` — para o calendário. */
export async function getPlannedBlocksForRange(
  start: Date,
  numDays: number,
): Promise<RangeDayBlocks[]> {
  const days = await Promise.all(
    Array.from({ length: numDays }, (_, i) => getOrCreateDay(addUtcDays(start, i))),
  );

  const blocks = await prisma.timeBlock.findMany({
    where: { dayId: { in: days.map((d) => d.id) } },
    orderBy: { startTime: "asc" },
  });

  return days.map((day) => ({
    dayId: day.id,
    date: toDateInputValue(day.date),
    blocks: blocks.filter((b) => b.dayId === day.id).map(serializeTimeBlock),
  }));
}

/** Configuração do pomodoro; sem linha ainda, valem os padrões (25/5/15). */
export async function getPomodoroSettings(): Promise<PomodoroSettingsDTO> {
  const row = await prisma.pomodoroSettings.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULT_POMODORO_SETTINGS;
  return {
    focusMinutes: row.focusMinutes,
    shortBreakMinutes: row.shortBreakMinutes,
    longBreakMinutes: row.longBreakMinutes,
    cyclesBeforeLongBreak: row.cyclesBeforeLongBreak,
    autoStartBreaks: row.autoStartBreaks,
    autoStartFocus: row.autoStartFocus,
    sound: row.sound,
  };
}

/** Projetos em andamento, com o negócio e o cliente — o "o que da Ace". */
export async function getProjectOptions(): Promise<ProjectOptionDTO[]> {
  const projects = await prisma.project.findMany({
    where: { status: "EM_ANDAMENTO", business: { active: true } },
    orderBy: [{ business: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      business: { select: { name: true, color: true } },
      client: { select: { name: true } },
    },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    businessName: p.business.name,
    businessColor: p.business.color,
    clientName: p.client?.name ?? null,
  }));
}

/**
 * Escolher uma tarefa já diz de que projeto é: devolve o projeto da tarefa
 * quando só ela veio, para o registro não ficar com tarefa solta.
 */
export async function resolveEntryLinks(projectId: string | null, taskId: string | null) {
  if (taskId && !projectId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    return { projectId: task?.projectId ?? null, taskId };
  }
  return { projectId, taskId };
}
