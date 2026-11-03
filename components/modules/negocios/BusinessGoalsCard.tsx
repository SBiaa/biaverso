import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardTitle } from "@/components/ui";
import { cn, formatDateBR } from "@/lib/utils";
import { formatGoalValue, goalProgress } from "@/lib/vision-shared";
import { measuredGoalStatusLabels } from "@/lib/labels";
import type { BusinessVision } from "@/lib/business-overview";
import type { ProjectCard } from "@/lib/projects-shared";

function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-hover">
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${value}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}

/**
 * Onde o negócio está em relação ao que ela quer dele, na ordem da Central de
 * Visão: pilar → objetivos conceituais → metas metrificadas → projetos.
 * Quando falta ligar o negócio à Central de Visão, diz o que falta em vez de
 * inventar números.
 */
export function BusinessGoalsCard({
  businessId,
  vision,
  projects,
  taskTotals,
}: {
  businessId: string;
  vision: BusinessVision;
  projects: ProjectCard[];
  taskTotals: { done: number; open: number } | null;
}) {
  const { pillar, measuredGoals } = vision;
  const missing = [
    !pillar && "O negócio ainda não tem um pilar escolhido (dá para escolher em Editar negócio).",
    measuredGoals.length === 0 &&
      "Nenhuma meta metrificada está ligada a este negócio (na meta, campo “Negócio”).",
  ].filter(Boolean) as string[];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Target size={15} className="text-text-secondary" />
          Metas do negócio
        </CardTitle>
        {taskTotals && (
          <span className="text-xs text-text-secondary">
            Tarefas: {taskTotals.done} {taskTotals.done === 1 ? "concluída" : "concluídas"} ·{" "}
            {taskTotals.open} em aberto
          </span>
        )}
      </div>

      {pillar && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-text-secondary">Pilar</p>
          <Link
            href={`/visao/${pillar.id}`}
            className="flex w-fit items-center gap-2 text-sm font-medium text-text-primary hover:underline"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: pillar.color }} />
            {pillar.name}
          </Link>
          {pillar.conceptualGoals.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {pillar.conceptualGoals.map((g) => (
                <li
                  key={g.id}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-secondary"
                >
                  {g.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {measuredGoals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-text-secondary">Metas</p>
          <ul className="flex flex-col gap-3">
            {measuredGoals.map((g) => {
              const pct = goalProgress(g);
              return (
                <li key={g.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-text-primary">{g.title}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {g.conceptualGoal}
                        {g.deadline && ` · até ${formatDateBR(new Date(g.deadline))}`}
                        {g.status !== "EM_ANDAMENTO" &&
                          ` · ${measuredGoalStatusLabels[g.status] ?? g.status}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                      {g.targetValue !== null
                        ? `${formatGoalValue(g.currentValue, g.unit)} de ${formatGoalValue(g.targetValue, g.unit)} · `
                        : ""}
                      <span className="font-medium text-text-primary">{pct}%</span>
                    </span>
                  </div>
                  <Bar value={pct} color={pillar?.color} />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 text-sm">
          <p className="text-text-primary">
            {missing.length === 2
              ? "Este negócio ainda não está ligado à Central de Visão, então não dá para medir o quanto falta para as metas."
              : "Falta um passo para ver o negócio completo na Central de Visão:"}
          </p>
          <ul className="list-disc pl-5 text-text-secondary">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <Link
            href={pillar ? `/visao/${pillar.id}` : "/visao"}
            className="w-fit text-xs font-medium text-accent hover:underline"
          >
            Preencher na Central de Visão
          </Link>
        </div>
      )}

      {projects.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-secondary">Projetos em andamento</p>
            <Link
              href={`/negocios/${businessId}?tab=interno`}
              className="-my-2 py-2 text-xs font-medium text-accent hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {projects.map((p) => (
              <li key={p.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <Link
                    href={`/negocios/${businessId}/projetos/${p.id}`}
                    className="min-w-0 truncate text-text-primary hover:underline"
                  >
                    {p.name}
                    {p.clientName && (
                      <span className="text-xs text-text-secondary"> · {p.clientName}</span>
                    )}
                  </Link>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums text-text-secondary",
                      p.overdue && "text-red-600",
                    )}
                  >
                    {p.totalItems === 0
                      ? "Sem itens"
                      : `${p.doneItems} ${p.doneItems === 1 ? "feito" : "feitos"} · ${p.totalItems - p.doneItems} em aberto`}
                  </span>
                </div>
                {p.totalItems > 0 && <Bar value={p.progress} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
