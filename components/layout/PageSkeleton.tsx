import { Card, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { pageContainer, type PageWidth } from "./page-width";

type PageSkeletonProps = {
  /** Quantos cards vazios desenhar — aproxime da altura real da página. */
  cards?: number;
  /** Faixa de 4 StatCards no topo, como na home e no financeiro. */
  stats?: boolean;
  /** A mesma da página que ele substitui, senão o conteúdo salta ao chegar. */
  width?: PageWidth;
};

/**
 * Tela de espera padrão das rotas. Repete a moldura do layout (topbar + main
 * com o mesmo padding) para que o conteúdo real entre no lugar do esqueleto sem
 * empurrar nada.
 */
export function PageSkeleton({
  cards = 3,
  stats = false,
  width = "wide",
}: PageSkeletonProps) {
  return (
    <>
      <header className="sticky top-0 z-10 hidden shrink-0 border-b border-border bg-surface/80 backdrop-blur-md md:block">
        <div className={cn(pageContainer(width), "flex h-14 items-center")}>
          <Skeleton className="h-4 w-32" />
        </div>
      </header>

      <main
        className={cn(
          pageContainer(width),
          "flex-1 space-y-4 py-5 md:space-y-6 md:py-8",
        )}
      >
        {stats && (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </Card>
            ))}
          </div>
        )}

        {Array.from({ length: cards }, (_, i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </main>
    </>
  );
}
