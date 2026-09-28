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
import type { ActivityCategoryDTO, TimeBlockDTO } from "@/lib/time-tracking-shared";

type TimeBlockModalProps =
  | {
      mode: "create";
      dayId: string;
      categories: ActivityCategoryDTO[];
      initial: { categoryId: string; startTime: string; endTime: string };
      onClose: () => void;
    }
  | {
      mode: "edit";
      block: TimeBlockDTO;
      categories: ActivityCategoryDTO[];
      onClose: () => void;
    };

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

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.categoryId || !form.startTime || !form.endTime) return;
    setSaving(true);
    setError(null);

    try {
      if (props.mode === "create") {
        await api.post("/api/time-blocks", {
          dayId: props.dayId,
          categoryId: form.categoryId,
          title: form.title.trim() || null,
          startTime: form.startTime,
          endTime: form.endTime,
        });
        notify("Bloco adicionado.");
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
      setError(errorMessage(e));
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
