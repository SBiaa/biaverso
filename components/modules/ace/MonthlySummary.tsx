import { Card, CardTitle } from "@/components/ui";
import { contentStatusColors } from "@/lib/ace-shared";
import { contentStatusLabels, socialNetworkLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Painel rápido pra balancear o cronograma do mês: quantos posts por rede e em
 * que status estão, sem precisar contar item por item no calendário.
 */
export function MonthlySummary({
  postsByNetwork,
  postsByStatus,
  totalPosts,
  totalTasks,
}: {
  postsByNetwork: Record<string, number>;
  postsByStatus: Record<string, number>;
  totalPosts: number;
  totalTasks: number;
}) {
  if (totalPosts === 0 && totalTasks === 0) return null;

  const networkEntries = Object.entries(postsByNetwork).filter(([, count]) => count > 0);
  const statusEntries = Object.entries(postsByStatus).filter(([, count]) => count > 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Resumo do mês</CardTitle>
        <span className="text-xs text-text-secondary">
          {totalPosts} {totalPosts === 1 ? "post" : "posts"} · {totalTasks}{" "}
          {totalTasks === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>

      {networkEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {networkEntries.map(([network, count]) => (
            <span
              key={network}
              className="rounded-full bg-hover px-2.5 py-1 text-xs font-medium text-text-primary"
            >
              {socialNetworkLabels[network] ?? network} · {count}
            </span>
          ))}
        </div>
      )}

      {statusEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {statusEntries.map(([status, count]) => (
            <span
              key={status}
              className={cn("rounded-full px-2.5 py-1 text-xs font-medium", contentStatusColors[status])}
            >
              {contentStatusLabels[status] ?? status} · {count}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
