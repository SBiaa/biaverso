"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

export function AddAreaForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/study/areas", { name, emoji });
      setName("");
      setEmoji("");
      setOpen(false);
      router.refresh();
      notify("Área criada.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Nova área de estudo
      </Button>
    );
  }

  return (
    <Card className="flex flex-col gap-2">
      <ErrorNote message={error} />
      <div className="flex gap-2">
        <input
          placeholder="🙂"
          aria-label="Emoji"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          maxLength={4}
          className="w-14 rounded-md border border-border px-3 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          autoFocus
          placeholder="Nome da área (ex.: Marketing, Programação)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Criar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
