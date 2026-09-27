"use client";

import Link from "next/link";
import { Card, CardTitle, ErrorNote } from "@/components/ui";
import { useOptimisticList } from "@/hooks/useOptimistic";
import { api } from "@/lib/client-api";
import { WEEKDAY_LABELS } from "@/lib/cardapio";
import { mealTypeLabels } from "@/lib/labels";
import type { ShoppingItem } from "@/lib/receitas";
import { cn } from "@/lib/utils";

/**
 * O que falta comprar para a semana na tela.
 *
 * Cada linha é um ingrediente da despensa que alguma receita planejada usa e
 * que está marcado como "falta". Marcar aqui é o mesmo que marcar "tem em
 * casa" na despensa: a linha some no próximo refresh e a receita passa a
 * mostrar "dá pra fazer".
 */
export function ShoppingList({
  items,
  total,
  hasPlans,
}: {
  items: ShoppingItem[];
  /** Ingredientes distintos que a semana pede, faltando ou não. */
  total: number;
  hasPlans: boolean;
}) {
  const { items: rows, error, update } = useOptimisticList(
    items.map((item) => ({ ...item, id: item.ingredientId, bought: false })),
  );

  function markBought(id: string) {
    update(id, { bought: true }, () => api.patch(`/api/ingredients/${id}`, { inStock: true }));
  }

  const pending = rows.filter((row) => !row.bought).length;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>
          Lista de compras da semana
          {pending > 0 && (
            <span className="ml-2 font-normal text-text-secondary">{pending}</span>
          )}
        </CardTitle>
        <Link href="/cardapio/despensa" className="text-xs font-medium text-accent hover:underline">
          ver despensa
        </Link>
      </div>

      <ErrorNote message={error} />

      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {!hasPlans
            ? "Planeje a semana na grade acima e a lista se monta sozinha."
            : total === 0
              ? "As receitas planejadas ainda não têm ingredientes cadastrados."
              : "Tem tudo em casa para essa semana."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-2 text-sm">
              <label className="flex min-h-9 items-start gap-2 pt-0.5">
                <input
                  type="checkbox"
                  checked={row.bought}
                  onChange={() => markBought(row.id)}
                  disabled={row.bought}
                  aria-label={`Comprei ${row.name}`}
                  className="mt-0.5 h-4 w-4 accent-accent"
                />
              </label>
              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "text-text-primary",
                    row.bought && "text-text-secondary line-through",
                  )}
                >
                  {row.name}
                </span>
                <span className="text-[11px] text-text-secondary">
                  {row.uses
                    .map(
                      (use) =>
                        `${use.recipeTitle}${use.quantity ? ` (${use.quantity})` : ""} · ${WEEKDAY_LABELS[use.dayOfWeek]} ${(mealTypeLabels[use.mealType] ?? use.mealType).toLowerCase()}`,
                    )
                    .join(" · ")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
