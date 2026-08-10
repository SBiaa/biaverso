"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessTab } from "@/lib/business-modules";

/**
 * Abas do negócio. Quem decide quais existem são os módulos ligados — a lista
 * vem pronta de `buildBusinessTabs`, já na ordem salva.
 */
export function BusinessTabs({
  businessId,
  tabs,
  active,
}: {
  businessId: string;
  tabs: BusinessTab[];
  active: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(tab: BusinessTab) {
    if (tab.ownPage) return tab.href;

    // Trocar de aba dentro da mesma página preserva os filtros; vindo de uma
    // subpágina (pedidos, coleções) os params são outros e não servem de nada.
    const params =
      pathname === tab.href
        ? new URLSearchParams(searchParams.toString())
        : new URLSearchParams();
    params.set("tab", tab.key);
    return `${tab.href}?${params.toString()}`;
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={hrefFor(tab)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-accent/10 text-accent"
              : "text-text-secondary hover:bg-black/[0.03]",
          )}
        >
          {tab.label}
        </Link>
      ))}

      <Link
        href={`/negocios/${businessId}/configuracoes`}
        title="Módulos do negócio"
        className={cn(
          "ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          active === "configuracoes"
            ? "bg-accent/10 text-accent"
            : "text-text-secondary hover:bg-black/[0.03]",
        )}
      >
        <Settings size={14} />
        Módulos
      </Link>
    </nav>
  );
}
