"use client";

import { useState, type CSSProperties } from "react";
import { useStoredPreference } from "@/hooks/useStoredPreference";
import { ChevronRight } from "lucide-react";
import { AttentionBadge, Card } from "@/components/ui";
import { cn, formatDateBR } from "@/lib/utils";
import { KANBAN_COLUMNS } from "@/lib/ace-shared";
import { ContentPostModal, type ClientOption, type ProjectOption, type PostRecord } from "./ContentPostModal";
import { ProductionTaskModal, type TaskRecord } from "./ProductionTaskModal";

export type KanbanItem = {
  id: string;
  kind: "post" | "task";
  title: string;
  typeLabel: string;
  /** Null = item interno do negócio, sem cliente do outro lado. */
  clientName: string | null;
  /** Cor efetiva da clienta; null quando interno. */
  clientColor: string | null;
  date: string | null;
  overdue: boolean;
  column: string;
  record: PostRecord | TaskRecord;
};

/** Colunas que começam recolhidas: só acumulam, e não pedem ação. */
const DEFAULT_COLLAPSED: string[] = ["CONCLUIDO", "PRAZO_PERDIDO"];
const COLLAPSED_KEY = "kanban-recolhidas";

function ClientPill({ name, color }: { name: string | null; color: string | null }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        !name && "bg-accent/10 text-accent",
      )}
      style={
        color
          ? {
              // O texto puxa para a cor do tema: a cor pura da clienta (um
              // vermelho escuro, por exemplo) some em cima do próprio fundo
              // no modo escuro.
              color: `color-mix(in srgb, ${color} 45%, var(--text-primary))`,
              backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
            }
          : undefined
      }
    >
      {name ?? "Interno"}
    </span>
  );
}

export function KanbanBoard({
  businessId,
  items,
  clients,
  projects,
}: {
  businessId: string;
  items: KanbanItem[];
  clients: ClientOption[];
  projects: ProjectOption[];
}) {
  const [editing, setEditing] = useState<KanbanItem | null>(null);
  // Guardado como "CHAVE,CHAVE" — ver o porquê da string em useStoredPreference.
  const [storedCollapsed, setStoredCollapsed] = useStoredPreference(
    COLLAPSED_KEY,
    DEFAULT_COLLAPSED.join(","),
  );
  const collapsed = storedCollapsed ? storedCollapsed.split(",") : [];

  function toggleColumn(key: string) {
    const next = collapsed.includes(key)
      ? collapsed.filter((k) => k !== key)
      : [...collapsed, key];
    setStoredCollapsed(next.join(","));
  }

  // No desktop a coluna recolhida vira um trilho estreito e as abertas
  // dividem o espaço que sobrou.
  const template = KANBAN_COLUMNS.map((c) =>
    collapsed.includes(c.key) ? "2.75rem" : "minmax(0,1fr)",
  ).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div
        style={{ "--kanban-cols": template } as CSSProperties}
        className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:[grid-template-columns:var(--kanban-cols)]"
      >
        {KANBAN_COLUMNS.map((column) => {
          const columnItems = items.filter((i) => i.column === column.key);
          const isCollapsed = collapsed.includes(column.key);

          if (isCollapsed) {
            return (
              <button
                key={column.key}
                type="button"
                onClick={() => toggleColumn(column.key)}
                aria-expanded={false}
                title={`Mostrar ${column.label}`}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm",
                  "text-text-secondary transition-colors hover:bg-hover hover:text-text-primary",
                  // Trilho vertical no desktop: o rótulo gira para caber em 44px.
                  "lg:sticky lg:top-[4.5rem] lg:h-[calc(100dvh-6rem)] lg:flex-col lg:px-0 lg:py-3",
                )}
              >
                <ChevronRight size={14} className="shrink-0 lg:rotate-90" />
                <span className="font-semibold text-text-primary lg:[writing-mode:vertical-rl]">
                  {column.label}
                </span>
                <span className="text-xs">{columnItems.length}</span>
              </button>
            );
          }

          return (
            // No desktop cada coluna rola sozinha, com o título preso no alto:
            // antes ela crescia junto com a página e uma coluna de 92 cards
            // levava todos os títulos embora no primeiro scroll.
            <div
              key={column.key}
              className="flex min-w-0 flex-col gap-2 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 scrollbar-slim"
            >
              <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 bg-background pb-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  {column.label}{" "}
                  <span className="font-normal text-text-secondary">({columnItems.length})</span>
                </h3>
                {DEFAULT_COLLAPSED.includes(column.key) && (
                  <button
                    type="button"
                    onClick={() => toggleColumn(column.key)}
                    aria-expanded
                    className="rounded px-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Recolher
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {columnItems.length === 0 ? (
                  <p className="text-xs text-text-secondary">Nada por aqui.</p>
                ) : (
                  columnItems.map((item) => (
                    <Card
                      key={`${item.kind}-${item.id}`}
                      className="flex cursor-pointer flex-col gap-1.5 p-3 transition-colors hover:bg-hover"
                      onClick={() => setEditing(item)}
                    >
                      <p className="text-sm font-medium text-text-primary">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-1">
                        <ClientPill name={item.clientName} color={item.clientColor} />
                        <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                          {item.typeLabel}
                        </span>
                        {item.overdue && (
                          <AttentionBadge level="atrasado">
                            Atrasado
                          </AttentionBadge>
                        )}
                      </div>
                      {item.date && (
                        <span className="text-xs text-text-secondary">
                          {formatDateBR(new Date(item.date))}
                        </span>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && editing.kind === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          post={editing.record as PostRecord}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && editing.kind === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projects}
          task={editing.record as TaskRecord}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
