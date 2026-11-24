"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CornerDownLeft, History } from "lucide-react";
import { Button, Card, ErrorNote, fieldBaseClass } from "@/components/ui";
import type { PillOption } from "@/components/modules/visao/cells";
import { cn } from "@/lib/utils";
import { BrainstormGoalModal, type ConceptualChoice } from "./BrainstormGoalModal";
import {
  BrainstormItemRow,
  OrganizedToggle,
  sortItems,
  splitDump,
  splitOrganized,
  useBrainstormItems,
  type BrainstormItemDTO,
} from "./brainstorm-shared";

export type { BrainstormItemDTO } from "./brainstorm-shared";

export type CarryCandidate = { id: string; text: string };

type PillarChoice = { id: string; name: string; color: string };

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
  const { items, error, busyId, add, patch, remove, toDesire, replace, setOrganized } =
    useBrainstormItems(initialItems);
  const [showOrganized, setShowOrganized] = useState(false);
  const [carry, setCarry] = useState(initialCarry);
  const [draft, setDraft] = useState("");
  const [goalFor, setGoalFor] = useState<BrainstormItemDTO | null>(null);
  const router = useRouter();

  const pillarById = useMemo(() => new Map(pillars.map((p) => [p.id, p])), [pillars]);
  const pillarOptions: PillOption[] = pillars.map((p) => ({
    value: p.id,
    label: p.name,
    color: p.color,
  }));

  // Os já organizados saem da frente; as contagens abaixo ainda valem para o ano todo.
  const { open: openItems, organized } = useMemo(() => splitOrganized(items), [items]);
  const shown = showOrganized ? [...openItems, ...sortItems(organized)] : openItems;
  const pending = openItems.filter((i) => !i.decision).length;
  const focus = items.filter((i) => i.decision === "FOCO");
  const crowdedPillars = pillars.filter(
    (p) => focus.filter((i) => i.pillarId === p.id).length > MAX_FOCUS_PER_PILLAR,
  );

  async function addFromDraft() {
    const texts = splitDump(draft);
    if (texts.length === 0) return;
    if (await add({ year, texts })) setDraft("");
  }

  async function bringBack(candidate: CarryCandidate) {
    if (await add({ year, carriedFromId: candidate.id })) {
      setCarry((prev) => prev.filter((c) => c.id !== candidate.id));
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
          {organized.length > 0 && ` · ${organized.length} organizados`}
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
      {shown.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {shown.map((item) => (
            <BrainstormItemRow
              key={item.id}
              item={item}
              pillarOptions={pillarOptions}
              goalHref={item.pillarId ? `/visao/${item.pillarId}` : "/visao?tab=metrificados"}
              busy={busyId === item.id}
              onPatch={(local) => patch(item.id, local)}
              onRemove={() => remove(item)}
              onMakeGoal={() => setGoalFor(item)}
              onToDesire={() => toDesire(item)}
              onOrganized={(value) => setOrganized(item.id, value)}
            />
          ))}
        </ul>
      )}

      <OrganizedToggle
        count={organized.length}
        open={showOrganized}
        onToggle={() => setShowOrganized((v) => !v)}
      />

      <ErrorNote message={error} />

      {goalFor && (
        <BrainstormGoalModal
          item={goalFor}
          year={year}
          pillar={goalFor.pillarId ? pillarById.get(goalFor.pillarId) ?? null : null}
          conceptualGoals={conceptualGoals}
          onClose={() => setGoalFor(null)}
          onCreated={(updated) => {
            replace(updated);
            // A meta nova aparece na lista do pilar logo abaixo.
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
