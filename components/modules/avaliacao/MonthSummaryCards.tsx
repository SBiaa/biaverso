import { Card } from "@/components/ui";
import { dayTypeLabels } from "@/lib/labels";
import type { getMonthSummary } from "@/lib/avaliacao";
import { HabitProgressList } from "./HabitProgressList";
import { HouseRoutineChart } from "./HouseRoutineChart";
import { MoodMonthChart } from "./MoodMonthChart";

type Summary = Awaited<ReturnType<typeof getMonthSummary>>;

function percent(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Os três resumos do mês vivido — hábitos, casa e humor — em cards separados,
 * na ordem em que ela pediu. Cada um começa com a frase que responde "como
 * foi?" e só depois mostra o detalhe.
 */
export function MonthSummaryCards({ summary }: { summary: Summary }) {
  const { habits, house, mood, energy, daysInMonth, countedDays, loggedDays } = summary;

  const habitPercent = percent(habits.done, habits.possible);
  const ranked = [...habits.items]
    .filter((h) => h.total > 0)
    .sort((a, b) => b.done - a.done);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;

  const normal = house.byType.find((t) => t.type === "NORMAL")!;
  const faxina = house.byType.find((t) => t.type === "FAXINA")!;

  return (
    <>
      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">Hábitos</h2>
          {countedDays > 0 && (
            <span className="text-xs text-text-secondary">
              {plural(loggedDays, "dia registrado", "dias registrados")} de {countedDays}
            </span>
          )}
        </div>
        {habits.items.length === 0 || countedDays === 0 ? (
          <p className="text-sm text-text-secondary">Nenhum hábito registrado neste mês.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-2xl font-semibold text-text-primary">{habitPercent}%</p>
              <p className="text-sm text-text-secondary">
                dos hábitos feitos no mês
                {best && best.done > 0 && (
                  <>
                    {" "}
                    · mais firme: <span className="text-text-primary">{best.name}</span>
                  </>
                )}
                {worst && worst.done < best.done && (
                  <>
                    {" "}
                    · mais solto: <span className="text-text-primary">{worst.name}</span>
                  </>
                )}
              </p>
            </div>
            <HabitProgressList items={habits.items} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-text-primary">Tarefas de casa</h2>
        {house.days.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            {[normal, faxina].map((t) => (
              <div key={t.type} className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-text-secondary">{dayTypeLabels[t.type]}</p>
                <p className="text-xl font-semibold text-text-primary">
                  {t.days === 0 ? "—" : `${percent(t.done, t.total)}%`}
                </p>
                <p className="text-xs text-text-secondary">
                  {t.days === 0
                    ? "nenhum dia"
                    : `${plural(t.days, "dia", "dias")} · ${t.done} de ${t.total} tarefas`}
                </p>
              </div>
            ))}
          </div>
        )}
        <HouseRoutineChart days={house.days} daysInMonth={daysInMonth} />
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-text-primary">Humor</h2>
        <MoodMonthChart
          days={mood.days}
          daysInMonth={daysInMonth}
          counts={mood.counts}
          average={mood.average}
          energy={energy}
        />
      </Card>
    </>
  );
}
