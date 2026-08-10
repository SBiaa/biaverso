import Link from "next/link";
import { getPillarIcon } from "@/lib/vision-visuals";
import { measuredGoalStatusLabels } from "@/lib/labels";
import { formatDateBR } from "@/lib/utils";
import { Card } from "@/components/ui";

type MeasuredGoalItem = {
  id: string;
  title: string;
  target: string | null;
  deadline: Date | null;
  progress: number;
  status: string;
  pillar: { id: string; name: string; color: string; icon: string | null };
};

export function MeasuredGoalsOverview({ goals }: { goals: MeasuredGoalItem[] }) {
  if (goals.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhum objetivo metrificado ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {goals.map((goal) => {
        const Icon = getPillarIcon(goal.pillar.icon);
        return (
          <li key={goal.id}>
            <Card className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/visao/${goal.pillar.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${goal.pillar.color}1F`, color: goal.pillar.color }}
                >
                  <Icon size={12} />
                  {goal.pillar.name}
                </Link>
                <span className="text-xs text-text-secondary">
                  {measuredGoalStatusLabels[goal.status] ?? goal.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">{goal.title}</span>
                {goal.target && <span className="text-text-secondary">{goal.target}</span>}
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>{goal.progress}%</span>
                <span>{goal.deadline ? formatDateBR(goal.deadline) : "Sem prazo"}</span>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
