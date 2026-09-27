"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button, ErrorNote, notify } from "@/components/ui";
import {
  ACCENT_PRESETS,
  accentContrast,
  normalizeAccent,
  parseHex,
} from "@/lib/accent";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Escolhe o tom principal do app.
 *
 * A prévia é aplicada na hora, direto na variável CSS do documento: o app
 * inteiro já usa `--accent`, então a tela toda muda enquanto você experimenta,
 * sem precisar salvar para ver como ficou. Sair sem salvar desfaz.
 */
export function AccentColorPicker({ initialColor }: { initialColor: string }) {
  const router = useRouter();
  const saved = normalizeAccent(initialColor);
  const [color, setColor] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = color !== saved;

  function preview(next: string) {
    setColor(next);
    // `parseHex` guarda contra o meio da digitação num campo de texto: "#a" não
    // pode ir para o CSS e apagar o acento da tela enquanto você digita.
    if (!parseHex(next)) return;
    const root = document.documentElement;
    root.style.setProperty("--accent", next);
    root.style.setProperty("--accent-contrast", accentContrast(next));
  }

  function reset() {
    preview(saved);
    const root = document.documentElement;
    // Devolve o controle ao <style> que o servidor injetou.
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-contrast");
  }

  async function save() {
    if (!parseHex(color)) {
      setError("Use uma cor em hexadecimal, tipo #6366f1.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.patch("/api/settings", { accentColor: normalizeAccent(color) });
      router.refresh();
      notify("Cor salva.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {ACCENT_PRESETS.map((preset) => {
          const isActive =
            normalizeAccent(color) === normalizeAccent(preset.value);
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => preview(preset.value)}
              aria-label={preset.label}
              aria-pressed={isActive}
              title={preset.label}
              className={cn(
                "grid size-11 place-items-center rounded-full transition-transform",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                isActive && "ring-2 ring-accent ring-offset-2",
              )}
              style={{ backgroundColor: preset.value }}
            >
              {isActive && (
                <Check
                  size={16}
                  style={{ color: accentContrast(preset.value) }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          Outra cor
          {/* O seletor nativo do sistema: melhor que qualquer roda de cores
              que eu desenhasse, e já vem com conta-gotas no desktop. */}
          <input
            type="color"
            value={parseHex(color) ? normalizeAccent(color) : "#6366f1"}
            onChange={(e) => preview(e.target.value)}
            className="h-11 w-14 cursor-pointer rounded-md border border-border bg-surface p-1"
          />
        </label>

        <input
          value={color}
          onChange={(e) => preview(e.target.value)}
          spellCheck={false}
          aria-label="Cor em hexadecimal"
          className="w-28 rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
        />

        <Button onClick={save} disabled={saving || !changed}>
          {saving ? "Salvando..." : "Salvar cor"}
        </Button>
        {changed && (
          <Button variant="ghost" onClick={reset}>
            Desfazer
          </Button>
        )}
      </div>

      <ErrorNote message={error} />
    </div>
  );
}
