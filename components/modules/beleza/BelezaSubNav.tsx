"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/beleza", label: "Hoje" },
  { href: "/beleza/rotinas", label: "Rotinas" },
  { href: "/beleza/cronogramas", label: "Cronogramas" },
  { href: "/beleza/cuidados", label: "Cuidados" },
  { href: "/beleza/produtos", label: "Produtos" },
];

export function BelezaSubNav() {
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
