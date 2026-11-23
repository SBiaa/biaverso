"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Trash2 } from "lucide-react";
import { IconButton, InlineEdit, confirmAction } from "@/components/ui";
import { PillSelect, type PillOption } from "@/components/modules/visao/cells";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Peças do despejo usadas em dois lugares: a página do Ano (todos os itens do
 * ano) e a página do pilar (só os itens daquele pilar).
 */

export type Decision = "FOCO" | "DESEJO" | "DEPOIS" | "SOLTAR";

export type BrainstormItemDTO = {
  id: string;
  year: number;
  text: string;
  decision: Decision | null;
  pillarId: string | null;
  measuredGoalId: string | null;
  desireId: string | null;
  /** Virou só o objetivo conceitual (sem meta com número ainda). */
  conceptualGoalId: string | null;
  /** Quando foi colocado no lugar. Organizado sai da lista de rascunhos. */
  organizedAt: string | null;
};

export const DECISIONS: { value: Decision; emoji: string; label: string; hint: string }[] = [
  { value: "FOCO", emoji: "🎯", label: "Foco", hint: "Vai virar meta este ano" },
  { value: "DESEJO", emoji: "✨", label: "Desejo", hint: "Importante, mas sem prazo" },
  { value: "DEPOIS", emoji: "⏳", label: "Depois", hint: "Não agora, fica guardado" },
  { value: "SOLTAR", emoji: "✖️", label: "Soltar", hint: "Era só barulho" },
];

// Por separar primeiro: é o que ainda pede atenção.
const ORDER: (Decision | null)[] = [null, "FOCO", "DESEJO", "DEPOIS", "SOLTAR"];

export function sortItems(items: BrainstormItemDTO[]) {
  return [...items].sort((a, b) => ORDER.indexOf(a.decision) - ORDER.indexOf(b.decision));
}

/** Separa o que ainda pede atenção do que já foi colocado no lugar. */
export function splitOrganized(items: BrainstormItemDTO[]) {
  return {
    open: sortItems(items.filter((i) => !i.organizedAt)),
    organized: items.filter((i) => i.organizedAt),
  };
}

/** Uma linha por item; marcadores de lista colada ("- ", "1. ", "• ") saem. */
export function splitDump(text: string) {
  return text
    .split("\n")
    .map((t) => t.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean);
}

/** Estado dos itens com troca otimista (desfaz se a gravação falhar). */
export function useBrainstormItems(initial: BrainstormItemDTO[]) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const replace = (updated: Partial<BrainstormItemDTO> & { id: string }) =>
    setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));

  async function add(body: { year: number; texts?: string[]; pillarId?: string; carriedFromId?: string }) {
    setError(null);
    try {
      const created = await api.post<BrainstormItemDTO[]>("/api/brainstorm-items", body);
      setItems((prev) => [...prev, ...created]);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    }
  }

  async function patch(id: string, local: Partial<BrainstormItemDTO>, body: object = local) {
    const previous = items;
    setError(null);
    replace({ id, ...local });
    try {
      await api.patch(`/api/brainstorm-items/${id}`, body);
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  async function remove(item: BrainstormItemDTO) {
    const linked = item.measuredGoalId || item.desireId;
    const ok = await confirmAction({
      title: `Apagar "${item.text}" do despejo?`,
      description: linked
        ? "Só some daqui: a meta ou o desejo que ele virou continua existindo."
        : undefined,
      destructive: true,
    });
    if (!ok) return;

    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await api.delete(`/api/brainstorm-items/${item.id}`);
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  async function toDesire(item: BrainstormItemDTO) {
    setBusyId(item.id);
    setError(null);
    try {
      replace(await api.post<BrainstormItemDTO>(`/api/brainstorm-items/${item.id}/desire`, {}));
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  /** "Já organizei" (ou desfazer): na tela na hora, no servidor em seguida. */
  const setOrganized = (id: string, organized: boolean) =>
    patch(id, { organizedAt: organized ? new Date().toISOString() : null }, { organized });

  return { items, setItems, error, busyId, add, patch, remove, toDesire, replace, setOrganized };
}

const linkClass =
  "inline-flex items-center gap-0.5 text-xs font-medium text-accent-ink hover:underline";

/** Botão que mostra/esconde os rascunhos já organizados, embaixo da lista. */
export function OrganizedToggle({
  count,
  open,
  onToggle,
}: {
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="self-start text-xs font-medium text-text-secondary hover:text-text-primary"
    >
      {open
        ? "Esconder os já organizados"
        : `Ver ${count} ${count === 1 ? "já organizado" : "já organizados"}`}
    </button>
  );
}
/** Um item do despejo: texto editável, pilar (opcional), destino e o próximo passo. */
export function BrainstormItemRow({
  item,
  pillarOptions,
  goalHref,
  busy,
  tag,
  onPatch,
  onRemove,
  onMakeGoal,
  onToDesire,
  onOrganized,
}: {
  item: BrainstormItemDTO;
  /** Sem opções, o seletor de pilar some (na página do pilar ele já é dado). */
  pillarOptions?: PillOption[];
  goalHref: string;
  busy: boolean;
  /** Etiqueta pequena antes do destino, ex.: o ano do item. */
  tag?: string;
  onPatch: (local: Partial<BrainstormItemDTO>) => Promise<unknown> | void;
  onRemove: () => void;
  onMakeGoal: () => void;
  onToDesire: () => void;
  /** Marca (true) ou desmarca (false) como já organizado. */
  onOrganized: (organized: boolean) => void;
}) {
  const dropped = item.decision === "SOLTAR";
  const organized = Boolean(item.organizedAt);

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div className={cn("min-w-0 flex-1", dropped && "line-through opacity-50")}>
          <InlineEdit
            value={item.text}
            ariaLabel="Texto do item"
            onSave={(text) => Promise.resolve(onPatch({ text }))}
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {!organized && (
            <IconButton
              onClick={() => onOrganized(true)}
              aria-label={`Já organizei ${item.text}`}
              title="Já coloquei no lugar: sai da lista"
            >
              <Check size={15} />
            </IconButton>
          )}
          <IconButton onClick={onRemove} aria-label={`Apagar ${item.text}`} tone="danger" revealOnHover>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {pillarOptions && (
          <PillSelect
            value={item.pillarId ?? ""}
            options={pillarOptions}
            placeholder="Sem pilar"
            ariaLabel="Pilar do item"
            onChange={(pillarId) => onPatch({ pillarId: pillarId || null })}
          />
        )}
        {tag && (
          <span className="rounded-full bg-border px-2 py-0.5 text-xs text-text-secondary">{tag}</span>
        )}
        <div className="flex flex-wrap gap-1" role="group" aria-label="Destino">
          {DECISIONS.map((d) => {
            const active = item.decision === d.value;
            return (
              <button
                key={d.value}
                type="button"
                title={d.hint}
                aria-pressed={active}
                onClick={() => onPatch({ decision: active ? null : d.value })}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-border text-text-secondary hover:text-text-primary",
                )}
              >
                {d.emoji} {d.label}
              </button>
            );
          })}
        </div>

        {item.decision === "FOCO" &&
          (item.measuredGoalId || item.conceptualGoalId ? (
            <Link href={goalHref} className={linkClass}>
              {item.measuredGoalId ? "Virou meta" : "Virou objetivo"} <ArrowUpRight size={12} />
            </Link>
          ) : (
            <button type="button" onClick={onMakeGoal} className={linkClass}>
              Virar meta →
            </button>
          ))}

        {item.decision === "DESEJO" &&
          (item.desireId ? (
            <Link href="/desejos" className={linkClass}>
              Está nos Desejos <ArrowUpRight size={12} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onToDesire}
              disabled={busy}
              className={cn(linkClass, "disabled:opacity-50")}
            >
              Mandar para Desejos →
            </button>
          ))}

        {organized && (
          <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
            <Check size={12} /> Organizado
            <button
              type="button"
              onClick={() => onOrganized(false)}
              className="underline hover:text-text-primary"
            >
              desfazer
            </button>
          </span>
        )}
      </div>
    </li>
  );
}
