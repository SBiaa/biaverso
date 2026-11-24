import Link from "next/link";
import type { ClosedMeasuredGoal } from "@/lib/avaliacao";
import { measuredGoalStatusLabels } from "@/lib/labels";
import { VISION_TONES, getPillarIcon } from "@/lib/vision-visuals";
import { formatGoalValue, goalProgress } from "@/lib/vision-shared";
import { formatDateBR, hexToRgba } from "@/lib/utils";
import { Card } from "@/components/ui";

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
            const tone = VISION_TONES[goal.status] ?? "#64748B";
            const hasTarget = goal.targetValue !== null && goal.targetValue > 0;
            return (
              <li
                key={goal.id}
                className="flex flex-col gap-1.5 rounded-md border border-border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/visao/${goal.pillar.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: hexToRgba(goal.pillar.color, 0.14),
                      color: goal.pillar.color,
                    }}
                  >
                    <Icon size={12} />
                    {goal.pillar.name}
                  </Link>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: hexToRgba(tone, 0.14), color: tone }}
                  >
                    {measuredGoalStatusLabels[goal.status] ?? goal.status} ·{" "}
                    {goalProgress(goal)}%
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-text-primary">{goal.title}</span>
                  <span className="text-text-secondary">
                    {hasTarget
                      ? `${formatGoalValue(goal.currentValue, goal.unit)} de ${formatGoalValue(goal.targetValue!, goal.unit)}`
                      : goal.target}
                  </span>
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
