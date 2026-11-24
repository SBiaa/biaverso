import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Card, CardTitle } from "@/components/ui";
import { formatDateBR, monthNameBR } from "@/lib/utils";
import type { ModuleUsage, RaioXRow, Suggestion } from "@/lib/uso";

/** As sugestões do mês, uma por linha, com o link para o módulo. */
export function UsageSuggestionsCard({
  suggestions,
  hrefFor,
}: {
  suggestions: Suggestion[];
  hrefFor: (key: string) => string;
}) {
  return (
    <Card>
      <CardTitle className="mb-3">O que dá para melhorar</CardTitle>
      {suggestions.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nenhuma sugestão este mês: tudo o que existe está sendo usado.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.kind}-${suggestion.moduleKey}`} className="flex gap-2.5">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
              <p className="text-sm text-text-primary">
                {suggestion.text}{" "}
                <Link
                  href={hrefFor(suggestion.moduleKey)}
                  className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-accent-ink"
                >
                  Abrir <ArrowRight size={12} aria-hidden />
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Telas abertas no mês, da mais usada para a menos, com barra proporcional. */
export function UsageModulesCard({ modules }: { modules: ModuleUsage[] }) {
  const used = modules
    .filter((m) => m.views > 0 || m.actions > 0)
    .sort((a, b) => b.views - a.views || b.actions - a.actions);
  const max = Math.max(1, ...used.map((m) => m.views));

  return (
    <Card>
      <CardTitle className="mb-1">Telas abertas no mês</CardTitle>
      <p className="mb-3 text-xs text-text-secondary">
        Visitas (celular · computador), ações salvas e quantas telas você abre antes de chegar.
      </p>
      {used.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma visita registrada neste mês.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {used.map((module) => (
            <li key={module.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link href={module.href} className="font-medium text-text-primary hover:underline">
                  {module.label}
                </Link>
                <span className="shrink-0 tabular-nums text-text-secondary">
                  {module.views} {module.views === 1 ? "visita" : "visitas"}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden>
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(module.views / max) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {module.mobileViews} celular · {module.desktopViews} computador ·{" "}
                {module.actions} {module.actions === 1 ? "ação" : "ações"}
                {module.avgSteps !== null && module.key !== "home" && (
                  <>
                    {" "}
                    · {module.avgSteps.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                    telas antes
                  </>
                )}
                {module.viaSearch > 0 && <> · {module.viaSearch} pela busca</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Registros criados por módulo nos últimos meses, para ver o que esfriou. */
export function RaioXCard({
  months,
  rows,
}: {
  months: { month: number; year: number }[];
  rows: RaioXRow[];
}) {
  const sorted = [...rows].sort(
    (a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0),
  );

  return (
    <Card>
      <CardTitle className="mb-1">Raio-x dos registros</CardTitle>
      <p className="mb-3 text-xs text-text-secondary">
        Quantas coisas você registrou em cada módulo, mês a mês. Vem dos seus dados, então
        vale também para antes do registro de uso existir.
      </p>
      <div className="-mx-4 overflow-x-auto px-4 md:-mx-5 md:px-5">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs text-text-secondary">
              <th className="py-1.5 pr-3 font-medium">Módulo</th>
              {months.map((m) => (
                <th key={`${m.year}-${m.month}`} className="px-1.5 py-1.5 text-right font-medium">
                  {monthNameBR(m.month).slice(0, 3)}
                </th>
              ))}
              <th className="py-1.5 pl-3 text-right font-medium">Último</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.key} className="border-t border-border/60">
                <td className="py-1.5 pr-3">
                  <Link href={row.href} className="text-text-primary hover:underline">
                    {row.label}
                  </Link>
                </td>
                {row.counts.map((count, i) => (
                  <td
                    key={i}
                    className={
                      count === 0
                        ? "px-1.5 py-1.5 text-right tabular-nums text-text-secondary/50"
                        : "px-1.5 py-1.5 text-right tabular-nums text-text-primary"
                    }
                  >
                    {count === 0 ? "–" : count}
                  </td>
                ))}
                <td className="whitespace-nowrap py-1.5 pl-3 text-right text-xs text-text-secondary">
                  {row.lastAt ? formatDateBR(row.lastAt) : "nunca"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
