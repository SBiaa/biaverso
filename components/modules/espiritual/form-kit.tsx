"use client";

import type { ReactNode } from "react";
import { Button, ErrorNote, Modal, ModalActions, fieldBaseClass } from "@/components/ui";
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
// O estilo de campo do app; o nome antigo fica porque os formulários daqui o importam.
export const inputClass = fieldBaseClass;

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
      {hint && <span className="text-xs text-text-secondary">{hint}</span>}
    </label>
  );
}

/** Duas colunas no desktop, uma no celular — a linha padrão dos formulários. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>;
}

/**
 * A casca dos cinco cadastros: o mesmo `Modal` do resto do app (Esc fecha,
 * Enter salva, foco preso, folha de baixo no celular). Antes era um cartão
 * aberto no meio da lista, o único lugar do app que cadastrava assim.
 *
 * `trigger` é o botão "+ Novo…": fica na página enquanto o modal está aberto,
 * para a lista atrás não pular.
 */
export function FormCard({
  title,
  error,
  saving,
  canSave = true,
  onSubmit,
  onCancel,
  trigger,
  children,
}: {
  title: string;
  error: string | null;
  saving: boolean;
  canSave?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  trigger?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {trigger}
      <Modal title={title} onClose={onCancel} onSubmit={onSubmit} size="md">
        {children}

        <ErrorNote message={error} />

        <ModalActions>
          <Button type="submit" disabled={saving || !canSave}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        </ModalActions>
      </Modal>
    </>
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
