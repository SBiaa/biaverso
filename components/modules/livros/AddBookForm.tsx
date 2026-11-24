"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ErrorNote,
  Field,
  fieldClass,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { bookStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(bookStatusLabels);

export function AddBookForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    author: "",
    status: "QUERO_LER",
    totalPages: "",
    currentPage: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      // Campos numéricos vazios viram null no schema; string vazia seria erro.
      await api.post("/api/books", {
        ...form,
        totalPages: form.totalPages || null,
        currentPage: form.currentPage || null,
      });
      setOpen(false);
      setForm({
        title: "",
        author: "",
        status: "QUERO_LER",
        totalPages: "",
        currentPage: "",
      });
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Novo livro</Button>
      {open && (
        <Modal title="Novo livro" onClose={() => setOpen(false)} onSubmit={handleSubmit}>
          <Field label="Título">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Autor (opcional)">
            <input
              value={form.author}
              onChange={(e) => update("author", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className={fieldClass}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {bookStatusLabels[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total de páginas">
              <input
                type="number"
                min={1}
                value={form.totalPages}
                onChange={(e) => update("totalPages", e.target.value)}
                className={fieldClass}
              />
            </Field>
            {form.status === "LENDO" && (
              <Field label="Página atual">
                <input
                  type="number"
                  min={0}
                  value={form.currentPage}
                  onChange={(e) => update("currentPage", e.target.value)}
                  className={fieldClass}
                />
              </Field>
            )}
          </div>
          <ErrorNote message={error} />
          <ModalActions>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </ModalActions>
        </Modal>
      )}
    </>
  );
}
