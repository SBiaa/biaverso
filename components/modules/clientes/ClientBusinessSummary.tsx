import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AttentionBadge, BusinessBadge, Card } from "@/components/ui";
import { clientStatusLabels, projectStatusLabels } from "@/lib/labels";
import { formatDateBR } from "@/lib/utils";
import type { PendingItem } from "@/lib/ace";

export type BusinessSummary = {
  businessId: string;
  clientId: string;
  status: string;
  business: { name: string; color: string };
  projects: { id: string; name: string; status: string; endDate: string | null }[];
  pending: PendingItem[];
};

const MAX_PENDING = 6;

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className={`text-xl font-semibold ${danger ? "text-danger" : "text-text-primary"}`}>
        {value}
      </p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}

/** Resumo do cliente num negócio: projetos em andamento e o que está pendente. */
export function ClientBusinessSummary({ summary }: { summary: BusinessSummary }) {
  const late = summary.pending.filter((p) => p.overdue).length;
  const href = `/negocios/${summary.businessId}/clientes/${summary.clientId}`;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BusinessBadge business={summary.business} />
          <span className="text-xs text-text-secondary">
            {clientStatusLabels[summary.status]}
          </span>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          Abrir no negócio
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Projetos em andamento" value={summary.projects.length} />
        <Stat label="Pendentes" value={summary.pending.length} />
        <Stat label="Atrasados" value={late} danger={late > 0} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Projetos</h3>
          {summary.projects.length === 0 ? (
            <p className="text-sm text-text-secondary">Nenhum projeto em andamento.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {summary.projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate text-text-primary">{p.name}</span>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {p.endDate
                      ? `até ${formatDateBR(new Date(p.endDate))}`
                      : projectStatusLabels[p.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Pendentes</h3>
          {summary.pending.length === 0 ? (
            <p className="text-sm text-text-secondary">Nada pendente.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {summary.pending.slice(0, MAX_PENDING).map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-secondary">
                      {item.kind === "post" ? "Post" : "Produção"} · {item.statusLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.overdue && <AttentionBadge level="atrasado">Atrasado</AttentionBadge>}
                    <span className="text-xs text-text-secondary">
                      {item.dueOrPublishDate
                        ? formatDateBR(new Date(item.dueOrPublishDate))
                        : "Sem data"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {summary.pending.length > MAX_PENDING && (
            <Link href={href} className="text-xs font-medium text-accent hover:underline">
              Ver os outros {summary.pending.length - MAX_PENDING}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
