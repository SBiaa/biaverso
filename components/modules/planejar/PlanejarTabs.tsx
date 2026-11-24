"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Compass, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Planejar" junta três telas que se sobrepunham no menu: a Central de Visão
 * (o porquê), o Planejamento do ano (o que neste ano) e a Avaliação (como
 * foi). Continuam sendo três páginas; o que muda é que moram juntas, com esta
 * barra no topo de cada uma para pular entre elas.
 *
 * Desenho de "segmentos", e não de abas: na Avaliação ainda vem embaixo a fila
 * de abas dela (Semana, Mês, Trimestre), e duas filas iguais confundiam.
 */
const sections = [
  { href: "/visao", label: "Visão", icon: Compass },
  { href: "/ano", label: "Ano", icon: CalendarRange },
  { href: "/avaliacao", label: "Avaliação", icon: LineChart },
];

export function PlanejarTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Planejar"
      className="inline-flex w-full rounded-xl border border-border bg-surface p-1 sm:w-auto"
    >
      {sections.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors sm:min-h-9 sm:flex-none",
              active
                ? "bg-accent text-accent-contrast"
                : "text-text-secondary hover:bg-hover hover:text-text-primary",
            )}
          >
            <Icon size={15} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
