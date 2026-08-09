import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Droplets,
  ListChecks,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { Card, Badge, StatCard, type BadgeOrigin } from "@/components/ui";
import {
  cn,
  dayOfYear,
  formatCurrencyBRL,
  formatDateBR,
  startOfToday,
} from "@/lib/utils";

const motivationalPhrases = [
  "Um dia de cada vez.",
  "Progresso, não perfeição.",
  "Pequenos passos também levam longe.",
  "Hoje é um bom dia para cuidar de mim.",
  "Constância vence intensidade.",
];

const mealTypeLabels: Record<string, string> = {
  CAFE_DA_MANHA: "Café",
  ALMOCO: "Almoço",
  JANTAR: "Janta",
  LANCHE: "Lanche",
};

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const date = startOfToday();

  const day = await prisma.day.findUnique({
    where: { date },
    include: {
      events: { orderBy: { time: "asc" } },
      tasks: { orderBy: { order: "asc" } },
      habits: { include: { habit: true } },
      waterLogs: true,
      mealLogs: { include: { recipe: true } },
    },
  });

  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  const [entradas, saidas] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "ENTRADA", date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "SAIDA", date: { gte: monthStart, lt: monthEnd } },
    }),
  ]);

  const saldo = (entradas._sum.amount ?? 0) - (saidas._sum.amount ?? 0);

  return { day, saldo, date };
}

export default async function HomePage() {
  const { day, saldo, date } = await getDashboardData();

  const events = day?.events ?? [];
  const tasks = day?.tasks ?? [];
  const habits = day?.habits ?? [];
  const waterCount = day?.waterLogs.length ?? 0;
  const mealLogs = day?.mealLogs ?? [];

  const habitsDone = habits.filter((h) => h.done).length;
  const tasksByOrigin = tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
    (acc[task.origin] ??= []).push(task);
    return acc;
  }, {});

  const phrase =
    motivationalPhrases[dayOfYear(date) % motivationalPhrases.length];

  return (
    <>
      <Topbar title="Home" />

      {/* Desktop */}
      <main className="hidden flex-1 flex-col gap-4 p-6 md:flex">
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Eventos hoje"
            value={events.length}
            icon={<CalendarDays size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Hábitos"
            value={`${habitsDone}/${habits.length}`}
            icon={<ListChecks size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Água"
            value={`${waterCount}/8`}
            icon={<Droplets size={16} className="text-text-secondary" />}
          />
          <StatCard
            label="Saldo do mês"
            value={formatCurrencyBRL(saldo)}
            icon={<Wallet size={16} className="text-text-secondary" />}
            valueClassName={saldo >= 0 ? "text-emerald-600" : "text-red-600"}
          />
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Agenda de hoje
              </h2>
              {events.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhum evento para hoje.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-12 shrink-0 text-text-secondary">
                        {event.time ?? "—"}
                      </span>
                      <span className="text-text-primary">{event.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Tarefas de hoje
              </h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhuma tarefa para hoje.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {Object.entries(tasksByOrigin).map(([origin, items]) => (
                    <div key={origin} className="flex flex-col gap-1.5">
                      <Badge origin={origin as BadgeOrigin} />
                      {items.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 pl-1 text-sm"
                        >
                          {task.done ? (
                            <CheckCircle2 size={16} className="text-accent" />
                          ) : (
                            <Circle size={16} className="text-text-secondary" />
                          )}
                          <span
                            className={cn(
                              "text-text-primary",
                              task.done && "text-text-secondary line-through",
                            )}
                          >
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Hábitos do dia
              </h2>
              <ul className="mb-4 flex flex-col gap-2">
                {habits.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-sm">
                    {h.done ? (
                      <CheckCircle2 size={16} className="text-accent" />
                    ) : (
                      <Circle size={16} className="text-text-secondary" />
                    )}
                    <span
                      className={cn(
                        "text-text-primary",
                        h.done && "text-text-secondary line-through",
                      )}
                    >
                      {h.habit.name}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 8 }, (_, i) => (
                  <Droplets
                    key={i}
                    size={16}
                    className={i < waterCount ? "text-accent" : "text-border"}
                    fill={i < waterCount ? "currentColor" : "none"}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text-primary">
                Cardápio de hoje
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {["CAFE_DA_MANHA", "ALMOCO", "JANTAR"].map((type) => {
                  const log = mealLogs.find((m) => m.mealType === type);
                  return (
                    <div key={type} className="flex flex-col gap-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                        {mealTypeLabels[type]}
                      </span>
                      <span className="text-sm text-text-primary">
                        {log?.recipe?.title ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Mobile */}
      <main className="flex flex-1 flex-col gap-4 p-4 md:hidden">
        <p className="font-serif text-lg italic text-text-secondary">
          {phrase}
        </p>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-text-primary">
            Hoje, {formatDateBR(date)}
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum evento para hoje.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {events.map((event) => (
                <li key={event.id} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 text-text-secondary">
                    {event.time ?? "—"}
                  </span>
                  <span className="text-text-primary">{event.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Hábitos</h2>
            <span className="text-sm text-text-secondary">
              {habitsDone}/{habits.length}
            </span>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Nenhum hábito cadastrado.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {habits.map((h) => (
                <li key={h.id} className="flex items-center gap-2 text-sm">
                  {h.done ? (
                    <CheckCircle2 size={16} className="text-accent" />
                  ) : (
                    <Circle size={16} className="text-text-secondary" />
                  )}
                  <span
                    className={cn(
                      "text-text-primary",
                      h.done && "text-text-secondary line-through",
                    )}
                  >
                    {h.habit.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Água</h2>
            <span className="text-sm text-text-secondary">
              {waterCount}/8
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <Droplets
                key={i}
                size={16}
                className={i < waterCount ? "text-accent" : "text-border"}
                fill={i < waterCount ? "currentColor" : "none"}
              />
            ))}
          </div>
        </Card>

        <Link
          href="/dia"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-white"
        >
          Ver dia completo
        </Link>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Cardápio de hoje
          </h2>
          <div className="flex flex-col gap-2">
            {["CAFE_DA_MANHA", "ALMOCO", "JANTAR"].map((type) => {
              const log = mealLogs.find((m) => m.mealType === type);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-secondary">
                    {mealTypeLabels[type]}
                  </span>
                  <span className="text-text-primary">
                    {log?.recipe?.title ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </>
  );
}
