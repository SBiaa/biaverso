"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type Business = { id: string; name: string };

export function QuickCaptureForm({ businesses }: { businesses: Business[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      await api.post("/api/ideas", {
        title: title.trim(),
        businessId: businessId || null,
      });
      // Só limpa o campo depois de gravar, para a ideia não sumir sem ter salvo.
      setTitle("");
      setBusinessId("");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-border p-4">
      <div className="flex items-center gap-2">
      <Lightbulb size={20} className="shrink-0 text-accent" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Capturar uma ideia..."
        className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
      />
      <select
        value={businessId}
        onChange={(e) => setBusinessId(e.target.value)}
        className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Destino</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        Guardar
      </button>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
