"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowUpRight, CornerDownLeft, History, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  ErrorNote,
  IconButton,
  InlineEdit,
  confirmAction,
  fieldBaseClass,
} from "@/components/ui";
import { PillSelect, type PillOption } from "@/components/modules/visao/cells";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { BrainstormGoalModal, type ConceptualChoice } from "./BrainstormGoalModal";

export type BrainstormItemDTO = {
  id: string;
  text: string;
  decision: Decision | null;
  pillarId: string | null;
  measuredGoalId: string | null;
  desireId: string | null;
};

export type CarryCandidate = { id: string; text: string };

type Decision = "FOCO" | "DESEJO" | "DEPOIS" | "SOLTAR";

type PillarChoice = { id: string; name: string; color: string };

const DECISIONS: { value: Decision; emoji: string; label: string; hint: string }[] = [
  { value: "FOCO", emoji: "🎯", label: "Foco", hint: "Vai virar meta este ano" },
  { value: "DESEJO", emoji: "✨", label: "Desejo", hint: "Importante, mas sem prazo" },
  { value: "DEPOIS", emoji: "⏳", label: "Depois", hint: "Não agora, fica guardado" },
  { value: "SOLTAR", emoji: "✖️", label: "Soltar", hint: "Era só barulho" },
];

// Por separar primeiro: é o que ainda pede atenção.
const ORDER: (Decision | null)[] = [null, "FOCO", "DESEJO", "DEPOIS", "SOLTAR"];

/** Mais que isso ao mesmo tempo costuma virar "tudo pela metade". */
const MAX_FOCUS_PER_PILLAR = 2;
const MAX_FOCUS_TOTAL = 4;

const QUESTIONS = [
  "Como eu quero estar daqui a um ano?",
  "Se eu só pudesse avançar em uma coisa, qual faria as outras ficarem mais fáceis?",
];

export function BrainstormSection({
  year,
  initialItems,
  carryCandidates: initialCarry,
  pillars,
  conceptualGoals,
}: {
  year: number;
  initialItems: BrainstormItemDTO[];
  carryCandidates: CarryCandidate[];
  pillars: PillarChoice[];
  conceptualGoals: ConceptualChoice[];
}) {
  const [items, setItems] = useState(initialItems);
  const [carry, setCarry] = useState(initialCarry);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [goalFor, setGoalFor] = useState<BrainstormItemDTO | null>(null);
  const router = useRouter();

  const pillarById = useMemo(() => new Map(pillars.map((p) => [p.id, p])), [pillars]);
  const pillarOptions: PillOption[] = pillars.map((p) => ({
    value: p.id,
    label: p.name,
    color: p.color,
  }));

  const sorted = useMemo(
    () => [...items].sort((a, b) => ORDER.indexOf(a.decision) - ORDER.indexOf(b.decision)),
    [items],
  );

  const pending = items.filter((i) => !i.decision).length;
  const focus = items.filter((i) => i.decision === "FOCO");
  const crowdedPillars = pillars.filter(
    (p) => focus.filter((i) => i.pillarId === p.id).length > MAX_FOCUS_PER_PILLAR,
  );

  async function addFromDraft() {
    // Colar uma lista inteira funciona: cada linha vira um item.
    const texts = draft
      .split("\n")
      .map((t) => t.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
      .filter(Boolean);
    if (texts.length === 0) return;

    setError(null);
    try {
      const created = await api.post<BrainstormItemDTO[]>("/api/brainstorm-items", { year, texts });
      setItems((prev) => [...prev, ...created]);
      setDraft("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function patch(id: string, local: Partial<BrainstormItemDTO>) {
    const previous = items;
    setError(null);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...local } : i)));
    try {
      await api.patch(`/api/brainstorm-items/${id}`, local);
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
      const updated = await api.post<BrainstormItemDTO>(`/api/brainstorm-items/${item.id}/desire`, {});
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function bringBack(candidate: CarryCandidate) {
    setError(null);
    try {
      const created = await api.post<BrainstormItemDTO[]>("/api/brainstorm-items", {
        year,
        carriedFromId: candidate.id,
      });
      setItems((prev) => [...prev, ...created]);
      setCarry((prev) => prev.filter((c) => c.id !== candidate.id));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text-primary">Despejo</h2>
        <p className="text-sm text-text-secondary">
          Tira da cabeça tudo o que está aí, sem filtro. Depois separa com calma.
        </p>
        <ul className="space-y-0.5 pt-1">
          {QUESTIONS.map((q) => (
            <li key={q} className="text-sm italic text-text-secondary">
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* 1. Despejar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              addFromDraft();
            }
          }}
          rows={Math.min(6, Math.max(1, draft.split("\n").length))}
          placeholder="Escreve e aperta Enter. Pode colar uma lista inteira."
          aria-label="Novo item do despejo"
          className={cn(fieldBaseClass, "min-w-0 flex-1 resize-none")}
        />
        <Button variant="secondary" onClick={addFromDraft} disabled={!draft.trim()}>
          <CornerDownLeft size={14} />
          Adicionar
        </Button>
      </div>

      {carry.length > 0 && (
        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <History size={13} />
            Ficou para depois em {year - 1}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {carry.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => bringBack(c)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-text-primary hover:bg-hover"
                  title="Trazer para o despejo deste ano"
                >
                  + {c.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-text-secondary">
          {items.length} {items.length === 1 ? "item" : "itens"}
          {pending > 0 && ` · ${pending} por separar`}
          {focus.length > 0 && ` · ${focus.length} em foco`}
        </p>
      )}

      {/* Contador de foco: avisa, não bloqueia. */}
      {(focus.length > MAX_FOCUS_TOTAL || crowdedPillars.length > 0) && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {focus.length > MAX_FOCUS_TOTAL
            ? `${focus.length} coisas em foco ao mesmo tempo é bastante.`
            : `${crowdedPillars.map((p) => p.name).join(" e ")} ${crowdedPillars.length > 1 ? "estão" : "está"} com mais de ${MAX_FOCUS_PER_PILLAR} focos.`}{" "}
          Vale mover alguma coisa para Depois?
        </p>
      )}

      {/* 2. Separar  ·  3. Transformar */}
      {sorted.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((item) => {
            const pillar = item.pillarId ? pillarById.get(item.pillarId) : undefined;
            const dropped = item.decision === "SOLTAR";
            return (
              <li key={item.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("min-w-0 flex-1", dropped && "line-through opacity-50")}>
                    <InlineEdit
                      value={item.text}
                      ariaLabel="Texto do item"
                      onSave={(text) => patch(item.id, { text })}
                    />
                  </div>
                  <IconButton
                    onClick={() => remove(item)}
                    aria-label={`Apagar ${item.text}`}
                    tone="danger"
                    revealOnHover
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <PillSelect
                    value={item.pillarId ?? ""}
                    options={pillarOptions}
                    placeholder="Sem pilar"
                    ariaLabel="Pilar do item"
                    onChange={(pillarId) => patch(item.id, { pillarId: pillarId || null })}
                  />
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Destino">
                    {DECISIONS.map((d) => {
                      const active = item.decision === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          title={d.hint}
                          aria-pressed={active}
                          onClick={() => patch(item.id, { decision: active ? null : d.value })}
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
                    (item.measuredGoalId ? (
                      <Link
                        href={pillar ? `/visao/${pillar.id}` : "/visao?tab=metrificados"}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-accent-ink hover:underline"
                      >
                        Virou meta <ArrowUpRight size={12} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setGoalFor(item)}
                        className="text-xs font-medium text-accent-ink hover:underline"
                      >
                        Virar meta →
                      </button>
                    ))}

                  {item.decision === "DESEJO" &&
                    (item.desireId ? (
                      <Link
                        href="/desejos"
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-accent-ink hover:underline"
                      >
                        Está nos Desejos <ArrowUpRight size={12} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toDesire(item)}
                        disabled={busyId === item.id}
                        className="text-xs font-medium text-accent-ink hover:underline disabled:opacity-50"
                      >
                        Mandar para Desejos →
                      </button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ErrorNote message={error} />

      {goalFor && (
        <BrainstormGoalModal
          item={goalFor}
          year={year}
          pillar={goalFor.pillarId ? pillarById.get(goalFor.pillarId) ?? null : null}
          conceptualGoals={conceptualGoals}
          onClose={() => setGoalFor(null)}
          onCreated={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
            // A meta nova aparece na lista do pilar logo abaixo.
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
