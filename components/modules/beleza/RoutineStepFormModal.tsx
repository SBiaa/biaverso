"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { ProductOption, RoutineStepView } from "@/lib/beleza-shared";
import { Field, Modal, fieldClass } from "./shared";

export function RoutineStepFormModal({
  routineId,
  step,
  products,
  onClose,
}: {
  routineId: string;
  /** Ausente = adicionando um passo novo. */
  step?: RoutineStepView;
  products: ProductOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: step?.title ?? "",
    notes: step?.notes ?? "",
    productId: step?.productId ?? "",
  });

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      title: form.title,
      notes: form.notes || null,
      productId: form.productId || null,
    };

    try {
      if (step) {
        await api.patch(`/api/beauty/routines/${routineId}/steps/${step.id}`, body);
      } else {
        await api.post(`/api/beauty/routines/${routineId}/steps`, body);
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={step ? "Editar passo" : "Novo passo"} onClose={onClose}>
      <Field label="Título">
        <input
          placeholder="Limpeza"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          className={fieldClass}
        />
      </Field>

      <Field label="Produto (opcional)">
        <select
          value={form.productId}
          onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
          className={fieldClass}
        >
          <option value="">Nenhum</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.brand ? `${product.name} · ${product.brand}` : product.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notas (opcional)">
        <input
          placeholder="Massagear por 30 segundos"
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          className={fieldClass}
        />
      </Field>

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
