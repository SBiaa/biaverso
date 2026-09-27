"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { todayInputValue } from "@/lib/utils";
import {
  divinationMethodLabels,
  type DivinationView,
} from "@/lib/espiritual-shared";
import { Field, FieldRow, FormCard, LabelSelect, inputClass } from "./form-kit";

function emptyForm() {
  return {
    date: todayInputValue(),
    method: "TAROT",
    deck: "",
    question: "",
    spread: "",
    // Uma carta por linha: é como se anota tiragem no papel, e evita brigar
    // com vírgula em nome de carta ("Dois de Copas, invertida").
    cards: "",
    reading: "",
    outcome: "",
  };
}

function formFrom(divination: DivinationView) {
  return {
    date: divination.date,
    method: divination.method,
    deck: divination.deck ?? "",
    question: divination.question ?? "",
    spread: divination.spread ?? "",
    cards: divination.cards.join("\n"),
    reading: divination.reading ?? "",
    outcome: divination.outcome ?? "",
  };
}

export function DivinationForm({
  divination,
  onClose,
}: {
  divination?: DivinationView;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!divination;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(divination ? formFrom(divination) : emptyForm());

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancel() {
    setOpen(false);
    onClose?.();
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      cards: form.cards
        .split("\n")
        .map((card) => card.trim())
        .filter(Boolean),
    };

    try {
      if (isEdit) await api.patch(`/api/divinations/${divination.id}`, payload);
      else await api.post("/api/divinations", payload);
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
    notify("Tiragem salva.");
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Nova tiragem</Button>;
  }

  return (
    <FormCard
      title={isEdit ? "Editar tiragem" : "Nova tiragem"}
      error={error}
      saving={saving}
      onSubmit={handleSubmit}
      onCancel={cancel}
    >
      <FieldRow>
        <Field label="Quando">
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Método">
          <LabelSelect
            value={form.method}
            labels={divinationMethodLabels}
            onChange={(v) => update("method", v)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Baralho ou oráculo">
          <input
            placeholder="Rider-Waite"
            value={form.deck}
            onChange={(e) => update("deck", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Tiragem">
          <input
            placeholder="Três cartas, cruz celta..."
            value={form.spread}
            onChange={(e) => update("spread", e.target.value)}
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <Field label="Pergunta">
        <textarea
          rows={2}
          value={form.question}
          onChange={(e) => update("question", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Cartas" hint="Uma por linha, na ordem em que saíram.">
        <textarea
          rows={4}
          placeholder={"A Lua\nSeis de Espadas (invertida)\nO Sol"}
          value={form.cards}
          onChange={(e) => update("cards", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Leitura">
        <textarea
          rows={4}
          value={form.reading}
          onChange={(e) => update("reading", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        label="O que se confirmou"
        hint="Para voltar aqui depois e ver o que a tiragem acertou."
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
