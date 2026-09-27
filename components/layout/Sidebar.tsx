"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBusinessIcon } from "@/lib/business-visuals";
import { CommandPaletteTrigger } from "./CommandPalette";
import {
  SIDEBAR_KEY,
  setSidebarCollapsed,
  toggleGroup,
  useClosedGroups,
  useSidebarCollapsed,
} from "./sidebar-state";
import { navGroups, type NavItem } from "./nav-config";

type Business = { id: string; name: string; icon: string | null };

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      // O `title` é o que sobra quando a barra está fechada e só o ícone
      // aparece: sem ele, um trilho de ícones vira adivinhação.
      title={item.label}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
        "[[data-sidebar='fechada']_&]:justify-center [[data-sidebar='fechada']_&]:px-0",
        isActive
          ? "bg-surface font-semibold text-accent shadow-elevation"
          : "font-medium text-text-secondary hover:bg-hover-strong hover:text-text-primary",
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
      <span className="truncate [[data-sidebar='fechada']_&]:hidden">
        {item.label}
      </span>
    </Link>
  );
}

export function Sidebar({ businesses }: { businesses: Business[] }) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const closedGroups = useClosedGroups();

  // Ctrl+\ é o mesmo atalho do Notion para a barra lateral.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "\\" || (!event.ctrlKey && !event.metaKey)) return;
      event.preventDefault();
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) !== "fechada");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function isItemActive(href: string) {
    // "/negocios" é a lista de todos; sem o match exato ela ficaria acesa
    // junto com o negócio aberto, dois itens marcados ao mesmo tempo.
    return href === "/" || href === "/negocios"
      ? pathname === href
      : pathname.startsWith(href);
  }

  return (
    // `sticky` + `h-screen`: antes a sidebar era um item de flex comum e rolava
    // junto com a página, então nas telas longas a navegação inteira ficava
    // acima da dobra. Agora ela fica, e o scroll dela é o seu — a lista de
    // negócios pode crescer sem empurrar nada para fora.
    //
    // A largura vem de uma variável CSS que o script do `<head>` já resolveu:
    // fechada ou aberta, a primeira pintura sai certa e a página não pula.
    <aside
      style={{ width: "var(--sidebar-w)" }}
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col transition-[width]",
        "overflow-y-auto overscroll-contain border-r border-border bg-sidebar",
        "scrollbar-slim px-3 py-5 md:flex",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-1 px-1">
        <Link
          href="/"
          className={cn(
            "flex min-w-0 items-center gap-2 text-lg font-semibold tracking-tight text-text-primary",
            collapsed && "justify-center",
          )}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-contrast">
            b
          </span>
          {!collapsed && <span className="truncate">biaVerso</span>}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            title="Fechar a barra (Ctrl + \)"
            aria-label="Fechar a barra lateral"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-hover-strong hover:text-text-primary"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          title="Abrir a barra (Ctrl + \)"
          aria-label="Abrir a barra lateral"
          className="mb-4 flex h-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-hover-strong hover:text-text-primary"
        >
          <PanelLeftOpen size={16} />
        </button>
      ) : (
        <CommandPaletteTrigger />
      )}

      <nav className="flex flex-col gap-4 pb-2">
        {navGroups.map((group) => {
          const isClosed = closedGroups.includes(group.title);
          const items = [
            ...group.items,
            ...(group.showBusinesses
              ? businesses.map((business) => ({
                  href: `/negocios/${business.id}`,
                  label: business.name,
                  icon: getBusinessIcon(business.icon),
                }))
              : []),
          ];

          // Fechar um grupo não pode esconder a tela em que você está: seria
          // perder a única marcação de "você está aqui" da barra.
          const hasActive = items.some((item) => isItemActive(item.href));
          const hidden = isClosed && !hasActive;

          return (
            <div key={group.title} className="flex flex-col gap-0.5">
              {collapsed ? (
                // No trilho de ícones o título viraria três letras cortadas;
                // um filete separa os grupos sem tentar nomeá-los.
                <span className="mx-auto mb-1 h-px w-6 bg-border" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  aria-expanded={!hidden}
                  className={cn(
                    "group/label flex items-center gap-1 rounded px-3 pb-0.5 text-left",
                    "text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary/70",
                    "transition-colors hover:text-text-primary",
                  )}
                >
                  {/* Fechada aponta para a direita, aberta para baixo. Só
                      aparece quando o grupo está fechado ou o mouse chega:
                      sempre visível, ela vira ruído repetido seis vezes. */}
                  <ChevronRight
                    size={11}
                    className={cn(
                      "shrink-0 transition-all",
                      hidden
                        ? "opacity-100"
                        : "rotate-90 opacity-0 group-hover/label:opacity-100",
                    )}
                  />
                  {group.title}
                </button>
              )}

              {!hidden &&
                items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isItemActive(item.href)}
                  />
                ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
