"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardTitle, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import {
  buildCostBreakdown,
  charmPrice,
  formatMinutes,
  hasCostData,
  marginAt,
  marginTone,
  profitAt,
  suggestedPrice,
  totalCostAt,
  type CostItemInput,
} from "@/lib/produtos";
import { productCostKindLabels } from "@/lib/labels";

export function ProductPricingPanel({
  productId,
  costItems,
  basePrice,
  targetMargin,
  hourlyRate,
}: {
  productId: string;
  costItems: CostItemInput[];
  basePrice: number | null;
  /** A do produto, ou a padrão das configurações. */
  targetMargin: number;
  hourlyRate: number | null;
}) {
  const router = useRouter();
  const [target, setTarget] = useState(String(targetMargin));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakdown = buildCostBreakdown(costItems, { hourlyRate });
  // Sem nenhuma linha de custo, "lucro = preço" e "margem 100%" seriam falsos.
  const known = hasCostData(costItems);
  const cost = totalCostAt(breakdown, basePrice);
  const profit = known ? profitAt(breakdown, basePrice) : null;
  const margin = known ? marginAt(breakdown, basePrice) : null;

  const wanted = Number(target) || 0;
  const suggestion = suggestedPrice(breakdown, wanted);
  const rounded = suggestion === null ? null : charmPrice(suggestion);

  async function applyPrice(price: number) {
    setSaving(true);
    setError(null);

    try {
      await api.patch(`/api/products/${productId}`, {
        basePrice: price.toFixed(2),
        targetMargin: wanted,
      });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const kinds = Object.entries(breakdown.byKind).filter(([, value]) => value > 0);

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Preço e margem</CardTitle>

      {breakdown.missingHourlyRate && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Este produto tem custo por tempo, mas você ainda não definiu quanto vale
          sua hora — o seu trabalho está entrando como R$0 na conta.{" "}
          <Link href="/configuracoes" className="font-medium underline">
            Definir agora
          </Link>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-text-secondary">Custo por unidade</p>
          <p className="text-lg font-semibold text-text-primary">
            {known ? formatCurrencyBRL(cost) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Preço padrão</p>
          <p className="text-lg font-semibold text-text-primary">
            {basePrice === null ? "—" : formatCurrencyBRL(basePrice)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Lucro por unidade</p>
          <p
            className={cn(
              "text-lg font-semibold",
              profit === null ? "text-text-secondary" : marginTone(margin, targetMargin),
            )}
          >
            {profit === null ? "—" : formatCurrencyBRL(profit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Margem</p>
          <p className={cn("text-lg font-semibold", marginTone(margin, targetMargin))}>
            {margin === null ? "—" : `${margin.toFixed(0)}%`}
          </p>
        </div>
      </div>

      {(kinds.length > 0 || breakdown.percentRate > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          {kinds.map(([kind, value]) => (
            <span key={kind}>
              {productCostKindLabels[kind]}: {formatCurrencyBRL(value)}
            </span>
          ))}
          {breakdown.percentRate > 0 && (
            <span>
              Taxas: {(breakdown.percentRate * 100).toFixed(1)}% do preço
              {basePrice
                ? ` (${formatCurrencyBRL(breakdown.percentRate * basePrice)})`
                : ""}
            </span>
          )}
          {breakdown.minutes > 0 && <span>Tempo: {formatMinutes(breakdown.minutes)}</span>}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg bg-hover p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-text-primary" htmlFor="target-margin">
            Quero uma margem de
          </label>
          <input
            id="target-margin"
            type="number"
            min="0"
            max="99"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-20 rounded-md border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <span className="text-sm text-text-primary">%</span>
        </div>

        {!known ? (
          <p className="text-sm text-text-secondary">
            Cadastre a composição do custo aqui embaixo e eu calculo o preço que
            dá essa margem.
          </p>
        ) : suggestion === null ? (
          <p className="text-sm text-text-secondary">
            Não existe preço que dê {wanted}% de margem com{" "}
            {(breakdown.percentRate * 100).toFixed(1)}% de taxas em cima da venda —
            as duas fatias juntas passam de 100%.
          </p>
        ) : (
          <>
            <p className="text-sm text-text-primary">
              Preço sugerido:{" "}
              <strong className="text-base">{formatCurrencyBRL(suggestion)}</strong>
              {rounded !== null && (
                <span className="text-text-secondary">
                  {" "}
                  · arredondado {formatCurrencyBRL(rounded)}
                </span>
              )}
            </p>
            <p className="text-xs text-text-secondary">
              Já embute as taxas percentuais: o custo fixo de{" "}
              {formatCurrencyBRL(breakdown.fixed)} dividido por (100% − {wanted}% −{" "}
              {(breakdown.percentRate * 100).toFixed(1)}%).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => applyPrice(suggestion)} disabled={saving}>
                Usar {formatCurrencyBRL(suggestion)}
              </Button>
              {rounded !== null && (
                <Button variant="secondary" onClick={() => applyPrice(rounded)} disabled={saving}>
                  Usar {formatCurrencyBRL(rounded)}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <ErrorNote message={error} />
    </Card>
  );
}
