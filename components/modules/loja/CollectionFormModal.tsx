"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  confirmAction,
  ErrorNote,
  Modal,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { collectionStatusLabels } from "@/lib/labels";
import { toDateInputValue } from "@/lib/utils";

const statusOptions = Object.keys(collectionStatusLabels);

export type CollectionRecord = {
  id: string;
  name: string;
  description: string | null;
  season: string | null;
  status: string;
  launchDate: string | null;
};

export function CollectionFormModal({
  businessId,
  collection,
  onClose,
  onDeleted,
}: {
  businessId: string;
  collection?: CollectionRecord;
  onClose: () => void;
  /** Depois de excluir: a tela de detalhe precisa sair da página da coleção. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!collection;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: collection?.name ?? "",
    description: collection?.description ?? "",
    season: collection?.season ?? "",
    status: collection?.status ?? "IDEIA",
    launchDate: collection?.launchDate ? toDateInputValue(collection.launchDate) : "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      businessId,
      description: form.description || null,
      season: form.season || null,
      launchDate: form.launchDate || null,
    };

    try {
      if (isEdit) await api.patch(`/api/collections/${collection!.id}`, payload);
      else await api.post("/api/collections", payload);
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    const confirmed = await confirmAction({
      title: "Excluir esta coleção?",
      description: "Os produtos dela também somem.",
      destructive: true,
    });
    if (!confirmed) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/collections/${collection!.id}`);
      router.refresh();
      notify("Excluído.");
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Editar coleção" : "Nova coleção"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >

      <input
        placeholder="Nome (ex.: Coleção Samhain 2026)"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        placeholder="Temporada (ex.: Outono/Inverno, Samhain)"
        value={form.season}
        onChange={(e) => update("season", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        placeholder="Descrição"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        rows={3}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {collectionStatusLabels[s]}
            </option>
          ))}
        </select>
        <div>
          <p className="mb-1 text-xs text-text-secondary">Lançamento</p>
          <input
            type="date"
            value={form.launchDate}
            onChange={(e) => update("launchDate", e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <ErrorNote message={error} />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {isEdit && (
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:bg-red-50"
          >
            Excluir
          </Button>
        )}
      </div>
    </Modal>
  );
}
