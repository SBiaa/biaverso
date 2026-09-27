"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  altarCategoryLabels,
  type AltarItemView,
} from "@/lib/espiritual-shared";
import { Field, FieldRow, FormCard, LabelSelect, inputClass } from "./form-kit";

function emptyForm() {
  return {
    name: "",
    category: "ERVA",
    quantity: "",
    properties: "",
    notes: "",
  };
}

function formFrom(item: AltarItemView) {
  return {
    name: item.name,
    category: item.category,
    quantity: item.quantity ?? "",
    properties: item.properties ?? "",
    notes: item.notes ?? "",
  };
}

export function AltarForm({
  item,
  onClose,
}: {
  item?: AltarItemView;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!item;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(item ? formFrom(item) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancel() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (isEdit) await api.patch(`/api/altar-items/${item.id}`, form);
      else await api.post("/api/altar-items", form);
    } catch (e) {
      setError(errorMessage(e));
      return;
    } finally {
      setSaving(false);
    }

    setOpen(false);
    if (!isEdit) setForm(emptyForm());
    onClose?.();
    router.refresh();
    notify("Salvo.");
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo item</Button>;
  }

  return (
    <FormCard
      title={isEdit ? "Editar item" : "Novo item do altar"}
      error={error}
      saving={saving}
      canSave={form.name.trim().length > 0}
      onSubmit={handleSubmit}
      onCancel={cancel}
    >
      <FieldRow>
        <Field label="O que é">
          <input
            autoFocus={!isEdit}
            placeholder="Arruda"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Categoria">
          <LabelSelect
            value={form.category}
            labels={altarCategoryLabels}
            onChange={(v) => update("category", v)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Quanto tem" hint="Do jeito que você mede: meio pote, 3 velas.">
          <input
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Para que serve">
          <input
            placeholder="Proteção, limpeza, prosperidade"
            value={form.properties}
            onChange={(e) => update("properties", e.target.value)}
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <Field label="Notas">
        <textarea
          rows={2}
          placeholder="Onde comprou, como usa, o que já fez com isso"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={inputClass}
        />
      </Field>
    </FormCard>
  );
}
