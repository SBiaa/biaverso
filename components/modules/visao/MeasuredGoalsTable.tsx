"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, ErrorNote, IconButton, InlineEdit, confirmAction } from "@/components/ui";
import { cn, hexToRgba } from "@/lib/utils";
import { goalTermLabels, measuredGoalStatusLabels } from "@/lib/labels";
import { VISION_TONES } from "@/lib/vision-visuals";
import { goalProgress } from "@/lib/vision-shared";
import { AmountCell, DateCell, PillSelect, ProgressBar, type PillOption } from "./cells";
import { useRows } from "./useRows";

export type MeasuredRow = {
  id: string;
  title: string;
  status: string;
  term: string | null;
  deadline: string | null;
  /** Meta antiga em texto: só aparece quando não há meta numérica. */
  target: string | null;
  targetValue: number | null;
  currentValue: number;
  unit: string | null;
  /** Percentual manual: só vale sem meta numérica. */
  progress: number;
  conceptualGoalId: string;
  businessId: string | null;
};

export type ConceptualOption = {
  id: string;
  title: string;
  pillarName: string;
  pillarColor: string;
};
export type BusinessOptionRow = { id: string; name: string; color: string };

const statusOptions: PillOption[] = Object.entries(measuredGoalStatusLabels).map(
  ([value, label]) => ({ value, label, color: VISION_TONES[value] }),
);
const termOptions: PillOption[] = Object.entries(goalTermLabels).map(([value, label]) => ({
  value,
  label,
  color: VISION_TONES[value],
}));
const STATUS_ORDER = Object.keys(measuredGoalStatusLabels);

const th = "pb-2 pr-3 font-medium";

export function MeasuredGoalsTable({
  initialRows,
  conceptualGoals,
  businesses,
}: {
  initialRows: MeasuredRow[];
  conceptualGoals: ConceptualOption[];
  businesses: BusinessOptionRow[];
}) {
  const { rows, error, patch, add, remove } = useRows(
    initialRows,
    "/api/vision/goals/measured",
  );
  const [filter, setFilter] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newConceptualId, setNewConceptualId] = useState(conceptualGoals[0]?.id ?? "");

  const conceptualById = useMemo(
    () => new Map(conceptualGoals.map((g) => [g.id, g])),
    [conceptualGoals],
  );
  const businessOptions: PillOption[] = businesses.map((b) => ({
    value: b.id,
    label: b.name,
    color: b.color,
  }));

  // Em andamento primeiro; dentro do status, o prazo mais próximo (sem prazo por último).
  const visible = useMemo(
    () =>
      rows
        .filter((r) => !filter || r.status === filter)
        .sort(
          (a, b) =>
            STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
            (a.deadline ? new Date(a.deadline).getTime() : Infinity) -
              (b.deadline ? new Date(b.deadline).getTime() : Infinity) ||
            a.title.localeCompare(b.title, "pt-BR"),
        ),
    [rows, filter],
  );

  const counts = (status: string) => rows.filter((r) => r.status === status).length;

  async function create() {
    const title = newTitle.trim();
    if (!title || !newConceptualId) return;

    const ok = await add<MeasuredRow>({ title, conceptualGoalId: newConceptualId }, (created) => ({
      ...created,
      deadline: created.deadline ?? null,
    }));
    if (ok) setNewTitle("");
  }

  async function handleRemove(row: MeasuredRow) {
    const confirmed = await confirmAction({
      title: `Excluir "${row.title}"?`,
      destructive: true,
    });
    if (confirmed) remove(row.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
        {[{ id: "", label: "Todos", n: rows.length }]
          .concat(
            STATUS_ORDER.filter((s) => counts(s) > 0).map((s) => ({
              id: s,
              label: measuredGoalStatusLabels[s],
              n: counts(s),
            })),
          )
          .map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              aria-pressed={filter === chip.id}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === chip.id
                  ? "border-accent bg-accent text-accent-contrast"
                  : "border-border text-text-secondary hover:text-text-primary",
              )}
            >
              {chip.label} · {chip.n}
            </button>
          ))}
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[78rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-text-secondary">
              <th scope="col" className={th}>Objetivo</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Termo</th>
              <th scope="col" className={th}>Prazo final</th>
              <th scope="col" className={th}>Meta</th>
              <th scope="col" className={th}>Completado</th>
              <th scope="col" className={th}>Unidade</th>
              <th scope="col" className={th}>Progresso</th>
              <th scope="col" className={th}>Objetivo conceitual</th>
              <th scope="col" className={th}>Empresa</th>
              <th scope="col" className="pb-2"><span className="sr-only">Excluir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => {
              const conceptual = conceptualById.get(row.conceptualGoalId);
              const hasTarget = row.targetValue !== null && row.targetValue > 0;
              return (
                <tr key={row.id}>
                  <td className="py-2 pr-3 align-top">
                    <InlineEdit
                      value={row.title}
                      ariaLabel="Título do objetivo"
                      onSave={(title) => patch(row.id, { title })}
                    />
                    {!hasTarget && row.target && (
                      <p className="text-xs text-text-secondary">Meta: {row.target}</p>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <PillSelect
                      value={row.status}
                      options={statusOptions}
                      ariaLabel="Status do objetivo"
                      onChange={(status) => patch(row.id, { status })}
                    />
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <PillSelect
                      value={row.term ?? ""}
                      options={termOptions}
                      placeholder="Sem termo"
                      ariaLabel="Termo"
                      onChange={(term) => patch(row.id, { term: term || null })}
                    />
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <DateCell
                      value={row.deadline}
                      ariaLabel="Prazo final"
                      onChange={(deadline) => patch(row.id, { deadline })}
                    />
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <AmountCell
                      value={row.targetValue}
                      ariaLabel="Meta"
                      onCommit={(targetValue) => patch(row.id, { targetValue })}
                    />
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <AmountCell
                      value={row.currentValue}
                      ariaLabel="Completado"
                      nullable={false}
                      onCommit={(currentValue) => patch(row.id, { currentValue: currentValue ?? 0 })}
                    />
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <InlineEdit
                      value={row.unit ?? ""}
                      placeholder="—"
                      ariaLabel="Unidade"
                      onSave={(unit) => patch(row.id, { unit: unit.trim() || null })}
                    />
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <div className="pt-1.5">
                      <ProgressBar percent={goalProgress(row)} />
                    </div>
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <select
                      value={row.conceptualGoalId}
                      onChange={(e) =>
                        patch(row.id, { conceptualGoalId: e.target.value })
                      }
                      aria-label="Objetivo conceitual"
                      className="max-w-[14rem] cursor-pointer rounded-md border border-transparent bg-transparent py-1 pr-1 text-sm text-text-primary outline-none hover:border-border focus:ring-2 focus:ring-accent"
                    >
                      {conceptualGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                    {conceptual && (
                      <span
                        className="ml-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: hexToRgba(conceptual.pillarColor, 0.14),
                          color: conceptual.pillarColor,
                        }}
                      >
                        {conceptual.pillarName}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <PillSelect
                      value={row.businessId ?? ""}
                      options={businessOptions}
                      placeholder="Nenhuma"
                      ariaLabel="Empresa"
                      onChange={(id) => patch(row.id, { businessId: id || null })}
                    />
                  </td>
                  <td className="py-2 align-top">
                    <IconButton
                      onClick={() => handleRemove(row)}
                      aria-label={`Excluir ${row.title}`}
                      tone="danger"
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-text-secondary">
          {rows.length === 0 ? "Nenhum objetivo metrificado ainda." : "Nada com esse status."}
        </p>
      )}

      {conceptualGoals.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Cadastre um objetivo conceitual antes de criar os metrificados.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Novo objetivo metrificado"
            aria-label="Título do novo objetivo"
            className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={newConceptualId}
            onChange={(e) => setNewConceptualId(e.target.value)}
            aria-label="Objetivo conceitual do novo objetivo"
            className="max-w-[16rem] rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {conceptualGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={create} disabled={!newTitle.trim()}>
            <Plus size={14} />
            Adicionar
          </Button>
        </div>
      )}

      <ErrorNote message={error} />
    </div>
  );
}
