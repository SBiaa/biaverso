import Link from "next/link";
import { Card } from "@/components/ui";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import {
  buildCostBreakdown,
  formatMinutes,
  hasCostData,
  marginAt,
  marginTone,
  totalCostAt,
  type CostItemInput,
} from "@/lib/produtos";

export type ProductCardData = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  basePrice: number | null;
  targetMargin: number | null;
  active: boolean;
  businessName: string | null;
  costItems: CostItemInput[];
  /** Em quantas peças de coleção este produto está sendo usado. */
  usageCount: number;
};

export function ProductCard({
  product,
  hourlyRate,
  defaultTargetMargin,
}: {
  product: ProductCardData;
  hourlyRate: number | null;
  defaultTargetMargin: number;
}) {
  const target = product.targetMargin ?? defaultTargetMargin;
  const breakdown = buildCostBreakdown(product.costItems, { hourlyRate });
  const hasCost = hasCostData(product.costItems);
  const cost = totalCostAt(breakdown, product.basePrice);
  // Sem custo cadastrado a conta daria 100% de margem — melhor não dar número.
  const margin = hasCost ? marginAt(breakdown, product.basePrice) : null;

  return (
    <Link href={`/produtos/${product.id}`} className="group">
      <Card
        className={cn(
          "flex h-full flex-col gap-3 transition-colors group-hover:bg-black/[0.02]",
          !product.active && "opacity-60",
        )}
      >
        <div className="flex items-start gap-3">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {product.name}
            </p>
            <p className="truncate text-xs text-text-secondary">
              {[product.category, product.businessName ?? "Todos os negócios"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-text-secondary">Custo</p>
            <p className="font-medium text-text-primary">
              {hasCost ? formatCurrencyBRL(cost) : "—"}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Preço</p>
            <p className="font-medium text-text-primary">
              {product.basePrice === null ? "—" : formatCurrencyBRL(product.basePrice)}
            </p>
          </div>
          <div>
            <p className="text-text-secondary">Margem</p>
            <p className={cn("font-medium", marginTone(margin, target))}>
              {margin === null ? "—" : `${margin.toFixed(0)}%`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
          {!hasCost && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
              Sem custo cadastrado
            </span>
          )}
          {breakdown.minutes > 0 && <span>{formatMinutes(breakdown.minutes)} de produção</span>}
          <span>
            {product.usageCount === 0
              ? "Fora das coleções"
              : `Em ${product.usageCount} ${product.usageCount === 1 ? "peça" : "peças"}`}
          </span>
        </div>
      </Card>
    </Link>
  );
}
