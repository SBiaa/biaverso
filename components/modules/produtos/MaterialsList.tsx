"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { materialUnitCost } from "@/lib/produtos";

export type MaterialRecord = {
  id: string;
  name: string;
  unit: string | null;
  packPrice: number;
  packQuantity: number;
  supplier: string | null;
  notes: string | null;
  updatedAt: string;
  /** Em quantos produtos este insumo entra na composição de custo. */
  usageCount: number;
};

const field =
  "w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function emptyForm() {
  return {
    name: "",
    unit: "",
    packPrice: "",
    packQuantity: "1",
    supplier: "",
    notes: "",
  };
}

function formFrom(material: MaterialRecord) {
  return {
    name: material.name,
    unit: material.unit ?? "",
    packPrice: String(material.packPrice),
    packQuantity: String(material.packQuantity),
    supplier: material.supplier ?? "",
    notes: material.notes ?? "",
  };
}

function MaterialModal({
  material,
  onClose,
}: {
  material?: MaterialRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!material;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(material ? formFrom(material) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Preview ao vivo: é o número que vai parar na conta de cada produto.
  const price = Number(form.packPrice) || 0;
  const quantity = Number(form.packQuantity) || 0;
  const unitCost = quantity > 0 ? price / quantity : null;

  async function handleSubmit() {
    if (!form.name.trim() || form.packPrice === "" || quantity <= 0) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      unit: form.unit || null,
      packPrice: form.packPrice,
      packQuantity: form.packQuantity,
      supplier: form.supplier || null,
      notes: form.notes || null,
    };

    try {
      if (isEdit) await api.patch(`/api/materials/${material.id}`, payload);
      else await api.post("/api/materials", payload);
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Excluir "${material.name}" da biblioteca?`)) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/materials/${material.id}`);
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {isEdit ? "Editar insumo" : "Novo insumo"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <input
          placeholder="Nome — papel transfer, fita, tinta"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className={field}
        />

        <p className="text-xs text-text-secondary">
          Cadastre como você compra de verdade. O custo por unidade sai da
          divisão.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="mb-1 text-xs text-text-secondary">Preço do pacote</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.packPrice}
              onChange={(e) => update("packPrice", e.target.value)}
              className={field}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-text-secondary">Vem quantos</p>
            <input
              type="number"
              min="0.01"
              step="any"
              value={form.packQuantity}
              onChange={(e) => update("packQuantity", e.target.value)}
              className={field}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-text-secondary">Unidade</p>
            <input
              placeholder="folha"
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
              className={field}
            />
          </div>
        </div>

        <p className="rounded-lg bg-black/[0.02] px-3 py-2 text-sm text-text-primary">
          {unitCost === null ? (
            <span className="text-text-secondary">
              Informe quantas unidades vêm no pacote.
            </span>
          ) : (
            <>
              Custo por unidade: <strong>{formatCurrencyBRL(unitCost)}</strong>
              {form.unit && ` por ${form.unit}`}
            </>
          )}
        </p>

        {isEdit && material.usageCount > 0 && (
          <p className="text-xs text-text-secondary">
            Mudar o preço aqui recalcula a margem de {material.usageCount}{" "}
            {material.usageCount === 1 ? "produto" : "produtos"} na hora. Pedidos
            já fechados não mudam — o custo deles ficou congelado.
          </p>
        )}

        <input
          placeholder="Fornecedor"
          value={form.supplier}
          onChange={(e) => update("supplier", e.target.value)}
          className={field}
        />
        <textarea
          placeholder="Notas — link de compra, prazo de entrega"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          className={field}
        />

        <ErrorNote message={error} />

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={saving}>
              Salvar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
          {isEdit && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:bg-red-50"
            >
              Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MaterialsList({ materials }: { materials: MaterialRecord[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MaterialRecord | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Insumos</h2>
        <Button onClick={() => setCreating(true)}>
          <Plus size={14} />
          Novo insumo
        </Button>
      </div>

      {materials.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">
            Nada aqui ainda. Cadastre o que você compra em pacote e gasta por
            peça — papel transfer, tinta, fita, caixa. Depois, na composição de
            custo de cada produto, escolha o modo &ldquo;insumo da
            biblioteca&rdquo; e diga quanto aquela peça consome.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {materials.map((material) => (
            <Card
              key={material.id}
              onClick={() => setEditing(material)}
              className="flex cursor-pointer flex-col gap-2 transition-colors hover:bg-black/[0.02]"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{material.name}</p>
                <p className="text-xs text-text-secondary">
                  {formatCurrencyBRL(material.packPrice)} · {material.packQuantity}{" "}
                  {material.unit || "un"}
                  {material.supplier && ` · ${material.supplier}`}
                </p>
              </div>

              <p className="text-lg font-semibold text-text-primary">
                {formatCurrencyBRL(materialUnitCost(material))}
                <span className="text-xs font-normal text-text-secondary">
                  {" "}
                  por {material.unit || "unidade"}
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                <span>
                  {material.usageCount === 0
                    ? "Sem produto usando"
                    : `Em ${material.usageCount} ${
                        material.usageCount === 1 ? "produto" : "produtos"
                      }`}
                </span>
                <span>· preço de {formatDateBR(new Date(material.updatedAt))}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {creating && <MaterialModal onClose={() => setCreating(false)} />}
      {editing && (
        <MaterialModal material={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
