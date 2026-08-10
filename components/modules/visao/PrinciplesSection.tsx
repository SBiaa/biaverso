"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { PrincipleFormModal } from "./PrincipleFormModal";

type Principle = { id: string; title: string; body: string | null };

export function PrinciplesSection({
  pillarId,
  initialPrinciples,
}: {
  pillarId: string;
  initialPrinciples: Principle[];
}) {
  const [principles, setPrinciples] = useState(initialPrinciples);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Principle | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setPrinciples(await api.get<Principle[]>(`/api/vision/principles?pillarId=${pillarId}`));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDelete(id: string) {
    const previous = principles;
    setError(null);
    setPrinciples((prev) => prev.filter((p) => p.id !== id));

    try {
      await api.delete(`/api/vision/principles/${id}`);
    } catch (e) {
      setPrinciples(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          Centro de Alinhamento — Princípios
        </h2>
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <Plus size={14} />
          Novo princípio
        </Button>
      </div>

      <ErrorNote message={error} />

      {principles.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum princípio cadastrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {principles.map((principle) => {
            const isExpanded = expandedId === principle.id;
            return (
              <Card key={principle.id} className="flex flex-col gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : principle.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setExpandedId(isExpanded ? null : principle.id);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between gap-2 text-left"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {principle.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(principle);
                      }}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(principle.id);
                      }}
                      className="text-text-secondary hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-text-secondary transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </div>
                {isExpanded && principle.body && (
                  <p className="whitespace-pre-wrap text-sm text-text-secondary">
                    {principle.body}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {creating && (
        <PrincipleFormModal
          pillarId={pillarId}
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <PrincipleFormModal
          pillarId={pillarId}
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
