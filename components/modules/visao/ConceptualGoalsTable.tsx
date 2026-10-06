"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, ErrorNote, IconButton, InlineEdit, confirmAction } from "@/components/ui";
import { cn } from "@/lib/utils";
import { measuredGoalStatusLabels } from "@/lib/labels";
import { VISION_TONES } from "@/lib/vision-visuals";
import type { PriorityLevelDTO } from "@/lib/task-plan";
import { PillSelect, type PillOption } from "./cells";
import { useRows } from "./useRows";

export type ConceptualRow = {
  id: string;
  title: string;
  status: string;
  priorityLevelId: string | null;
  category: string | null;
  challenge: string | null;
  pillarId: string;
  /** Objetivos metrificados sob este objetivo. */
  measuredCount: number;
};

export type PillarOption = { id: string; name: string; color: string };

const statusOptions: PillOption[] = Object.entries(measuredGoalStatusLabels).map(
  ([value, label]) => ({ value, label, color: VISION_TONES[value] }),
);
const STATUS_ORDER = Object.keys(measuredGoalStatusLabels);

const th = "pb-2 pr-3 font-medium";

export function ConceptualGoalsTable({
  initialRows,
  pillars,
  levels,
}: {
  initialRows: ConceptualRow[];
  pillars: PillarOption[];
  levels: PriorityLevelDTO[];
}) {
  const { rows, error, patch, add, remove } = useRows(
    initialRows,
    "/api/vision/goals/conceptual",
  );
  const [filter, setFilter] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newPillarId, setNewPillarId] = useState(pillars[0]?.id ?? "");

  const levelOptions: PillOption[] = levels.map((l) => ({
    value: l.id,
    label: l.name,
    color: l.color,
  }));
  const pillarOptions: PillOption[] = pillars.map((p) => ({
    value: p.id,
    label: p.name,
    color: p.color,
  }));

  // Em andamento primeiro; dentro do status, a prioridade mais urgente.
  const visible = useMemo(() => {
    const rank = new Map(levels.map((l) => [l.id, l.order]));
    const none = Number.MAX_SAFE_INTEGER;
    return rows
      .filter((r) => !filter || r.status === filter)
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          (a.priorityLevelId ? (rank.get(a.priorityLevelId) ?? none) : none) -
            (b.priorityLevelId ? (rank.get(b.priorityLevelId) ?? none) : none) ||
          a.title.localeCompare(b.title, "pt-BR"),
      );
  }, [rows, levels, filter]);

  const counts = (status: string) => rows.filter((r) => r.status === status).length;

  async function create() {
    const title = newTitle.trim();
    if (!title || !newPillarId) return;

    const ok = await add<{ id: string } & Omit<ConceptualRow, "measuredCount">>(
      { title, pillarId: newPillarId },
      (created) => ({ ...created, measuredCount: 0 }),
    );
    if (ok) setNewTitle("");
  }

  async function handleRemove(row: ConceptualRow) {
    const confirmed = await confirmAction({
      title: `Excluir "${row.title}"?`,
      description:
        row.measuredCount > 0
          ? `Os ${row.measuredCount} objetivo(s) metrificado(s) dele também serão excluídos.`
          : undefined,
      destructive: true,
    });
    if (confirmed) remove(row.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
        {[{ id: "", label: "Todos", n: rows.length }].concat(
          STATUS_ORDER.filter((s) => counts(s) > 0).map((s) => ({
            id: s,
            label: measuredGoalStatusLabels[s],
            n: counts(s),
          })),
        ).map((chip) => (
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
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-text-secondary">
              <th scope="col" className={th}>Objetivo</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Prioridade</th>
              <th scope="col" className={th}>Categoria</th>
              <th scope="col" className={th}>Desafio</th>
              <th scope="col" className={th}>Pilar</th>
              <th scope="col" className={th}>Metrificados</th>
              <th scope="col" className="pb-2"><span className="sr-only">Excluir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="py-2 pr-3 align-top">
                  <InlineEdit
                    value={row.title}
                    ariaLabel="Título do objetivo"
                    onSave={(title) => patch(row.id, { title })}
                  />
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
                    value={row.priorityLevelId ?? ""}
                    options={levelOptions}
                    placeholder="Sem prioridade"
                    ariaLabel="Prioridade"
                    onChange={(id) => patch(row.id, { priorityLevelId: id || null })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <InlineEdit
                    value={row.category ?? ""}
                    placeholder="—"
                    ariaLabel="Categoria"
                    onSave={(category) => patch(row.id, { category: category.trim() || null })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <InlineEdit
                    value={row.challenge ?? ""}
                    placeholder="—"
                    ariaLabel="Desafio"
                    onSave={(challenge) => patch(row.id, { challenge: challenge.trim() || null })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <PillSelect
                    value={row.pillarId}
                    options={pillarOptions}
                    ariaLabel="Pilar"
                    onChange={(pillarId) => patch(row.id, { pillarId })}
                  />
                </td>
                <td className="py-2 pr-3 align-top text-text-secondary">{row.measuredCount}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-text-secondary">
          {rows.length === 0 ? "Nenhum objetivo conceitual ainda." : "Nada com esse status."}
        </p>
      )}

      {pillars.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Crie um pilar na aba Pilares antes de cadastrar objetivos.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Novo objetivo conceitual"
            aria-label="Título do novo objetivo"
            className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={newPillarId}
            onChange={(e) => setNewPillarId(e.target.value)}
            aria-label="Pilar do novo objetivo"
            className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
