"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { ProductCostKind, ProductCostMode } from "@/app/generated/prisma/client";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { productCostKindLabels, productCostModeLabels } from "@/lib/labels";
import { formatCurrencyBRL } from "@/lib/utils";
import { fixedValueOf, formatMinutes, materialUnitCost } from "@/lib/produtos";

export type MaterialOption = {
  id: string;
  name: string;
  unit: string | null;
  packPrice: number;
  packQuantity: number;
};

export type CostItemRecord = {
  id: string;
  label: string;
  kind: ProductCostKind;
  mode: ProductCostMode;
  amount: number;
  materialId: string | null;
  material: { packPrice: number; packQuantity: number } | null;
};

const KINDS = Object.keys(productCostKindLabels) as ProductCostKind[];
const MODES = Object.keys(productCostModeLabels) as ProductCostMode[];

const field =
  "rounded-md border border-border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

/** O sufixo do campo de valor muda com o modo — R$, %, min ou a unidade do insumo. */
function unitOf(mode: ProductCostMode, material?: MaterialOption) {
  if (mode === "PERCENTUAL") return "%";
  if (mode === "TEMPO") return "min";
  if (mode === "INSUMO") return material?.unit || "un";
  return "R$";
}

/** Como cada linha aparece na coluna da direita, já convertida. */
function describe(item: CostItemRecord, hourlyRate: number | null) {
  if (item.mode === "PERCENTUAL") return `${item.amount}% do preço`;
  if (item.mode === "TEMPO") {
    const value = fixedValueOf(item, hourlyRate);
    return hourlyRate
      ? `${formatMinutes(item.amount)} · ${formatCurrencyBRL(value)}`
      : `${formatMinutes(item.amount)} · sem valor/hora`;
  }
  if (item.mode === "INSUMO") {
    if (!item.material) return "escolha o insumo";
    return `${formatCurrencyBRL(materialUnitCost(item.material))}/un · ${formatCurrencyBRL(
      fixedValueOf(item, hourlyRate),
    )}`;
  }
  return formatCurrencyBRL(item.amount);
}

function emptyDraft() {
  return {
    label: "",
    kind: "MATERIAL" as ProductCostKind,
    mode: "FIXO" as ProductCostMode,
    amount: "",
    materialId: "",
  };
}

export function ProductCostEditor({
  productId,
  items,
  hourlyRate,
  materials,
}: {
  productId: string;
  items: CostItemRecord[];
  hourlyRate: number | null;
  materials: MaterialOption[];
}) {
  const router = useRouter();
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const [draft, setDraft] = useState(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!draft.label.trim() || draft.amount === "") return;
    if (draft.mode === "INSUMO" && !draft.materialId) return;
    setAdding(true);
    setError(null);

    try {
      await api.post(`/api/products/${productId}/cost-items`, {
        ...draft,
        materialId: draft.materialId || null,
      });
      setDraft(emptyDraft());
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function handlePatch(id: string, patch: Partial<CostItemRecord>) {
    setBusyId(id);
    setError(null);

    try {
      await api.patch(`/api/products/${productId}/cost-items/${id}`, patch);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta linha de custo?")) return;
    setBusyId(id);
    setError(null);

    try {
      await api.delete(`/api/products/${productId}/cost-items/${id}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Composição do custo</h2>
        <p className="text-xs text-text-secondary">
          Uma linha por gasto. Use % para o que muda junto com o preço — taxa de
          maquininha, comissão de marketplace, imposto.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nenhum custo cadastrado. Sem isso o app não consegue calcular margem.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 py-2 first:pt-0"
              data-busy={busyId === item.id || undefined}
            >
              {item.mode === "INSUMO" ? (
                <select
                  value={item.materialId ?? ""}
                  onChange={(e) => {
                    const material = materialById.get(e.target.value);
                    // O nome vem junto: a linha continua legível se o insumo for
                    // renomeado ou tirado da composição depois.
                    handlePatch(item.id, {
                      materialId: e.target.value || null,
                      label: material?.name ?? item.label,
                    });
                  }}
                  className={`${field} min-w-0 flex-1`}
                >
                  <option value="">Escolher insumo...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {formatCurrencyBRL(materialUnitCost(m))}/
                      {m.unit || "un"}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  defaultValue={item.label}
                  onBlur={(e) => {
                    const label = e.target.value.trim();
                    if (label && label !== item.label) handlePatch(item.id, { label });
                  }}
                  className={`${field} min-w-0 flex-1`}
                />
              )}
              <select
                value={item.kind}
                onChange={(e) =>
                  handlePatch(item.id, { kind: e.target.value as ProductCostKind })
                }
                className={field}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {productCostKindLabels[k]}
                  </option>
                ))}
              </select>
              <select
                value={item.mode}
                onChange={(e) => {
                  const mode = e.target.value as ProductCostMode;
                  // Sair do modo insumo solta o vínculo: o valor volta a ser
                  // digitado à mão e o insumo deixa de puxar essa linha.
                  handlePatch(item.id, {
                    mode,
                    ...(mode === "INSUMO" ? {} : { materialId: null }),
                  });
                }}
                className={field}
              >
                {MODES.map((m) => (
                  // Sem insumo nenhum cadastrado, o modo não tem o que oferecer.
                  <option key={m} value={m} disabled={m === "INSUMO" && !materials.length}>
                    {productCostModeLabels[m]}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step={item.mode === "TEMPO" ? "1" : "0.01"}
                  defaultValue={item.amount}
                  onBlur={(e) => {
                    const amount = Number(e.target.value);
                    if (e.target.value !== "" && amount !== item.amount) {
                      handlePatch(item.id, { amount });
                    }
                  }}
                  className={`${field} w-24`}
                />
                <span className="w-10 text-xs text-text-secondary">
                  {unitOf(item.mode, materialById.get(item.materialId ?? ""))}
                </span>
              </div>
              <span className="w-40 text-right text-sm text-text-primary">
                {describe(item, hourlyRate)}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="rounded-md p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600"
                aria-label={`Remover ${item.label}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-2">
        {draft.mode === "INSUMO" ? (
          <select
            value={draft.materialId}
            onChange={(e) => {
              const material = materialById.get(e.target.value);
              setDraft((d) => ({
                ...d,
                materialId: e.target.value,
                label: material?.name ?? d.label,
              }));
            }}
            className={`${field} min-w-0 flex-1`}
          >
            <option value="">Escolher insumo...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {formatCurrencyBRL(materialUnitCost(m))}/{m.unit || "un"}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder="Ex.: Caneca branca, Sublimação, Caixa kraft"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            className={`${field} min-w-0 flex-1`}
          />
        )}
        <select
          value={draft.kind}
          onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as ProductCostKind }))}
          className={field}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {productCostKindLabels[k]}
            </option>
          ))}
        </select>
        <select
          value={draft.mode}
          onChange={(e) =>
            setDraft((d) => ({ ...d, mode: e.target.value as ProductCostMode }))
          }
          className={field}
        >
          {MODES.map((m) => (
            <option key={m} value={m} disabled={m === "INSUMO" && !materials.length}>
              {productCostModeLabels[m]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            step={draft.mode === "TEMPO" ? "1" : "0.01"}
            value={draft.amount}
            onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className={`${field} w-24`}
          />
          <span className="w-10 text-xs text-text-secondary">
            {unitOf(draft.mode, materialById.get(draft.materialId))}
          </span>
        </div>
        <Button variant="secondary" onClick={handleAdd} disabled={adding}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      <ErrorNote message={error} />
    </Card>
  );
}
