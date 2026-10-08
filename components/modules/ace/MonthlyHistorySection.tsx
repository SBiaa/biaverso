import { Card, CardTitle } from "@/components/ui";
import type { MonthlyHistoryEntry } from "@/lib/ace";
import { formatDateBR } from "@/lib/utils";

export function MonthlyHistorySection({ months }: { months: MonthlyHistoryEntry[] }) {
  // Mês sem nada publicado, concluído ou pendente só ocupava espaço: some.
  // E o mais recente vem primeiro, que é o que ela quer ver ao abrir a página.
  const visible = months
    .filter((m) => m.publishedCount > 0 || m.completedCount > 0 || m.pendingOrLate.length > 0)
    .reverse();

  return (
    <div className="flex flex-col gap-2">
      <CardTitle>Histórico mensal</CardTitle>
      {visible.length === 0 ? (
        <p className="text-sm text-text-secondary">Sem atividade nos últimos meses.</p>
      ) : (
        <div className="grid items-start gap-3 2xl:grid-cols-2">
          {visible.map((month) => (
            <Card key={`${month.year}-${month.month}`} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{month.label}</p>
                <div className="flex gap-3 text-xs text-text-secondary">
                  <span>
                    {month.publishedCount} publicado{month.publishedCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {month.completedCount} concluída{month.completedCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {month.pendingOrLate.length > 0 && (
                <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
                  {month.pendingOrLate.map((item) => (
                    <li
                      key={`${item.kind}-${item.id}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-text-primary">{item.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs">
                        {item.dueOrPublishDate && (
                          <span className="text-text-secondary">
                            {formatDateBR(new Date(item.dueOrPublishDate))}
                          </span>
                        )}
                        <span
                          className={
                            item.late ? "font-medium text-red-600" : "text-text-secondary"
                          }
                        >
                          {item.late ? "Ficou atrasado" : "Pendente"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
