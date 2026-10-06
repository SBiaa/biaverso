import { CheckSquare, Droplets, Repeat, Utensils } from "lucide-react";
import { Card } from "@/components/ui";

type Count = { done: number; total: number };

type DaySummaryProps = {
  tasks: Count;
  habits: Count;
  meals: Count;
  water: Count;
};

/**
 * O dia numa olhada: quanto já foi feito de cada coisa e quanto do todo.
 * Sem estado próprio — as listas abaixo chamam `router.refresh()` ao marcar, e
 * o servidor manda os números novos.
 */
export function DaySummary({ tasks, habits, meals, water }: DaySummaryProps) {
  const stats = [
    { label: "Tarefas", icon: CheckSquare, ...tasks },
    { label: "Hábitos", icon: Repeat, ...habits },
    { label: "Refeições", icon: Utensils, ...meals },
    { label: "Água", icon: Droplets, ...water },
  ];

  // A água entra limitada à meta: beber mais do que ela não pode "pagar" uma
  // tarefa que ficou por fazer.
  const total = stats.reduce((sum, s) => sum + s.total, 0);
  const done = stats.reduce((sum, s) => sum + Math.min(s.done, s.total), 0);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-text-primary">Resumo do dia</p>
        <span className="text-sm text-text-secondary">{progress}%</span>
      </div>
      <div
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Progresso do dia"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ label, icon: Icon, done: d, total: t }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon size={16} className="shrink-0 text-text-secondary" />
            <div className="min-w-0">
              <p className="text-xs text-text-secondary">{label}</p>
              <p className="text-sm font-medium text-text-primary">
                {t === 0 ? "—" : `${Math.min(d, t)} de ${t}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
