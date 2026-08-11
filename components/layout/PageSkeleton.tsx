import { Card, Skeleton } from "@/components/ui";

type PageSkeletonProps = {
  /** Quantos cards vazios desenhar — aproxime da altura real da página. */
  cards?: number;
  /** Faixa de 4 StatCards no topo, como na home e no financeiro. */
  stats?: boolean;
};

/**
 * Tela de espera padrão das rotas. Repete a moldura do layout (topbar + main
 * com o mesmo padding) para que o conteúdo real entre no lugar do esqueleto sem
 * empurrar nada.
 */
export function PageSkeleton({ cards = 3, stats = false }: PageSkeletonProps) {
  return (
    <>
      <header className="hidden h-12 shrink-0 items-center border-b border-border bg-surface px-6 md:flex">
        <Skeleton className="h-4 w-32" />
      </header>

      <main className="flex-1 space-y-4 p-4 md:p-6">
        {stats && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
