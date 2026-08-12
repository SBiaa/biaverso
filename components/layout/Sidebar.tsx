"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBusinessIcon } from "@/lib/business-visuals";
import { navGroups, type NavItem } from "./nav-config";

type Business = { id: string; name: string; icon: string | null };

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-surface font-semibold text-accent shadow-elevation"
          : "font-medium text-text-secondary hover:bg-black/[0.04] hover:text-text-primary",
      )}
    >
      {/* O ícone é o que diferencia os itens de relance numa lista de 20
          links; apagado quando inativo, ele some junto com o texto. */}
      <Icon
        size={16}
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-accent" : "text-text-secondary/70 group-hover:text-text-primary",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary/70">
      {children}
    </span>
  );
}

export function Sidebar({ businesses }: { businesses: Business[] }) {
  const pathname = usePathname();

  function isItemActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    // `sticky` + `h-screen`: antes a sidebar era um item de flex comum e rolava
    // junto com a página, então nas telas longas a navegação inteira ficava
    // acima da dobra. Agora ela fica, e o scroll dela é o seu — a lista de
    // negócios pode crescer sem empurrar nada para fora.
    <aside
      className={cn(
        "sticky top-0 hidden h-screen w-60 shrink-0 flex-col",
        "overflow-y-auto overscroll-contain border-r border-border bg-sidebar",
        "scrollbar-slim px-3 py-5 md:flex",
      )}
    >
      <Link
        href="/"
        className="mb-5 flex items-center gap-2 px-3 text-lg font-semibold tracking-tight text-text-primary"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
          b
        </span>
        biaVerso
      </Link>

      <nav className="flex flex-col gap-4 pb-2">
        <div className="flex flex-col gap-0.5">
          <NavGroupLabel>{navGroups[0].title}</NavGroupLabel>
          {navGroups[0].items.map((item) => (
            <NavLink key={item.href} item={item} isActive={isItemActive(item.href)} />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <NavGroupLabel>Negócios</NavGroupLabel>
          <NavLink
            item={{ href: "/negocios", label: "Todos os negócios", icon: Building2 }}
            isActive={pathname === "/negocios"}
          />
          {businesses.map((business) => (
            <NavLink
              key={business.id}
              item={{
                href: `/negocios/${business.id}`,
                label: business.name,
                icon: getBusinessIcon(business.icon),
              }}
              isActive={isItemActive(`/negocios/${business.id}`)}
            />
          ))}
        </div>

        {navGroups.slice(1).map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <NavGroupLabel>{group.title}</NavGroupLabel>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} isActive={isItemActive(item.href)} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
