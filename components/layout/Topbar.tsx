import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { pageContainer, type PageWidth } from "./page-width";

type TopbarProps = {
  title: string;
  action?: ReactNode;
  /** Precisa bater com a do `<main>` da página, para o título alinhar. */
  width?: PageWidth;
};

export function Topbar({ title, action, width = "wide" }: TopbarProps) {
  return (
    // Sticky: nas telas longas (financeiro, agenda) o cabeçalho era a única
    // pista de onde você está, e sumia no primeiro scroll. A borda vai de ponta
    // a ponta, mas o conteúdo dela respeita o container da página.
    <header
      className={cn(
        "sticky top-0 z-10 hidden shrink-0 border-b border-border",
        "bg-surface/80 backdrop-blur-md md:block",
      )}
    >
      <div
        className={cn(
          pageContainer(width),
          "flex h-14 items-center justify-between gap-4",
        )}
      >
        <h1 className="truncate text-base font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        {action}
      </div>
    </header>
  );
}
