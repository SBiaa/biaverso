import type { ProductCostKind, ProductCostMode } from "@/app/generated/prisma/client";

/**
 * Central de produtos: o cálculo de custo, margem e preço sugerido. Puro — não
 * importa "@/lib/prisma", então os componentes "use client" também podem usar.
 *
 * A conta tem uma sutileza que motiva o arquivo inteiro: nem todo custo é um
 * valor fixo. Taxa de maquininha, comissão de marketplace e imposto são uma
 * FATIA DO PREÇO — subiu o preço, subiu a taxa junto. Tratar esses como R$ fixo
 * infla a margem que a tela mostra e faz parecer que o produto dá mais lucro do
 * que dá.
 *
 * Por isso o custo é sempre dividido em duas partes:
 *   custo(preço) = fixo + taxa% × preço
 */

/** O insumo como ele é comprado — o custo por unidade sai daqui. */
export type MaterialCost = { packPrice: number; packQuantity: number };

export type CostItemInput = {
  kind: ProductCostKind;
  mode: ProductCostMode;
  amount: number;
  /** Presente nas linhas em modo INSUMO. */
  material?: MaterialCost | null;
};

/**
 * Include obrigatório ao ler itens de custo: sem o insumo junto, a linha em
 * modo INSUMO não tem como saber quanto vale e sairia como R$0.
 */
export const costItemsQuery = {
  orderBy: { order: "asc" },
  include: { material: true },
} as const;

/** R$120 o pacote de 50 folhas = R$2,40 a folha. */
export function materialUnitCost(material: MaterialCost | null | undefined) {
  if (!material || material.packQuantity <= 0) return 0;
  return material.packPrice / material.packQuantity;
}

export type CostBreakdown = {
  /** R$ por unidade que não dependem do preço de venda. */
  fixed: number;
  /** Fatia do preço que vira custo, de 0 a 1 (0.04 = 4%). */
  percentRate: number;
  /** Minutos de produção somados — o tempo que a peça toma de você. */
  minutes: number;
  /**
   * Tem item em modo TEMPO mas o valor/hora não foi definido nas configurações.
   * A tela avisa em vez de contar seu trabalho como zero e mentir na margem.
   */
  missingHourlyRate: boolean;
  /** Quanto cada tipo de custo pesa em R$ (o percentual entra em `percentRate`). */
  byKind: Partial<Record<ProductCostKind, number>>;
};

export const EMPTY_BREAKDOWN: CostBreakdown = {
  fixed: 0,
  percentRate: 0,
  minutes: 0,
  missingHourlyRate: false,
  byKind: {},
};

/** O custo em R$ de um item. Zero no PERCENTUAL, que depende do preço. */
export function fixedValueOf(item: CostItemInput, hourlyRate: number | null) {
  if (item.mode === "TEMPO") return (item.amount / 60) * (hourlyRate ?? 0);
  if (item.mode === "INSUMO") return item.amount * materialUnitCost(item.material);
  if (item.mode === "PERCENTUAL") return 0;
  return item.amount;
}

/**
 * Soma os itens de custo separando o que é fixo do que é percentual.
 * `extra` é o custo que só existe naquela peça da coleção (arte exclusiva, tag).
 */
export function buildCostBreakdown(
  items: CostItemInput[],
  { hourlyRate, extra = 0 }: { hourlyRate: number | null; extra?: number },
): CostBreakdown {
  const breakdown: CostBreakdown = {
    fixed: extra,
    percentRate: 0,
    minutes: 0,
    missingHourlyRate: false,
    byKind: extra ? { OUTRO: extra } : {},
  };

  for (const item of items) {
    if (item.mode === "PERCENTUAL") {
      breakdown.percentRate += item.amount / 100;
      continue;
    }
    if (item.mode === "TEMPO") {
      breakdown.minutes += item.amount;
      if (hourlyRate === null || hourlyRate <= 0) breakdown.missingHourlyRate = true;
    }
    const value = fixedValueOf(item, hourlyRate);
    breakdown.fixed += value;
    breakdown.byKind[item.kind] = (breakdown.byKind[item.kind] ?? 0) + value;
  }

  return breakdown;
}

/**
 * Se não há nenhum custo cadastrado, não existe margem para mostrar. A conta
 * daria 100% de lucro — que é exatamente o número errado de se acreditar.
 */
export function hasCostData(items: CostItemInput[], extra?: number | null) {
  return items.length > 0 || !!extra;
}

/** Custo total de uma unidade vendida a `price`. */
export function totalCostAt(breakdown: CostBreakdown, price: number | null) {
  return breakdown.fixed + breakdown.percentRate * (price ?? 0);
}

/** Lucro em R$ por unidade. Null quando ainda não há preço. */
export function profitAt(breakdown: CostBreakdown, price: number | null) {
  if (price === null || price <= 0) return null;
  return price - totalCostAt(breakdown, price);
}

/**
 * Margem em % sobre o preço de venda — de cada R$100 vendidos, quanto sobra.
 * É a leitura que interessa para decidir preço; markup é outra conta.
 */
export function marginAt(breakdown: CostBreakdown, price: number | null) {
  const profit = profitAt(breakdown, price);
  if (profit === null || price === null || price <= 0) return null;
  return (profit / price) * 100;
}

/**
 * O preço que entrega a margem desejada, já embutindo as taxas percentuais:
 *
 *   preço = fixo ÷ (1 − margem − taxas)
 *
 * Null quando a conta não fecha — margem de 70% com 35% de taxas não existe em
 * preço nenhum, e devolver um número gigante aqui seria pior que não responder.
 */
export function suggestedPrice(breakdown: CostBreakdown, targetMargin: number) {
  const denominator = 1 - targetMargin / 100 - breakdown.percentRate;
  if (denominator <= 0.01) return null;
  return breakdown.fixed / denominator;
}

/** Arredonda para cima terminando em ,90 — R$53,21 vira R$53,90. */
export function charmPrice(value: number) {
  const base = Math.floor(value);
  return value <= base + 0.9 ? base + 0.9 : base + 1.9;
}

/** Preço da peça: o próprio, se ela tem; senão o padrão do produto base. */
export function effectivePrice(
  itemPrice: number | null | undefined,
  basePrice: number | null | undefined,
) {
  return itemPrice ?? basePrice ?? null;
}

/** Verde acima da margem desejada, âmbar abaixo dela, vermelho no prejuízo. */
export function marginTone(margin: number | null, target: number) {
  if (margin === null) return "text-text-secondary";
  if (margin < 0) return "text-red-600";
  if (margin < target) return "text-amber-600";
  return "text-emerald-600";
}

/** "1h30" / "45min" — o tempo de produção somado de uma coleção. */
export function formatMinutes(minutes: number) {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (!hours) return `${rest}min`;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}
