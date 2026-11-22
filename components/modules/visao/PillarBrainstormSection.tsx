"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { Button, CardTitle, ErrorNote, fieldBaseClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  BrainstormGoalModal,
  type ConceptualChoice,
} from "@/components/modules/ano/BrainstormGoalModal";
import {
  BrainstormItemRow,
  sortItems,
  splitDump,
  useBrainstormItems,
  type BrainstormItemDTO,
} from "@/components/modules/ano/brainstorm-shared";

/**
 * Os rascunhos do despejo que são deste pilar: a matéria-prima para organizar
 * os objetivos logo abaixo. Anotar aqui entra no despejo do ano em
 * planejamento, já com o pilar.
 */
export function PillarBrainstormSection({
  pillar,
  year,
  initialItems,
  conceptualGoals,
}: {
  pillar: { id: string; name: string };
  /** Ano em planejamento — onde entram os itens anotados aqui. */
  year: number;
  initialItems: BrainstormItemDTO[];
  conceptualGoals: ConceptualChoice[];
}) {
  const { items, error, busyId, add, patch, remove, toDesire, replace } =
    useBrainstormItems(initialItems);
  const [draft, setDraft] = useState("");
  const [goalFor, setGoalFor] = useState<BrainstormItemDTO | null>(null);
  const router = useRouter();

  // Soltos não interessam aqui: foram decididos como barulho.
  const visible = useMemo(
    () => sortItems(items.filter((i) => i.decision !== "SOLTAR")),
    [items],
  );
  const pending = visible.filter((i) => !i.decision).length;

  async function addFromDraft() {
    const texts = splitDump(draft);
    if (texts.length === 0) return;
    if (await add({ year, texts, pillarId: pillar.id })) setDraft("");
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle>Rascunhos</CardTitle>
        <Link href={`/ano?ano=${year}`} className="text-xs font-medium text-accent-ink hover:underline">
          Ver o despejo de {year} →
        </Link>
      </div>
      <p className="-mt-1 text-sm text-text-secondary">
        O que você anotou no despejo para {pillar.name}
        {pending > 0 && ` · ${pending} por separar`}.
      </p>

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
          placeholder={`Anotar uma ideia para ${pillar.name}…`}
          aria-label={`Novo rascunho para ${pillar.name}`}
          className={cn(fieldBaseClass, "min-w-0 flex-1 resize-none")}
        />
        <Button variant="secondary" onClick={addFromDraft} disabled={!draft.trim()}>
          <CornerDownLeft size={14} />
          Anotar
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum rascunho para este pilar ainda.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {visible.map((item) => (
            <BrainstormItemRow
              key={item.id}
              item={item}
              goalHref="#objetivos"
              busy={busyId === item.id}
              tag={item.year !== year ? String(item.year) : undefined}
              onPatch={(local) => patch(item.id, local)}
              onRemove={() => remove(item)}
              onMakeGoal={() => setGoalFor(item)}
              onToDesire={async () => {
                // O desejo novo aparece em "Desejos e intenções", mais abaixo.
                if (await toDesire(item)) router.refresh();
              }}
            />
          ))}
        </ul>
      )}

      <ErrorNote message={error} />

      {goalFor && (
        <BrainstormGoalModal
          item={goalFor}
          year={goalFor.year}
          pillar={pillar}
          conceptualGoals={conceptualGoals}
          onClose={() => setGoalFor(null)}
          onCreated={(updated) => {
            replace(updated);
            // A meta nova aparece em "Objetivos", logo abaixo.
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
