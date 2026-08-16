"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import type { ProductOption, ScheduleStepView } from "@/lib/beleza-shared";
import { Field, Modal, fieldClass } from "./shared";

export function ScheduleStepFormModal({
  scheduleId,
  step,
  products,
  onClose,
}: {
  scheduleId: string;
  /** Ausente = adicionando uma etapa nova. */
  step?: ScheduleStepView;
  products: ProductOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: step?.title ?? "",
    description: step?.description ?? "",
    intervalDays: String(step?.intervalDays ?? 7),
    productId: step?.productId ?? "",
  });

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      title: form.title,
      description: form.description || null,
      intervalDays: Number(form.intervalDays) || 7,
      productId: form.productId || null,
    };

    try {
      if (step) {
        await api.patch(`/api/beauty/schedules/${scheduleId}/steps/${step.id}`, body);
      } else {
        await api.post(`/api/beauty/schedules/${scheduleId}/steps`, body);
      }
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={step ? "Editar etapa" : "Nova etapa"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Título">
      <input
        placeholder="Hidratação"
        value={form.title}
        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <Field label="Intervalo em dias">
      <input
        type="number"
        min="1"
        max="365"
        value={form.intervalDays}
        onChange={(e) => setForm((prev) => ({ ...prev, intervalDays: e.target.value }))}
        className={fieldClass}
      />
      <span className="text-xs text-text-secondary">
        Quantos dias esperar depois desta etapa até a próxima do ciclo.
      </span>
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

      <Field label="Descrição (opcional)">
      <input
        placeholder="Máscara por 20 minutos"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        className={fieldClass}
      />
      </Field>

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
      <Button type="submit" disabled={saving}>
        Salvar
      </Button>
      <Button variant="ghost" onClick={onClose}>
        Cancelar
      </Button>
      </div>
    </Modal>
  );
}
