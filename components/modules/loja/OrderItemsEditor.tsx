"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button, IconButton, Modal } from "@/components/ui";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import {
  buildCostBreakdown,
  hasCostData,
  marginTone,
  totalCostAt,
  type CostItemInput,
} from "@/lib/produtos";

/** Uma opção do seletor: peça de coleção ou produto do catálogo. */
export type OrderPickOption = {
  key: string;
  label: string;
  sublabel: string;
  unitPrice: number | null;
  costItems: CostItemInput[];
  /** Custo extra da peça da coleção (arte exclusiva, tag). */
  extraCost: number;
  productId: string;
  collectionProductId: string | null;
  /** Da coleção escolhida no pedido — essas aparecem primeiro. */
  collectionId: string | null;
};

export type OrderItemDraft = {
  key: string;
  name: string;
  quantity: string;
  unitPrice: string;
  /** Só usado quando a linha NÃO está ligada ao catálogo. */
  unitCost: string;
  productId: string | null;
  collectionProductId: string | null;
  /**
   * Composição de custo da base, quando a linha acabou de sair do catálogo.
   * Com ela o custo acompanha o preço digitado (as taxas são % da venda).
   * Nula numa linha carregada de um pedido salvo: ali o custo é o do dia,
   * congelado, e recalcular apagaria o histórico.
   */
  costItems: CostItemInput[] | null;
  extraCost: number;
};

let counter = 0;
const nextKey = () => `draft-${counter++}`;

export function emptyItemDraft(): OrderItemDraft {
  return {
    key: nextKey(),
    name: "",
    quantity: "1",
    unitPrice: "",
    unitCost: "",
    productId: null,
    collectionProductId: null,
    costItems: null,
    extraCost: 0,
  };
}

export function draftFromOption(option: OrderPickOption): OrderItemDraft {
  return {
    key: nextKey(),
    name: option.label,
    quantity: "1",
    unitPrice: option.unitPrice === null ? "" : String(option.unitPrice),
    unitCost: "",
    productId: option.productId,
    collectionProductId: option.collectionProductId,
    costItems: option.costItems,
    extraCost: option.extraCost,
  };
}

export function draftFromSaved(item: {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  productId: string | null;
  collectionProductId: string | null;
}): OrderItemDraft {
  return {
    key: item.id,
    name: item.name,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    unitCost: String(item.unitCost),
    productId: item.productId,
    collectionProductId: item.collectionProductId,
    costItems: null,
    extraCost: 0,
  };
}

/** Preço, custo e quantidade já resolvidos de uma linha. */
export function resolveDraft(draft: OrderItemDraft, hourlyRate: number | null) {
  const quantity = Math.max(1, Number(draft.quantity) || 0);
  const unitPrice = Number(draft.unitPrice) || 0;

  if (draft.costItems) {
    const breakdown = buildCostBreakdown(draft.costItems, {
      hourlyRate,
      extra: draft.extraCost,
    });
    return {
      quantity,
      unitPrice,
      unitCost: totalCostAt(breakdown, unitPrice),
      known: hasCostData(draft.costItems, draft.extraCost),
    };
  }

  return {
    quantity,
    unitPrice,
    unitCost: Number(draft.unitCost) || 0,
    known: draft.unitCost !== "",
  };
}

export function draftTotals(drafts: OrderItemDraft[], hourlyRate: number | null) {
  return drafts.reduce(
    (acc, draft) => {
      const { quantity, unitPrice, unitCost } = resolveDraft(draft, hourlyRate);
      acc.total += quantity * unitPrice;
      acc.cost += quantity * unitCost;
      return acc;
    },
    { total: 0, cost: 0 },
  );
}

const field =
  "rounded-md border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function Picker({
  options,
  collectionId,
  onPick,
  onClose,
}: {
  options: OrderPickOption[];
  collectionId: string;
  onPick: (option: OrderPickOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = options.filter((o) =>
      term ? `${o.label} ${o.sublabel}`.toLowerCase().includes(term) : true,
    );
    // As peças da coleção escolhida no pedido vêm primeiro: num pedido de uma
    // coleção, é quase sempre delas que a pessoa está falando.
    return [
      {
        title: "Peças desta coleção",
        items: collectionId
          ? matches.filter((o) => o.collectionId === collectionId)
          : [],
      },
      { title: "Catálogo", items: matches.filter((o) => o.collectionId === null) },
      {
        title: "Outras coleções",
        items: matches.filter(
          (o) => o.collectionId !== null && o.collectionId !== collectionId,
        ),
      },
    ].filter((group) => group.items.length > 0);
  }, [options, query, collectionId]);

  return (
    <Modal
      title={"Adicionar item"}
      size="md"
      onClose={onClose}
    >

      <div className="flex items-center gap-2 rounded-md border border-border px-3">
        <Search size={14} className="shrink-0 text-text-secondary" />
        <input
          autoFocus
          placeholder="Buscar produto ou peça..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full py-1.5 text-sm outline-none"
        />
      </div>

      <div className="-mx-1 flex flex-col gap-3 overflow-y-auto px-1">
        {groups.length === 0 ? (
          <p className="py-4 text-sm text-text-secondary">Nada encontrado.</p>
        ) : (
          groups.map((group) => (
            <div key={group.title} className="flex flex-col">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary/70">
                {group.title}
              </p>
              {group.items.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onPick(option)}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-hover"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">
                      {option.label}
                    </span>
                    <span className="block truncate text-xs text-text-secondary">
                      {option.sublabel}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-text-secondary">
                    {option.unitPrice === null
                      ? "—"
                      : formatCurrencyBRL(option.unitPrice)}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export function OrderItemsEditor({
  drafts,
  setDrafts,
  options,
  collectionId,
  hourlyRate,
  targetMargin,
}: {
  drafts: OrderItemDraft[];
  setDrafts: (next: OrderItemDraft[]) => void;
  options: OrderPickOption[];
  collectionId: string;
  hourlyRate: number | null;
  targetMargin: number;
}) {
  const [picking, setPicking] = useState(false);

  function patch(key: string, changes: Partial<OrderItemDraft>) {
    setDrafts(drafts.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  }

  const totals = draftTotals(drafts, hourlyRate);
  const profit = totals.total - totals.cost;
  const margin = totals.total > 0 ? (profit / totals.total) * 100 : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">Itens do pedido</p>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            onClick={() => setPicking(true)}
            className="px-2 py-1 text-xs"
          >
            <Plus size={13} />
            Do catálogo
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDrafts([...drafts, emptyItemDraft()])}
            className="px-2 py-1 text-xs"
          >
            Item avulso
          </Button>
        </div>
      </div>

      {drafts.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-text-secondary">
          Nenhum item ainda. Puxe do catálogo para o total e o lucro saírem
          sozinhos.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {drafts.map((draft) => {
            const { quantity, unitPrice, unitCost, known } = resolveDraft(
              draft,
              hourlyRate,
            );
            const lineTotal = quantity * unitPrice;
            const lineMargin =
              known && unitPrice > 0 ? ((unitPrice - unitCost) / unitPrice) * 100 : null;

            return (
              <li key={draft.key} className="flex flex-wrap items-center gap-1.5">
                <input
                  placeholder="Item"
                  value={draft.name}
                  onChange={(e) => patch(draft.key, { name: e.target.value })}
                  className={`${field} min-w-0 flex-1`}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.quantity}
                  onChange={(e) => patch(draft.key, { quantity: e.target.value })}
                  className={`${field} w-14`}
                  aria-label="Quantidade"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Preço"
                  value={draft.unitPrice}
                  onChange={(e) => patch(draft.key, { unitPrice: e.target.value })}
                  className={`${field} w-24`}
                  aria-label="Preço unitário"
                />
                {draft.costItems ? (
                  <span
                    className="w-24 text-right text-xs text-text-secondary"
                    title="Custo calculado pela composição do produto"
                  >
                    custo {formatCurrencyBRL(unitCost)}
                  </span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Custo"
                    value={draft.unitCost}
                    onChange={(e) => patch(draft.key, { unitCost: e.target.value })}
                    className={`${field} w-24`}
                    aria-label="Custo unitário"
                  />
                )}
                <span className="w-20 text-right text-sm text-text-primary">
                  {formatCurrencyBRL(lineTotal)}
                </span>
                <span
                  className={cn(
                    "w-10 text-right text-xs font-medium",
                    marginTone(lineMargin, targetMargin),
                  )}
                >
                  {lineMargin === null ? "—" : `${lineMargin.toFixed(0)}%`}
                </span>
                <IconButton
                  onClick={() => setDrafts(drafts.filter((d) => d.key !== draft.key))}
                  aria-label={`Remover ${draft.name || "item"}`}
                  tone="danger"
                  className="hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-hover px-3 py-2 text-sm">
        <span className="font-medium text-text-primary">
          Total {formatCurrencyBRL(totals.total)}
        </span>
        <span className="text-text-secondary">Custo {formatCurrencyBRL(totals.cost)}</span>
        <span className={cn("font-medium", marginTone(margin, targetMargin))}>
          Lucro {formatCurrencyBRL(profit)}
          {margin !== null && ` · ${margin.toFixed(0)}%`}
        </span>
      </div>

      {picking && (
        <Picker
          options={options}
          collectionId={collectionId}
          onClose={() => setPicking(false)}
          onPick={(option) => {
            setPicking(false);
            setDrafts([...drafts, draftFromOption(option)]);
          }}
        />
      )}
    </div>
  );
}
