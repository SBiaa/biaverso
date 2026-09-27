"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * A fila de abas de um módulo (Financeiro, Beleza, Avaliação).
 *
 * Era `flex-wrap` em cada um deles: no celular as sete abas do Financeiro
 * quebravam em três linhas e comiam a primeira tela inteira antes de qualquer
 * conteúdo. Aqui a fila é uma só e rola de lado — o corte no fim da tela é o
 * que avisa que tem mais aba adiante.
 */

export type SubNavLink = { href: string; label: string };

export function SubNav({
  links,
  /** `true` quando um item deve acender também nas rotas filhas dele. */
  matchNested = false,
}: {
  links: SubNavLink[];
  matchNested?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        // `-mx-4 px-4` sangra a área de rolagem até a borda da tela, senão a
        // última aba fica cortada dentro da margem da página.
        "-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 pb-2",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "md:mx-0 md:flex-wrap md:px-0 md:pb-3",
      )}
    >
      {links.map((link) => {
        const isActive = matchNested
          ? pathname === link.href || pathname.startsWith(`${link.href}/`)
          : pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3",
              "text-sm font-medium transition-colors md:min-h-0 md:py-1.5",
              isActive
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-hover",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
