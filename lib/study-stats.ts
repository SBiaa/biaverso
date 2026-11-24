import { prisma } from "@/lib/prisma";
import { addUtcDays, todayUtc } from "@/lib/utils";

const DAYS = 14;

export type CourseProgress = {
  id: string;
  title: string;
  areaName: string;
  areaEmoji: string | null;
  status: string;
  done: number;
  total: number;
};

export type TodayLesson = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  scheduledDate: string;
  late: boolean;
};

export type StudyStats = {
  lessonsDone: number;
  lessonsTotal: number;
  coursesStudying: number;
  coursesDone: number;
  coursesTotal: number;
  streak: number;
  /** Aulas concluídas por dia, do mais antigo ao de hoje. */
  activity: { date: string; label: string; count: number }[];
  courses: CourseProgress[];
  today: TodayLesson[];
};

// completedAt é um instante, não uma data-calendário: o "dia" dele é o de Brasília.
const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);

export async function getStudyStats(): Promise<StudyStats> {
  const today = todayUtc();
  const since = addUtcDays(today, -(DAYS + 30));

  const [courses, recent, due] = await Promise.all([
    prisma.studyCourse.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        subject: { select: { area: { select: { name: true, emoji: true } } } },
        lessons: { select: { done: true } },
      },
    }),
    prisma.studyLesson.findMany({
      where: { done: true, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.studyLesson.findMany({
      where: {
        done: false,
        scheduledDate: { lte: today },
        course: { status: { notIn: ["PAUSADO", "ABANDONADO"] } },
      },
      orderBy: [{ scheduledDate: "asc" }, { order: "asc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        course: { select: { id: true, title: true } },
      },
    }),
  ]);

  const perDay = new Map<string, number>();
  for (const l of recent) {
    if (!l.completedAt) continue;
    const k = dayKey(l.completedAt);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }

  const todayKey = dayKey(new Date());
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);
  const activity = Array.from({ length: DAYS }, (_, i) => {
    const key = addUtcDays(todayDate, i - (DAYS - 1)).toISOString().slice(0, 10);
    return { date: key, label: key.slice(8, 10), count: perDay.get(key) ?? 0 };
  });

  // Sequência: dias seguidos com aula feita. Hoje ainda sem aula não zera
  // (o dia não acabou): a conta começa em ontem.
  let streak = 0;
  let cursor = perDay.get(todayKey) ? todayDate : addUtcDays(todayDate, -1);
  while (perDay.get(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = addUtcDays(cursor, -1);
  }

  const progress: CourseProgress[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    areaName: c.subject.area.name,
    areaEmoji: c.subject.area.emoji,
    status: c.status,
    done: c.lessons.filter((l) => l.done).length,
    total: c.lessons.length,
  }));

  return {
    lessonsDone: progress.reduce((n, c) => n + c.done, 0),
    lessonsTotal: progress.reduce((n, c) => n + c.total, 0),
    coursesStudying: progress.filter((c) => c.status === "ESTUDANDO").length,
    coursesDone: progress.filter((c) => c.status === "ESTUDADO").length,
    coursesTotal: progress.length,
    streak,
    activity,
    courses: progress
      .filter((c) => c.total > 0)
      .sort((a, b) => rank(a) - rank(b) || b.done / b.total - a.done / a.total),
    today: due.map((l) => ({
      id: l.id,
      title: l.title,
      courseId: l.course.id,
      courseTitle: l.course.title,
      scheduledDate: l.scheduledDate!.toISOString(),
      late: l.scheduledDate!.getTime() < today.getTime(),
    })),
  };
}

// Em andamento primeiro, depois os que ainda não começaram; concluídos por último.
function rank(c: CourseProgress) {
  if (c.status === "ESTUDANDO" || (c.done > 0 && c.done < c.total)) return 0;
  if (c.done === c.total) return 2;
  return 1;
}
