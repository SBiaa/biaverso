"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/avaliacao", label: "Visão geral" },
  { href: "/avaliacao/semana", label: "Semana" },
  { href: "/avaliacao/mes", label: "Mês" },
  { href: "/avaliacao/trimestre", label: "Trimestre" },
];

export function AvaliacaoSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:bg-black/[0.03]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
