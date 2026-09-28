"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  confirmAction,
  ErrorNote,
  Field,
  fieldClass,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { WEEKDAY_LABELS, weekdayIndex } from "@/lib/cardapio";
import type { ActivityCategoryDTO, TimeBlockDTO } from "@/lib/time-tracking-shared";

type OtherDay = { dayId: string; date: string };

type TimeBlockModalProps =
  | {
      mode: "create";
      dayId: string;
      categories: ActivityCategoryDTO[];
      initial: { categoryId: string; startTime: string; endTime: string };
      /** Os outros dias visíveis no calendário — para repetir o bloco neles. */
      otherDays?: OtherDay[];
      onClose: () => void;
    }
  | {
      mode: "edit";
      block: TimeBlockDTO;
      categories: ActivityCategoryDTO[];
      onClose: () => void;
    };

type RepeatState = Record<string, { checked: boolean; startTime: string; endTime: string }>;

function dayLabel(date: string) {
  const wd = weekdayIndex(new Date(date));
  return `${WEEKDAY_LABELS[wd]} ${Number(date.slice(8, 10))}`;
}

export function TimeBlockModal(props: TimeBlockModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(
    props.mode === "create"
      ? {
          categoryId: props.initial.categoryId,
          title: "",
          startTime: props.initial.startTime,
          endTime: props.initial.endTime,
        }
      : {
          categoryId: props.block.categoryId,
          title: props.block.title ?? "",
          startTime: props.block.startTime,
          endTime: props.block.endTime,
        },
  );
  const otherDays = props.mode === "create" ? (props.otherDays ?? []) : [];
  const [repeat, setRepeat] = useState<RepeatState>(() =>
    Object.fromEntries(
      otherDays.map((day) => [
        day.dayId,
        { checked: false, startTime: form.startTime, endTime: form.endTime },
      ]),
    ),
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRepeat(dayId: string, checked: boolean) {
    setRepeat((prev) => ({ ...prev, [dayId]: { ...prev[dayId], checked } }));
  }

  function updateRepeatTime(dayId: string, key: "startTime" | "endTime", value: string) {
    setRepeat((prev) => ({ ...prev, [dayId]: { ...prev[dayId], [key]: value } }));
  }

  async function handleSubmit() {
    if (!form.categoryId || !form.startTime || !form.endTime) return;
    setSaving(true);
    setError(null);

    try {
      if (props.mode === "create") {
        const payload = {
          categoryId: form.categoryId,
          title: form.title.trim() || null,
        };
        const repeatDays = Object.entries(repeat).filter(([, v]) => v.checked);

        await Promise.all([
          api.post("/api/time-blocks", {
            ...payload,
            dayId: props.dayId,
            startTime: form.startTime,
            endTime: form.endTime,
          }),
          ...repeatDays.map(([dayId, v]) =>
            api.post("/api/time-blocks", {
              ...payload,
              dayId,
              startTime: v.startTime,
              endTime: v.endTime,
            }),
          ),
        ]);

        notify(
          repeatDays.length > 0
            ? `Bloco adicionado em ${repeatDays.length + 1} dias.`
            : "Bloco adicionado.",
        );
      } else {
        await api.patch(`/api/time-blocks/${props.block.id}`, {
          categoryId: form.categoryId,
          title: form.title.trim() || null,
          startTime: form.startTime,
          endTime: form.endTime,
        });
        notify("Salvo.");
      }
      router.refresh();
      props.onClose();
    } catch (e) {
      // Alguma cópia pode ter sido criada antes do erro — o refresh já mostra
      // o que colou, e a mensagem deixa claro que nem tudo foi salvo.
      setError(errorMessage(e));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (props.mode !== "edit") return;
    const confirmed = await confirmAction({ title: "Excluir este bloco?", destructive: true });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/time-blocks/${props.block.id}`);
      notify("Excluído.");
      router.refresh();
      props.onClose();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={props.mode === "create" ? "Novo bloco" : "Editar bloco"}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      size="sm"
    >
      <ErrorNote message={error} />

      <Field label="Categoria">
        <select
          value={form.categoryId}
          onChange={(e) => update("categoryId", e.target.value)}
          className={fieldClass}
        >
          {props.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Título (opcional)">
        <input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className={fieldClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Início">
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => update("startTime", e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Fim">
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>

      {otherDays.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <span className="text-xs font-medium text-text-secondary">
            Repetir em mais dias — dá pra ajustar o horário de cada um
          </span>
          {otherDays.map((day) => {
            const state = repeat[day.dayId];
            return (
              <div key={day.dayId} className="flex items-center gap-2">
                <label className="flex flex-1 items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={state.checked}
                    onChange={(e) => toggleRepeat(day.dayId, e.target.checked)}
                  />
                  {dayLabel(day.date)}
                </label>
                {state.checked && (
                  <>
                    <input
                      type="time"
                      value={state.startTime}
                      onChange={(e) => updateRepeatTime(day.dayId, "startTime", e.target.value)}
                      className="w-[6.5rem] rounded-md border border-border px-1.5 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="time"
                      value={state.endTime}
                      onChange={(e) => updateRepeatTime(day.dayId, "endTime", e.target.value)}
                      className="w-[6.5rem] rounded-md border border-border px-1.5 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalActions>
        <Button type="submit" disabled={saving}>
          Salvar
        </Button>
        {props.mode === "edit" && (
          <Button type="button" variant="danger" onClick={handleDelete} disabled={saving}>
            Excluir
          </Button>
        )}
      </ModalActions>
    </Modal>
  );
}
