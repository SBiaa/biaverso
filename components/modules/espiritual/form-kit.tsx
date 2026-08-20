"use client";

import type { ReactNode } from "react";
import { Button, ErrorNote } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * As peças repetidas dos cinco formulários deste módulo.
 *
 * São cinco cadastros com a mesma casca — campo, erro, salvar, cancelar — e
 * copiar isso cinco vezes significaria cinco lugares para consertar quando o
 * espaçamento mudasse. Só a casca mora aqui; o estado e o payload continuam em
 * cada formulário, que é onde eles fazem sentido.
 */

// Sem `w-full`: todo campo aqui vive dentro de um flex/grid em coluna, que
// já estica o filho. Com ele, um seletor solto (o filtro da lista) não
// conseguia encolher — `w-auto` e `w-full` são do mesmo grupo do Tailwind, e
// quem ganha é a ordem do CSS gerado, não a ordem em que se escreve.
export const inputClass =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent";

/** Rótulo + campo. O `<label>` envolve o controle, então clicar no texto foca. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-text-secondary">{hint}</span>}
    </label>
  );
}

/** Duas colunas no desktop, uma no celular — a linha padrão dos formulários. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>;
}

export function FormCard({
  title,
  error,
  saving,
  canSave = true,
  onSubmit,
  onCancel,
  children,
}: {
  title: string;
  error: string | null;
  saving: boolean;
  canSave?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 md:p-5"
    >
      <p className="text-[0.9375rem] font-semibold tracking-tight text-text-primary">
        {title}
      </p>

      {children}

      <ErrorNote message={error} />

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || !canSave}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Um `<select>` alimentado por um mapa de rótulos. */
export function LabelSelect({
  value,
  labels,
  onChange,
}: {
  value: string;
  labels: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      {Object.entries(labels).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
