"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { parseDateOnly, todayInputValue } from "@/lib/utils";
import {
  moonPhaseLabels,
  moonPhaseOfDay,
  ritualKindLabels,
  type RitualView,
} from "@/lib/espiritual-shared";
import { Field, FieldRow, FormCard, LabelSelect, inputClass } from "./form-kit";

function emptyForm() {
  return {
    title: "",
    kind: "RITUAL",
    date: todayInputValue(),
    intention: "",
    elements: "",
    notes: "",
    outcome: "",
  };
}

function formFrom(ritual: RitualView) {
  return {
    title: ritual.title,
    kind: ritual.kind,
    date: ritual.date,
    intention: ritual.intention ?? "",
    elements: ritual.elements ?? "",
    notes: ritual.notes ?? "",
    outcome: ritual.outcome ?? "",
  };
}

export function RitualForm({
  ritual,
  onClose,
}: {
  ritual?: RitualView;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!ritual;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(ritual ? formFrom(ritual) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancel() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (isEdit) await api.patch(`/api/rituals/${ritual.id}`, form);
      else await api.post("/api/rituals", form);
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
    notify("Registrado.");
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo registro</Button>;
  }

  // A lua do dia escolhido, mostrada enquanto ela digita: é a informação que
  // dá contexto ao registro, e ninguém lembra de cabeça a fase de uma data.
  const chosen = parseDateOnly(form.date);
  const moon = chosen ? moonPhaseOfDay(chosen) : null;

  return (
    <FormCard
      title={isEdit ? "Editar registro" : "Novo registro"}
      error={error}
      saving={saving}
      canSave={form.title.trim().length > 0}
      onSubmit={handleSubmit}
      onCancel={cancel}
    >
      <Field label="O que foi">
        <input
          autoFocus={!isEdit}
          placeholder="Banho de descarrego"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className={inputClass}
        />
      </Field>

      <FieldRow>
        <Field label="Tipo">
          <LabelSelect
            value={form.kind}
            labels={ritualKindLabels}
            onChange={(v) => update("kind", v)}
          />
        </Field>
        <Field
          label="Quando"
          hint={moon ? `Lua ${moonPhaseLabels[moon.phase].toLowerCase()}` : undefined}
        >
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <Field label="Intenção" hint="Para que foi feito.">
        <textarea
          rows={2}
          value={form.intention}
          onChange={(e) => update("intention", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="O que usou" hint="Ervas, velas, cristais, palavras.">
        <textarea
          rows={2}
          value={form.elements}
          onChange={(e) => update("elements", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Como foi">
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        label="O que veio depois"
        hint="Pode ficar vazio agora e ser preenchido semanas mais tarde."
      >
        <textarea
          rows={2}
          value={form.outcome}
          onChange={(e) => update("outcome", e.target.value)}
          className={inputClass}
        />
      </Field>
    </FormCard>
  );
}
