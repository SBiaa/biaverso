import Link from "next/link";
import type { ClosedMeasuredGoal } from "@/lib/avaliacao";
import { measuredGoalStatusLabels } from "@/lib/labels";
import { getPillarIcon } from "@/lib/vision-visuals";
import { cn, formatDateBR } from "@/lib/utils";
import { Card } from "@/components/ui";

const statusTone: Record<string, string> = {
  CONCLUIDO: "bg-emerald-100 text-emerald-700",
  NAO_ATINGIDO: "bg-amber-100 text-amber-700",
  CANCELADO: "bg-red-100 text-red-700",
};

/** Metas que fecharam no período, com o resultado real e o que ficou de lição. */
export function ClosedGoalsCard({
  goals,
  period,
}: {
  goals: ClosedMeasuredGoal[];
  period: string;
}) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-text-primary">
        Metas encerradas {period}
      </h2>
      {goals.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma meta encerrada {period}.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => {
            const Icon = getPillarIcon(goal.pillar.icon);
            return (
              <li key={goal.id} className="flex flex-col gap-1.5 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/visao/${goal.pillar.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${goal.pillar.color}1F`, color: goal.pillar.color }}
                  >
                    <Icon size={12} />
                    {goal.pillar.name}
                  </Link>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      statusTone[goal.status],
                    )}
                  >
                    {measuredGoalStatusLabels[goal.status] ?? goal.status} · {goal.progress}%
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-text-primary">{goal.title}</span>
                  {goal.target && <span className="text-text-secondary">{goal.target}</span>}
                </div>

                <p className="whitespace-pre-line text-sm text-text-primary">
                  <span className="text-xs font-medium text-text-secondary">Aprendizado: </span>
                  {goal.lesson || (
                    <span className="text-text-secondary">
                      não registrado — dá para escrever editando a meta no pilar.
                    </span>
                  )}
                </p>

                <p className="text-xs text-text-secondary">
                  Encerrada em {formatDateBR(goal.closedAt)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
