"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { PILLAR_COLORS, PILLAR_ICONS } from "@/lib/vision-visuals";
import { cn } from "@/lib/utils";

type PillarFormModalProps = {
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string | null;
  };
  onClose: () => void;
};

const iconOptions = Object.entries(PILLAR_ICONS);

export function PillarFormModal({ mode, initial, onClose }: PillarFormModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    color: initial?.color ?? PILLAR_COLORS[0],
    icon: initial?.icon ?? "heart",
  });

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        await api.post("/api/vision/pillars", form);
      } else if (initial) {
        await api.patch(`/api/vision/pillars/${initial.id}`, form);
      }
      router.refresh();
      onClose();
    } catch (e) {
      // O modal fica aberto com o que foi digitado, para não perder o texto.
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {mode === "create" ? "Novo pilar" : "Editar pilar"}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        <input
          placeholder="Nome"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          placeholder="Descrição (opcional)"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Cor</p>
          <div className="flex flex-wrap gap-2">
            {PILLAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, color }))}
                className={cn(
                  "h-7 w-7 rounded-full ring-offset-2",
                  form.color === color && "ring-2 ring-accent",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Ícone</p>
          <div className="flex flex-wrap gap-2">
            {iconOptions.map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, icon: name }))}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md border border-border",
                  form.icon === name && "border-accent bg-accent/10 text-accent",
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        <ErrorNote message={error} />

        <div className="mt-2 flex gap-2">
          <Button onClick={handleSubmit} disabled={saving}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
