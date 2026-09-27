import { prisma } from "@/lib/prisma";
import { addUtcDays, todayUtc } from "@/lib/utils";

/**
 * Radar de abandono: o que foi começado e parou.
 *
 * O resto do app só sabe registrar presença — marcar, logar, concluir. Aqui é o
 * contrário: procura o silêncio. Uma tarefa que você criou e nunca fez, uma
 * rotina que escorregou a semana inteira, um projeto ativo sem nenhum sinal de
 * vida.
 *
 * Duas regras que valem para tudo aqui:
 *
 * 1. Agregar o que se repete. Rotina e hábito viram uma linha cada, com a conta
 *    dos últimos dias — listar cada instância encheria a tela de centenas de
 *    cópias diárias e ninguém leria.
 *
 * 2. Dia sem registro não é falha. Os logs do dia só nascem quando você abre o
 *    /dia (ver materializeRoutineTasks em lib/day). Uma semana sem abrir o app
 *    não é uma semana de fracasso, e contar assim faria o radar mentir logo na
 *    semana em que ele mais precisa ser confiável.
 */

/** Janela padrão de "parou": o que a Bia pediu para projetos, usado em tudo. */
export const STALE_DAYS = 7;

/**
 * Quantos dias registrados uma rotina/hábito precisa ter na janela para o radar
 * ter direito de opinar.
 *
 * Sem isso a tela virava uma parede: "0 de 1 dia" aparecia com o mesmo peso de
 * "0 de 7", e como as rotinas de faxina só se materializam em dia de faxina,
 * qualquer item não marcado num único dia já era acusado de abandono. Um dia
 * não é padrão — é um dia.
 */
const MIN_TRACKED_DAYS = 3;

/**
 * E precisa ter escorregado em pelo menos metade desses dias. Falhar uma vez em
 * cinco é vida normal, não é uma coisa "parada" — e se tudo aparece, nada
 * aparece.
 */
const MAX_DONE_RATIO = 0.5;

/** A rotina/hábito escorregou o suficiente para merecer uma linha no radar? */
function slipped({ done, tracked }: { done: number; tracked: number }) {
  return tracked >= MIN_TRACKED_DAYS && done / tracked <= MAX_DONE_RATIO;
}

function daysSince(date: Date) {
  return Math.floor((todayUtc().getTime() - date.getTime()) / 86_400_000);
}

// ------------------------------------------------------------------ hábitos

export type HabitSignal = {
  id: string;
  name: string;
  /** Dias marcados dentro da janela. */
  done: number;
  /** Dias em que o dia existiu (você abriu o app) — o denominador honesto. */
  tracked: number;
  /** Dias da janela sem registro nenhum. Não conta como falha. */
  untracked: number;
  /** Há quantos dias foi a última vez que marcou. null = nunca dentro da janela. */
  daysSinceLast: number | null;
};

async function getHabitSignals(windowDays: number): Promise<HabitSignal[]> {
  const since = addUtcDays(todayUtc(), -(windowDays - 1));

  const [habits, logs] = await Promise.all([
    prisma.habit.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.habitLog.findMany({
      where: { day: { date: { gte: since } } },
      select: { habitId: true, done: true, day: { select: { date: true } } },
    }),
  ]);

  return habits
    .map((habit) => {
      const own = logs.filter((l) => l.habitId === habit.id);
      const doneLogs = own.filter((l) => l.done);
      const last = doneLogs
        .map((l) => l.day.date.getTime())
        .sort((a, b) => b - a)[0];

      return {
        id: habit.id,
        name: habit.name,
        done: doneLogs.length,
        tracked: own.length,
        untracked: windowDays - own.length,
        daysSinceLast: last === undefined ? null : daysSince(new Date(last)),
      };
    })
    .filter(slipped)
    .sort((a, b) => a.done / a.tracked - b.done / b.tracked);
}

// ------------------------------------------------------------------ rotinas

export type RoutineSignal = {
  /** Id do template, que é o que identifica a rotina através dos dias. */
  id: string;
  title: string;
  type: string;
  done: number;
  tracked: number;
  untracked: number;
};

async function getRoutineSignals(windowDays: number): Promise<RoutineSignal[]> {
  const since = addUtcDays(todayUtc(), -(windowDays - 1));

  const [templates, copies] = await Promise.all([
    prisma.task.findMany({
      where: { dayId: null, type: { in: ["ROTINA_NORMAL", "ROTINA_FAXINA"] } },
      select: { id: true, title: true, type: true },
      orderBy: { order: "asc" },
    }),
    prisma.task.findMany({
      where: {
        templateId: { not: null },
        day: { date: { gte: since } },
      },
      select: { templateId: true, done: true },
    }),
  ]);

  return templates
    .map((template) => {
      const own = copies.filter((c) => c.templateId === template.id);
      return {
        id: template.id,
        title: template.title,
        type: template.type,
        done: own.filter((c) => c.done).length,
        tracked: own.length,
        untracked: windowDays - own.length,
      };
    })
    .filter(slipped)
    .sort((a, b) => a.done / a.tracked - b.done / b.tracked);
}

// ------------------------------------------------------------------ tarefas

export type TaskSignal = {
  id: string;
  title: string;
  origin: string;
  /** Prazo que já passou, quando existe. */
  dueDate: string | null;
  daysOverdue: number | null;
  daysSinceCreated: number;
  business: { name: string; color: string } | null;
};

/**
 * Tarefas avulsas em aberto que já deviam ter acontecido: prazo vencido, ou
 * criada há tempo demais e nunca tocada. Estas vão uma a uma — é exatamente o
 * "coloquei para fazer e não fiz".
 */
async function getTaskSignals(staleDays: number): Promise<TaskSignal[]> {
  const today = todayUtc();
  const cutoff = addUtcDays(today, -staleDays);

  const tasks = await prisma.task.findMany({
    where: {
      done: false,
      type: "AVULSA",
      // Templates de rotina moram com dayId nulo; não são tarefas de verdade.
      OR: [{ dueDate: { lt: today } }, { createdAt: { lt: cutoff } }],
    },
    select: {
      id: true,
      title: true,
      origin: true,
      dueDate: true,
      createdAt: true,
      business: { select: { name: true, color: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    origin: t.origin,
    dueDate: t.dueDate?.toISOString() ?? null,
    daysOverdue: t.dueDate ? daysSince(t.dueDate) : null,
    daysSinceCreated: daysSince(t.createdAt),
    business: t.business,
  }));
}

// ----------------------------------------------------------------- projetos

export type ProjectSignal = {
  id: string;
  name: string;
  businessId: string;
  businessName: string;
  businessColor: string;
  daysSinceAction: number;
  /** O que contou como último sinal, para a tela poder explicar o número. */
  lastActionLabel: string;
  openTasks: number;
};

/**
 * Projetos ativos sem nenhuma ação na janela.
 *
 * O `updatedAt` do projeto sozinho não serve: ele só muda quando o projeto em
 * si é editado. Concluir uma tarefa dele, mexer num post ou anexar documento
 * não encosta nesse campo — um projeto tocado ontem apareceria como parado há
 * meses. Por isso o sinal é o mais recente entre todas as frentes.
 */
async function getProjectSignals(staleDays: number): Promise<ProjectSignal[]> {
  const projects = await prisma.project.findMany({
    where: { status: "EM_ANDAMENTO" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      business: { select: { id: true, name: true, color: true } },
      tasks: {
        select: { done: true, createdAt: true, completedAt: true },
      },
      productionTasks: {
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      contentPosts: {
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      // ProjectDocument não tem `updatedAt` — só a criação conta como sinal.
      documents: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return projects
    .map((project) => {
      // Cada frente entra com a data e com o rótulo que explica o número na
      // tela — "parado há 12 dias" sem dizer desde o quê não ajuda ninguém.
      const candidates: { at: Date; label: string }[] = [
        { at: project.updatedAt, label: "edição do projeto" },
      ];

      const lastTaskAction = project.tasks
        .map((t) => t.completedAt ?? t.createdAt)
        .sort((a, b) => b.getTime() - a.getTime())[0];
      if (lastTaskAction) candidates.push({ at: lastTaskAction, label: "tarefa" });

      if (project.productionTasks[0]) {
        candidates.push({ at: project.productionTasks[0].updatedAt, label: "produção" });
      }
      if (project.contentPosts[0]) {
        candidates.push({ at: project.contentPosts[0].updatedAt, label: "conteúdo" });
      }
      if (project.documents[0]) {
        candidates.push({ at: project.documents[0].createdAt, label: "documento" });
      }

      const last = candidates.sort((a, b) => b.at.getTime() - a.at.getTime())[0];

      return {
        id: project.id,
        name: project.name,
        businessId: project.business.id,
        businessName: project.business.name,
        businessColor: project.business.color,
        lastActionLabel: last.label,
        daysSinceAction: daysSince(last.at),
        openTasks: project.tasks.filter((t) => !t.done).length,
      };
    })
    .filter((p) => p.daysSinceAction >= staleDays)
    .sort((a, b) => b.daysSinceAction - a.daysSinceAction);
}

// ------------------------------------------------------------------- tudo

export type RadarData = {
  windowDays: number;
  habits: HabitSignal[];
  routines: RoutineSignal[];
  tasks: TaskSignal[];
  projects: ProjectSignal[];
  total: number;
};

export async function getRadar(windowDays = STALE_DAYS): Promise<RadarData> {
  const [habits, routines, tasks, projects] = await Promise.all([
    getHabitSignals(windowDays),
    getRoutineSignals(windowDays),
    getTaskSignals(windowDays),
    getProjectSignals(windowDays),
  ]);

  return {
    windowDays,
    habits,
    routines,
    tasks,
    projects,
    total: habits.length + routines.length + tasks.length + projects.length,
  };
}

/** Só a contagem, para o aviso da Home não pagar o preço da tela inteira. */
export async function getRadarCount(windowDays = STALE_DAYS) {
  return (await getRadar(windowDays)).total;
}
