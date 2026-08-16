"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  BusinessBadge,
  Button,
  Card,
  confirmAction,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { IdeaStatusToggle } from "./IdeaStatusToggle";
import { api, errorMessage } from "@/lib/client-api";

type Business = { id: string; name: string; color: string };

export type Idea = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  businessId: string | null;
  business: Business | null;
};

const field =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export function IdeaCard({
  idea,
  businesses,
}: {
  idea: Idea;
  businesses: Business[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: idea.title,
    description: idea.description ?? "",
    businessId: idea.businessId ?? "",
  });

  async function handleSave() {
    if (!form.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/ideas/${idea.id}`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        businessId: form.businessId || null,
      });
      setEditing(false);
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    // Volta ao que está gravado: sair da edição não pode deixar o rascunho
    // pendurado para reaparecer no próximo clique no lápis.
    setForm({
      title: idea.title,
      description: idea.description ?? "",
      businessId: idea.businessId ?? "",
    });
    setError(null);
    setEditing(false);
  }

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: `Apagar "${idea.title}"?`,
      description: `Não dá para desfazer.`,
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/api/ideas/${idea.id}`);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Card className="flex flex-col gap-2">
        <ErrorNote message={error} />
        <input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="A ideia"
          className={field}
          autoFocus
        />
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          placeholder="Detalhar (opcional)"
          rows={3}
          className={`${field} resize-y`}
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Destino</span>
          <select
            value={form.businessId}
            onChange={(e) =>
              setForm((p) => ({ ...p, businessId: e.target.value }))
            }
            className={field}
          >
            <option value="">Pessoal/Casa</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={busy || !form.title.trim()}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={handleCancel} disabled={busy}>
            Cancelar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="group flex flex-col gap-2">
      <ErrorNote message={error} />

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{idea.title}</p>
        {/* Aparecem no hover no desktop; no toque não há hover, então ficam
            sempre visíveis lá. */}
        <div className="flex shrink-0 items-center gap-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-within:opacity-100">
          <IconButton
            title="Editar"
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} />
          </IconButton>
          <IconButton
            title="Apagar"
            onClick={handleDelete}
            disabled={busy}
            tone="danger"
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      {idea.description && (
        <p className="text-xs text-text-secondary">{idea.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <BusinessBadge business={idea.business} />
        <IdeaStatusToggle ideaId={idea.id} initialStatus={idea.status} />
      </div>
    </Card>
  );
}
