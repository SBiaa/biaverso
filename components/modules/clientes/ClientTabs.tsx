"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** Abas Clientes / Prospects. Trocar de aba zera os filtros que só valem numa delas. */
export function ClientTabs({
  tab,
  clientCount,
  prospectCount,
}: {
  tab: "cliente" | "prospect";
  clientCount: number;
  prospectCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(next: "cliente" | "prospect") {
    const params = new URLSearchParams(searchParams);
    params.delete("stage");
    params.delete("due");
    if (next === "prospect") params.set("kind", "prospect");
    else params.delete("kind");
    router.push(`${pathname}?${params.toString()}`);
  }

  const tabs = [
    { key: "cliente" as const, label: "Clientes", count: clientCount },
    { key: "prospect" as const, label: "Prospects", count: prospectCount },
  ];

  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={tab === t.key}
          onClick={() => go(t.key)}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab === t.key
              ? "border-accent text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {t.label}
          <span className="ml-1.5 text-xs text-text-secondary">{t.count}</span>
        </button>
      ))}
    </div>
  );
}
