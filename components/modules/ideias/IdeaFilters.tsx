"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { IDEA_TABS, PESSOAL_LABEL, type IdeaStatus } from "./labels";

type Business = { id: string; name: string };

/**
 * Abas por status (Soltas, Em análise, Viraram projeto, Arquivadas) e o filtro
 * de destino. As abas ficam no lugar do select de status: o que está solto é o
 * que se olha no dia a dia, e o arquivado não se mistura mais com ele.
 */
export function IdeaFilters({
  businesses,
  active,
  counts,
}: {
  businesses: Business[];
  active: IdeaStatus;
  counts: Record<IdeaStatus, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefWith(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <nav
        aria-label="Status das ideias"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {IDEA_TABS.map((tab) => {
          const isActive = tab.status === active;
          return (
            <Link
              key={tab.status}
              // "Soltas" é o padrão: o endereço fica limpo, sem ?status=.
              href={hrefWith("status", tab.status === "SOLTA" ? null : tab.status)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors md:min-h-9",
                isActive ? "bg-accent/10 text-accent-ink" : "text-text-secondary hover:bg-hover",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  isActive ? "bg-accent/15" : "bg-border",
                )}
              >
                {counts[tab.status]}
              </span>
            </Link>
          );
        })}
      </nav>

      <select
        value={searchParams.get("businessId") ?? ""}
        onChange={(e) => router.push(hrefWith("businessId", e.target.value || null))}
        aria-label="Filtrar por destino"
        className="min-h-11 rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent md:min-h-9 md:w-56"
      >
        <option value="">Todos os destinos</option>
        <option value="PESSOAL">{PESSOAL_LABEL}</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
