"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { eventCategoryLabels } from "@/lib/labels";
import { todayInputValue } from "@/lib/utils";
import type { AgendaEvent } from "@/lib/agenda-shared";

const categoryOptions = Object.keys(eventCategoryLabels);

const inputClass =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function emptyForm() {
  return {
    title: "",
    date: todayInputValue(),
    allDay: false,
    time: "",
    endTime: "",
    category: "PESSOAL",
    description: "",
  };
}

function formFromEvent(event: AgendaEvent) {
  return {
    title: event.title,
    date: event.date,
    allDay: event.allDay,
    time: event.time ?? "",
    endTime: event.endTime ?? "",
    category: event.category,
    description: event.description ?? "",
  };
}

export function EventForm({
  event,
  onClose,
}: {
  event?: AgendaEvent;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!event;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(event ? formFromEvent(event) : emptyForm());

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
    try {
      await fetch(isEdit ? `/api/events/${event.id}` : "/api/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          date: form.date,
          allDay: form.allDay,
          time: form.allDay ? null : form.time || null,
          endTime: form.allDay ? null : form.endTime || null,
          category: form.category,
        }),
      });
    } finally {
      setSaving(false);
    }

    setOpen(false);
    if (!isEdit) setForm(emptyForm());
    onClose?.();
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo evento</Button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <input
        placeholder="Título do evento"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
          className={inputClass}
        />
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className={inputClass}
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {eventCategoryLabels[c]}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={form.allDay}
          onChange={(e) => update("allDay", e.target.checked)}
        />
        Dia inteiro
      </label>

      {!form.allDay && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="time"
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
            className={inputClass}
          />
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <textarea
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        rows={2}
        className={inputClass}
      />

      <div className="flex items-center gap-2">
        <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="secondary" onClick={cancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
