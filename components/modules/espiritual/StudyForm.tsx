"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateBR, parseDateOnly, todayInputValue } from "@/lib/utils";
import {
  covenMeetingKindLabels,
  studyKindLabels,
  studyStatusLabels,
  type MeetingOption,
  type StudyView,
} from "@/lib/espiritual-shared";
import { Field, FieldRow, FormCard, LabelSelect, inputClass } from "./form-kit";

function emptyForm() {
  return {
    title: "",
    kind: "EXERCICIO",
    status: "A_FAZER",
    receivedAt: todayInputValue(),
    dueDate: "",
    meetingId: "",
    link: "",
    content: "",
    notes: "",
  };
}

function formFrom(study: StudyView) {
  return {
    title: study.title,
    kind: study.kind,
    status: study.status,
    receivedAt: study.receivedAt ?? "",
    dueDate: study.dueDate ?? "",
    meetingId: study.meetingId ?? "",
    link: study.link ?? "",
    content: study.content ?? "",
    notes: study.notes ?? "",
  };
}

export function StudyForm({
  study,
  meetings,
  onClose,
}: {
  study?: StudyView;
  meetings: MeetingOption[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!study;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(study ? formFrom(study) : emptyForm());

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

    const payload = {
      ...form,
      // Campo de data vazio é "sem prazo", não string vazia — o schema recusaria.
      receivedAt: form.receivedAt || null,
      dueDate: form.dueDate || null,
      meetingId: form.meetingId || null,
    };

    try {
      if (isEdit) await api.patch(`/api/spiritual-studies/${study.id}`, payload);
      else await api.post("/api/spiritual-studies", payload);
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
    return <Button onClick={() => setOpen(true)}>+ Novo texto ou exercício</Button>;
  }

  return (
    <FormCard
      title={isEdit ? "Editar" : "Novo texto ou exercício"}
      error={error}
      saving={saving}
      canSave={form.title.trim().length > 0}
      onSubmit={handleSubmit}
      onCancel={cancel}
    >
      <Field label="Título">
        <input
          autoFocus={!isEdit}
          placeholder="Exercício de enraizamento"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className={inputClass}
        />
      </Field>

      <FieldRow>
        <Field label="Tipo">
          <LabelSelect
            value={form.kind}
            labels={studyKindLabels}
            onChange={(v) => update("kind", v)}
          />
        </Field>
        <Field label="Como está">
          <LabelSelect
            value={form.status}
            labels={studyStatusLabels}
            onChange={(v) => update("status", v)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Recebido em">
          <input
            type="date"
            value={form.receivedAt}
            onChange={(e) => update("receivedAt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Entrega final" hint="Deixe vazio se não tem prazo.">
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <Field label="Veio de qual encontro">
        <select
          value={form.meetingId}
          onChange={(e) => update("meetingId", e.target.value)}
          className={inputClass}
        >
          <option value="">Nenhum</option>
          {meetings.map((meeting) => {
            const date = parseDateOnly(meeting.date);
            return (
              <option key={meeting.id} value={meeting.id}>
                {date ? `${formatDateBR(date)} · ` : ""}
                {meeting.title} (
                {covenMeetingKindLabels[meeting.kind] ?? meeting.kind})
              </option>
            );
          })}
        </select>
      </Field>

      <Field label="O material" hint="O texto em si, ou o enunciado do exercício.">
        <textarea
          rows={4}
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Suas anotações">
        <textarea
          rows={4}
          placeholder="O que você entendeu, a sua resposta, o que praticou"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Link">
        <input
          placeholder="https://"
          value={form.link}
          onChange={(e) => update("link", e.target.value)}
          className={inputClass}
        />
      </Field>
    </FormCard>
  );
}
