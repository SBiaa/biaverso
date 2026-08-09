"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { formatUtcDateBR } from "@/lib/utils";
import { KANBAN_COLUMNS } from "@/lib/ace-shared";
import { ContentPostModal, type ClientOption, type ProjectOption, type PostRecord } from "./ContentPostModal";
import { ProductionTaskModal, type TaskRecord } from "./ProductionTaskModal";

export type KanbanItem = {
  id: string;
  kind: "post" | "task";
  title: string;
  typeLabel: string;
  clientName: string;
  date: string | null;
  overdue: boolean;
  column: string;
  record: PostRecord | TaskRecord;
};

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

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnItems = items.filter((i) => i.column === column.key);
          return (
            <div key={column.key} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                {column.label}{" "}
                <span className="font-normal text-text-secondary">({columnItems.length})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {columnItems.length === 0 ? (
                  <p className="text-xs text-text-secondary">Nada por aqui.</p>
                ) : (
                  columnItems.map((item) => (
                    <Card
                      key={`${item.kind}-${item.id}`}
                      className="flex cursor-pointer flex-col gap-1.5 p-3 transition-colors hover:bg-black/[0.02]"
                      onClick={() => setEditing(item)}
                    >
                      <p className="text-sm font-medium text-text-primary">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                          {item.clientName}
                        </span>
                        <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                          {item.typeLabel}
                        </span>
                        {item.overdue && (
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white">
                            Atrasado
                          </span>
                        )}
                      </div>
                      {item.date && (
                        <span className="text-xs text-text-secondary">
                          {formatUtcDateBR(new Date(item.date))}
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
