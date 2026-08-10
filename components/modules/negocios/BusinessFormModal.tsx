"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { BUSINESS_COLORS, BUSINESS_ICONS } from "@/lib/business-visuals";
import {
  DEFAULT_MODULES,
  MODULE_TYPES,
  moduleLabels,
  type BusinessModuleState,
} from "@/lib/business-modules";
import { cn } from "@/lib/utils";

type ModuleType = BusinessModuleState["module"];

type BusinessFormModalProps = {
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string | null;
    modules: ModuleType[];
  };
  onClose: () => void;
};

const iconOptions = Object.entries(BUSINESS_ICONS);

export function BusinessFormModal({ mode, initial, onClose }: BusinessFormModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    color: initial?.color ?? BUSINESS_COLORS[0],
    icon: initial?.icon ?? "briefcase",
  });
  const [modules, setModules] = useState<ModuleType[]>(initial?.modules ?? DEFAULT_MODULES);

  function toggleModule(module: ModuleType) {
    setModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module],
    );
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        await api.post("/api/businesses", { ...form, modules });
      } else if (initial) {
        await api.patch(`/api/businesses/${initial.id}`, { ...form, modules });
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
        className="flex max-h-[90vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {mode === "create" ? "Novo negócio" : "Editar negócio"}
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
            {BUSINESS_COLORS.map((color) => (
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

        <div>
          <p className="mb-1.5 text-xs font-medium text-text-secondary">
            Módulos que este negócio usa
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MODULE_TYPES.map((module) => (
              <button
                key={module}
                type="button"
                onClick={() => toggleModule(module)}
                className={cn(
                  "rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors",
                  modules.includes(module)
                    ? "border-accent bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-black/[0.03]",
                )}
              >
                {moduleLabels[module]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-text-secondary">
            Desmarcar só esconde a aba — nada é apagado.
          </p>
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
