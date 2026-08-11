"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatCurrencyBRL } from "@/lib/utils";

export type PriceItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
};

const emptyForm = { name: "", description: "", price: "", unit: "" };

export function ProjectPriceTable({
  projectId,
  initialItems,
}: {
  projectId: string;
  initialItems: PriceItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  async function add() {
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<PriceItem>(`/api/projects/${projectId}/prices`, {
        name: form.name,
        description: form.description || null,
        // O input é texto: a vírgula do teclado brasileiro viraria NaN.
        price: form.price.replace(",", "."),
        unit: form.unit || null,
      });
      setItems((prev) => [...prev, created]);
      setForm(emptyForm);
      setAdding(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const previous = items;
    setError(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.delete(`/api/projects/${projectId}/prices/${id}`);
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !adding ? (
        <p className="text-sm text-text-secondary">Nenhum item de preço ainda.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-text-secondary">
                <th scope="col" className="pb-2 pr-3 font-medium">
                  Item
                </th>
                <th scope="col" className="pb-2 pr-3 font-medium">
                  Unidade
                </th>
                <th scope="col" className="pb-2 pr-3 text-right font-medium">
                  Preço
                </th>
                <th scope="col" className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3">
                    <span className="text-text-primary">{item.name}</span>
                    {item.description && (
                      <span className="block text-xs text-text-secondary">
                        {item.description}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-text-secondary">{item.unit ?? "—"}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap text-text-primary">
                    {formatCurrencyBRL(item.price)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Remover ${item.name}`}
                      className="rounded-md p-1 text-text-secondary hover:bg-black/[0.03] hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="pt-2 pr-3 text-sm font-semibold text-text-primary" colSpan={2}>
                  Total
                </td>
                <td className="pt-2 pr-3 text-right text-sm font-semibold whitespace-nowrap text-text-primary">
                  {formatCurrencyBRL(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do item"
              className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Unidade (ex: por post, mensal)"
              className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            inputMode="decimal"
            placeholder="Preço (ex: 250,00)"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={add}
              disabled={saving || !form.name.trim() || !form.price.trim()}
            >
              Adicionar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setAdding(true)}
          className="self-start"
        >
          <Plus size={14} />
          Adicionar item
        </Button>
      )}

      <ErrorNote message={error} />
    </div>
  );
}
