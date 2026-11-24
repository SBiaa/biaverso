"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus } from "lucide-react";
import { ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { PESSOAL_LABEL } from "./labels";

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
  const [description, setDescription] = useState("");
  // O detalhe é opcional e some da vista até ser pedido: a captura continua
  // sendo "digita e Enter", mas quem quiser anotar mais não precisa salvar,
  // achar o card e abrir de novo.
  const [showDetail, setShowDetail] = useState(false);
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
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);

    try {
      await api.post("/api/ideas", {
        title: title.trim(),
        description: description.trim() || null,
        businessId: businessId || null,
      });
      // Só limpa o campo depois de gravar, para a ideia não sumir sem ter salvo.
      setTitle("");
      setDescription("");
      setShowDetail(false);
      setBusinessId("");
      setSaved(true);
      router.refresh();
      notify("Ideia guardada.");
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
        <Lightbulb size={20} className="shrink-0 text-accent-ink" aria-hidden />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Capturar uma ideia..."
          aria-label="Ideia"
          className="min-w-40 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
        />
        {/* O primeiro item era "Destino" e gravava como pessoal sem dizer: agora
            o valor padrão tem o nome do que ele é. */}
        <select
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          aria-label="Para onde vai a ideia"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">{PESSOAL_LABEL}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className="min-h-9 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {showDetail ? (
        <textarea
          // Só existe depois de pedido, então o foco ir direto para ele é o
          // que a pessoa espera ao clicar em "+ detalhe".
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            // Enter quebra linha (é texto livre); Ctrl+Enter guarda.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Detalhes, links, números… (Ctrl+Enter guarda)"
          aria-label="Detalhes da ideia"
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="inline-flex min-h-9 items-center gap-1 self-start rounded-md px-1 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <Plus size={13} aria-hidden />
          detalhe
        </button>
      )}

      {standalone && saved && (
        <p role="status" className="text-xs text-text-secondary">
          Guardada.{" "}
          <Link href="/ideias" className="font-medium text-accent-ink hover:underline">
            Ver em Ideias
          </Link>
        </p>
      )}

      <ErrorNote message={error} />
    </div>
  );
}
