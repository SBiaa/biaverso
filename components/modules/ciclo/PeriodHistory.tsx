import { Card, CardTitle } from "@/components/ui";
import { formatDateBR } from "@/lib/utils";
import type { PeriodView } from "@/lib/ciclo-shared";

export function PeriodHistory({ periods }: { periods: PeriodView[] }) {
  return (
    <Card>
      <CardTitle className="mb-3">Últimos períodos</CardTitle>
      {periods.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nenhum período registrado ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {periods.map((period) => (
            <li
              key={period.start}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-text-primary">
                {formatDateBR(new Date(period.start))}
                {period.start !== period.end && ` – ${formatDateBR(new Date(period.end))}`}
              </span>
              <span className="text-text-secondary">
                {period.length} {period.length === 1 ? "dia" : "dias"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
