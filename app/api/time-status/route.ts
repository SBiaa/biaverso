import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { getOrCreateToday } from "@/lib/day";
import {
  getAllCategories,
  getPomodoroSettings,
  getProjectOptions,
  serializeTimeEntry,
} from "@/lib/time-tracking";
import { WORKDAY_END, WORKDAY_START, type TimeStatusDTO } from "@/lib/time-tracking-shared";
import { combineDateAndTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Alimenta a barra de tempo do topo, que aparece em todas as telas: por isso é
// uma rota que o cliente consulta, e não dado que cada página precisaria buscar.
export const GET = route(async () => {
  const day = await getOrCreateToday();
  const [categories, entries, running, settings, projects] = await Promise.all([
    getAllCategories(),
    prisma.timeEntry.findMany({ where: { dayId: day.id }, orderBy: { startedAt: "asc" } }),
    prisma.timeEntry.findFirst({ where: { endedAt: null } }),
    getPomodoroSettings(),
    getProjectOptions(),
  ]);

  const taskIds = [...new Set([...entries, ...(running ? [running] : [])].flatMap((e) => (e.taskId ? [e.taskId] : [])))];
  const tasks = taskIds.length
    ? await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } })
    : [];

  const status: TimeStatusDTO = {
    categories: categories.filter((c) => c.active),
    entries: entries.map(serializeTimeEntry),
    running: running ? serializeTimeEntry(running) : null,
    settings,
    projects,
    taskTitles: Object.fromEntries(tasks.map((t) => [t.id, t.title])),
    pomodorosToday: entries.filter((e) => e.pomodoro && e.endedAt).length,
    windowStart: combineDateAndTime(day.date, WORKDAY_START).toISOString(),
    windowEnd: combineDateAndTime(day.date, WORKDAY_END).toISOString(),
  };

  return NextResponse.json(status);
});
