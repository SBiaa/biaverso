import { prisma } from "@/lib/prisma";
import { getOrCreateDay } from "@/lib/day";
import { BUSINESS_COLORS } from "@/lib/business-visuals";
import { addUtcDays, toDateInputValue } from "@/lib/utils";
import type { ActivityCategory, TimeBlock, TimeEntry } from "@/app/generated/prisma/client";
import type {
  ActivityCategoryDTO,
  TimeBlockDTO,
  TimeEntryDTO,
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
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt ? entry.endedAt.toISOString() : null,
    categoryId: entry.categoryId,
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

export type WeekDayBlocks = {
  dayId: string;
  date: string;
  blocks: TimeBlockDTO[];
};

/** Os blocos planejados dos 7 dias a partir de `weekStart` — para a grade da semana. */
export async function getWeekPlannedBlocks(weekStart: Date): Promise<WeekDayBlocks[]> {
  const days = await Promise.all(
    Array.from({ length: 7 }, (_, i) => getOrCreateDay(addUtcDays(weekStart, i))),
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
