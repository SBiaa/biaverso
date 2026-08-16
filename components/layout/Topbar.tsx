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
    //
    // Antes era `hidden md:block`, e no celular 37 das 46 telas abriam sem
    // título nenhum: só a barra de baixo dizia onde você estava, e ela só
    // conhece cinco destinos. Agora vale nos dois tamanhos.
    <header
      className={cn(
        "sticky top-0 z-10 shrink-0 border-b border-border",
        "bg-surface/80 backdrop-blur-md",
      )}
    >
      <div
        className={cn(
          pageContainer(width),
          "flex h-14 items-center justify-between gap-4",
        )}
      >
        <h1 className="truncate text-lg font-semibold tracking-tight text-text-primary md:text-base">
          {title}
        </h1>
        {action}
      </div>
    </header>
  );
}
