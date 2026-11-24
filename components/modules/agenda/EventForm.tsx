"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, confirmAction, Modal, notify, fieldClass } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { eventCategoryLabels } from "@/lib/labels";
import type { AgendaEvent } from "@/lib/agenda-shared";

const categoryOptions = Object.keys(eventCategoryLabels);

function emptyForm(date: string) {
  return {
    title: "",
    date,
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

/**
 * Criar ou editar um evento.
 *
 * Era um formulário aberto no meio da lista, atrás de um botão da largura da
 * tela. Num modal ele funciona igual vindo de qualquer lugar: do botão do topo,
 * do "+" de um dia da semana ou de um clique no evento do mês.
 */
export function EventFormModal({
  event,
  defaultDate,
  onClose,
}: {
  event?: AgendaEvent;
  /** Dia já preenchido ao criar — o dia em que o "+" foi clicado. */
  defaultDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!event;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(event ? formFromEvent(event) : emptyForm(defaultDate));

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim() || saving) return;

    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      description: form.description,
      date: form.date,
      allDay: form.allDay,
      time: form.allDay ? null : form.time || null,
      endTime: form.allDay ? null : form.endTime || null,
      category: form.category,
    };

    try {
      if (isEdit) await api.patch(`/api/events/${event.id}`, payload);
      else await api.post("/api/events", payload);
    } catch (e) {
      // O modal fica aberto com o que foi digitado, para não perder o texto.
      setError(errorMessage(e));
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
    router.refresh();
    notify("Salvo.");
  }

  async function handleDelete() {
    if (!event) return;
    const confirmed = await confirmAction({
      title: `Excluir "${event.title}"?`,
      destructive: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/api/events/${event.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
      return;
    }

    setDeleting(false);
    onClose();
    router.refresh();
    notify("Excluído.");
  }

  const busy = saving || deleting;

  return (
    <Modal
      title={isEdit ? "Editar evento" : "Novo evento"}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="md"
    >
      <input
        placeholder="Título do evento"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        className={fieldClass}
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
          className={fieldClass}
          aria-label="Data"
        />
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className={fieldClass}
          aria-label="Categoria"
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
            className={fieldClass}
            aria-label="Início"
          />
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            className={fieldClass}
            aria-label="Fim"
          />
        </div>
      )}

      <textarea
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        rows={3}
        className={fieldClass}
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy || !form.title.trim()}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        {isEdit && (
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto text-danger"
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
