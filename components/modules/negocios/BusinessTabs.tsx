"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "clientes", label: "Clientes" },
  { key: "calendario", label: "Calendário" },
  { key: "kanban", label: "Kanban" },
];

export function BusinessTabs({ active }: { active: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
      {tabs.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab.key);
        const isActive = active === tab.key;
        return (
          <Link
            key={tab.key}
            href={`${pathname}?${params.toString()}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-black/[0.03]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
