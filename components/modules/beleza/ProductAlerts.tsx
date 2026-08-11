import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { formatDateBR } from "@/lib/utils";
import { productCategoryLabels } from "@/lib/labels";
import type { ProductView } from "@/lib/beleza-shared";
import { ExpiryPill } from "./shared";

/**
 * Produtos que pedem atenção: validade chegando (ou vencida) e os marcados a
 * mão como quase acabando. Só leitura — quem edita é /beleza/produtos.
 */
export function ProductAlerts({
  expiring,
  runningLow,
}: {
  expiring: ProductView[];
  runningLow: ProductView[];
}) {
  if (expiring.length === 0 && runningLow.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Nenhum produto vencendo ou acabando.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {expiring.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Validade
          </p>
          {expiring.map((product) => (
            <Link
              key={product.id}
              href="/beleza/produtos"
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 transition-colors hover:bg-black/[0.02]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">
                  {product.name}
                  {product.brand && (
                    <span className="font-normal text-text-secondary"> · {product.brand}</span>
                  )}
                </p>
                <p className="text-xs text-text-secondary">
                  {productCategoryLabels[product.category]}
                  {product.expiresAt &&
                    ` · ${formatDateBR(new Date(product.expiresAt))}`}
                </p>
              </div>
              <ExpiryPill status={product.status} days={product.daysUntilExpiry} />
            </Link>
          ))}
        </div>
      )}

      {runningLow.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Quase acabando
          </p>
          {runningLow.map((product) => (
            <Link
              key={product.id}
              href="/beleza/produtos"
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 transition-colors hover:bg-black/[0.02]"
            >
              <PackageOpen size={15} className="shrink-0 text-text-secondary" />
              <p className="truncate text-sm text-text-primary">
                {product.name}
                {product.brand && (
                  <span className="text-text-secondary"> · {product.brand}</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
