"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type Business = { id: string; name: string };

export function QuickCaptureForm({
  businesses,
  // Na home a ideia guardada some da tela: não há lista embaixo para provar
  // que salvou, então o formulário confirma sozinho e aponta para /ideias.
  standalone = false,
}: {
  businesses: Business[];
  standalone?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

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
      setSaved(true);
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-border p-4">
      {/* `flex-wrap` + largura mínima no campo: numa tela de 375px os três
          controles em linha deixavam o input com uns 90px de escrita. */}
      <div className="flex flex-wrap items-center gap-2">
        <Lightbulb size={20} className="shrink-0 text-accent" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Capturar uma ideia..."
          className="min-w-40 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
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

      {standalone && saved && (
        <p role="status" className="text-xs text-text-secondary">
          Guardada.{" "}
          <Link href="/ideias" className="font-medium text-accent hover:underline">
            Ver em Ideias
          </Link>
        </p>
      )}

      <ErrorNote message={error} />
    </div>
  );
}
