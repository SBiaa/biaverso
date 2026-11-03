"use client";

import Link, { useLinkStatus } from "next/link";
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
        <Link key={tab.key} href={hrefFor(tab)} className="rounded-lg">
          <TabPill label={tab.label} active={active === tab.key} />
        </Link>
      ))}

      <Link
        href={`/negocios/${businessId}/configuracoes`}
        title="Módulos do negócio"
        className={cn(
          "ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          active === "configuracoes"
            ? "bg-accent/10 text-accent"
            : "text-text-secondary hover:bg-hover",
        )}
      >
        <Settings size={14} />
        Módulos
      </Link>
    </nav>
  );
}

/**
 * A aba clicada acende assim que o clique acontece, sem esperar o servidor:
 * antes ela só mudava quando a página nova chegava, e o clique parecia não
 * ter pegado.
 */
function TabPill({ label, active }: { label: string; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active || pending
          ? "bg-accent/10 text-accent"
          : "text-text-secondary hover:bg-hover",
        pending && "animate-pulse",
      )}
    >
      {label}
    </span>
  );
}
