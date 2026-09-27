"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { notify } from "./Toast";
import { errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Clicar no texto e digitar, em vez de abrir um modal para trocar uma palavra.
 *
 * É o que mais separava o app do Notion: renomear uma tarefa passava por uma
 * caixa que cobria a tela inteira para editar um campo. Os modais continuam
 * existindo para CRIAR coisas, que é onde eles ganham — várias decisões de uma
 * vez, com o resto da tela fora do caminho.
 *
 * Enter salva, Esc cancela, sair do campo salva. Só chama a rede se o texto
 * mudou de verdade: clicar sem querer e sair não gera gravação.
 */
export function InlineEdit({
  value,
  onSave,
  placeholder = "Sem título",
  ariaLabel,
  className,
  inputClassName,
  /** Impede a edição sem esconder o texto (uma tarefa já concluída). */
  disabled = false,
  multiline = false,
}: {
  value: string;
  onSave: (next: string) => Promise<unknown>;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  // Guarda o que fecha a edição para o blur não salvar depois de um Esc.
  const cancelledRef = useRef(false);

  useLayoutEffect(() => {
    if (!editing) return;
    const field = fieldRef.current;
    field?.focus();
    // O cursor no fim, e não selecionando tudo: quase sempre a intenção é
    // corrigir o final da frase, não substituí-la inteira.
    field?.setSelectionRange(field.value.length, field.value.length);
  }, [editing]);

  function open() {
    if (disabled) return;
    cancelledRef.current = false;
    setDraft(value);
    setEditing(true);
  }

  async function commit() {
    if (cancelledRef.current) return;

    const next = draft.trim();
    // Vazio volta ao que era: uma lista cheia de linhas sem nome é pior do que
    // não ter deixado apagar.
    if (!next || next === value) {
      setEditing(false);
      setDraft(value);
      return;
    }

    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      // Fica em edição com o texto digitado: fechar aqui perderia o que ela
      // escreveu junto com o erro.
      notify(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel}: ${value}` : undefined}
        className={cn(
          "-mx-1 max-w-full truncate rounded px-1 text-left transition-colors",
          // O realce só no hover: uma lista onde toda linha parece um campo
          // de formulário fica mais barulhenta do que uma que parece texto.
          !disabled && "hover:bg-hover",
          disabled && "cursor-default",
          className,
        )}
      >
        {value || <span className="text-text-secondary">{placeholder}</span>}
      </button>
    );
  }

  const shared = {
    ref: fieldRef as never,
    value: draft,
    disabled: saving,
    placeholder,
    "aria-label": ariaLabel,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelledRef.current = true;
        setDraft(value);
        setEditing(false);
        return;
      }
      // No campo de uma linha o Enter salva. No de várias ele quebra linha, e
      // quem salva é Ctrl+Enter — senão não dá para escrever um parágrafo.
      if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        commit();
      }
    },
    className: cn(
      "-mx-1 w-full rounded border border-accent bg-surface px-1 text-left outline-none",
      "focus:ring-2 focus:ring-accent disabled:opacity-60",
      inputClassName ?? className,
    ),
  };

  return multiline ? (
    <textarea {...shared} rows={3} />
  ) : (
    <input {...shared} />
  );
}
