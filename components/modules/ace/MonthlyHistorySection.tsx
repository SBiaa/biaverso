import { Card, CardTitle } from "@/components/ui";
import type { MonthlyHistoryEntry } from "@/lib/ace";

export function MonthlyHistorySection({ months }: { months: MonthlyHistoryEntry[] }) {
  return (
    <div className="flex flex-col gap-2">
      <CardTitle>Histórico mensal</CardTitle>
      <div className="flex flex-col gap-2">
        {months.map((month) => (
          <Card key={`${month.year}-${month.month}`} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-text-primary">{month.label}</p>
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
              <ul className="flex flex-col gap-1 border-t border-border pt-2">
                {month.pendingOrLate.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-text-primary">{item.title}</span>
                    <span className={item.late ? "font-medium text-red-600" : "text-text-secondary"}>
                      {item.late ? "Ficou atrasado" : "Pendente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
