"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { todayInputValue } from "@/lib/utils";
import {
  covenMeetingKindLabels,
  type MeetingView,
} from "@/lib/espiritual-shared";
import { Field, FieldRow, FormCard, LabelSelect, inputClass } from "./form-kit";

function emptyForm() {
  return {
    title: "",
    kind: "COVEN",
    date: todayInputValue(),
    time: "",
    endTime: "",
    place: "",
    agenda: "",
    notes: "",
    // "" é "ainda não sei", que é o estado de todo encontro que não chegou.
    attended: "" as "" | "sim" | "nao",
  };
}

function formFrom(meeting: MeetingView) {
  return {
    title: meeting.title,
    kind: meeting.kind,
    date: meeting.date,
    time: meeting.time ?? "",
    endTime: meeting.endTime ?? "",
    place: meeting.place ?? "",
    agenda: meeting.agenda ?? "",
    notes: meeting.notes ?? "",
    attended: meeting.attended === null ? "" : meeting.attended ? "sim" : "nao",
  } as ReturnType<typeof emptyForm>;
}

export function MeetingForm({
  meeting,
  onClose,
}: {
  meeting?: MeetingView;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!meeting;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(meeting ? formFrom(meeting) : emptyForm());

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
      title: form.title,
      kind: form.kind,
      date: form.date,
      time: form.time || null,
      // Hora de fim sem hora de início não quer dizer nada, e o evento espelho
      // vira "dia inteiro" nesse caso.
      endTime: form.time ? form.endTime || null : null,
      place: form.place,
      agenda: form.agenda,
      ...(isEdit
        ? {
            notes: form.notes,
            attended: form.attended === "" ? null : form.attended === "sim",
          }
        : {}),
    };

    try {
      if (isEdit) await api.patch(`/api/coven-meetings/${meeting.id}`, payload);
      else await api.post("/api/coven-meetings", payload);
    } catch (e) {
      // O formulário fica aberto com o que foi digitado, para não perder texto.
      setError(errorMessage(e));
      return;
    } finally {
      setSaving(false);
    }

    setOpen(false);
    if (!isEdit) setForm(emptyForm());
    onClose?.();
    router.refresh();
    notify(isEdit ? "Salvo." : "Encontro marcado — já está na agenda.");
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Novo encontro</Button>;
  }

  return (
    <FormCard
      title={isEdit ? "Editar encontro" : "Novo encontro"}
      error={error}
      saving={saving}
      canSave={form.title.trim().length > 0}
      onSubmit={handleSubmit}
      onCancel={cancel}
    >
      <FieldRow>
        <Field label="O que é">
          <input
            autoFocus={!isEdit}
            placeholder="Encontro de lua cheia"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Tipo">
          <LabelSelect
            value={form.kind}
            labels={covenMeetingKindLabels}
            onChange={(v) => update("kind", v)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Dia">
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Onde">
          <input
            placeholder="Casa da mestre, online..."
            value={form.place}
            onChange={(e) => update("place", e.target.value)}
            className={inputClass}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Começa" hint="Sem hora, vai para a agenda como dia inteiro.">
          <input
            type="time"
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
            className={inputClass}
          />
        </Field>
        {form.time && (
          <Field label="Termina">
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
      </FieldRow>

      <Field label="Pauta" hint="O que você quer tratar, o que precisa levar.">
        <textarea
          rows={2}
          value={form.agenda}
          onChange={(e) => update("agenda", e.target.value)}
          className={inputClass}
        />
      </Field>

      {/* Só na edição: antes do encontro acontecer não há o que anotar. */}
      {isEdit && (
        <>
          <Field label="Como foi">
            <textarea
              rows={3}
              placeholder="O que foi dito, o que você sentiu, o que ficou de tarefa"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Presença">
            <select
              value={form.attended}
              onChange={(e) =>
                update("attended", e.target.value as typeof form.attended)
              }
              className={inputClass}
            >
              <option value="">Ainda não aconteceu</option>
              <option value="sim">Fui</option>
              <option value="nao">Não fui</option>
            </select>
          </Field>
        </>
      )}
    </FormCard>
  );
}
