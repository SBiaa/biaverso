import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageContainer, type PageWidth } from "./page-width";

/** Um degrau do caminho. Sem `href` quando o nível não tem tela própria. */
export type Crumb = { label: string; href?: string };

type TopbarProps = {
  title: string;
  /**
   * Os níveis acima desta tela, do mais alto para o mais próximo.
   *
   * Existe porque a sidebar deixou de ser pista de contexto: com os negócios
   * fora do menu, abrir um projeto do Creative não dizia em lugar nenhum que
   * você estava no Creative.
   */
  trail?: Crumb[];
  action?: ReactNode;
  /** Precisa bater com a do `<main>` da página, para o título alinhar. */
  width?: PageWidth;
};

export function Topbar({ title, trail = [], action, width = "wide" }: TopbarProps) {
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
        <nav
          aria-label="Caminho"
          className="flex min-w-0 items-center gap-1.5 text-text-secondary"
        >
          {trail.map((crumb, index) => (
            <span
              key={`${crumb.label}-${index}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5",
                // No celular só o degrau imediatamente acima cabe junto com o
                // título; os de cima ficam para o desktop em vez de espremer
                // tudo em 375px.
                index < trail.length - 1 && "hidden sm:flex",
              )}
            >
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="rounded text-sm transition-colors hover:text-text-primary"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-sm">{crumb.label}</span>
              )}
              <ChevronRight size={14} className="shrink-0 opacity-50" />
            </span>
          ))}

          <h1 className="truncate text-lg font-semibold tracking-tight text-text-primary md:text-base">
            {title}
          </h1>
        </nav>
        {action}
      </div>
    </header>
  );
}
