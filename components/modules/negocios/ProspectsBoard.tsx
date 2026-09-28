"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { AttentionBadge, attentionFromDueDate, Card, StatCard } from "@/components/ui";
import { ClientAvatar } from "@/components/modules/clientes/ClientAvatar";
import { ProspectModal } from "./ProspectModal";
import { NewProspectForm } from "./NewProspectForm";
import { prospectOpenStages, prospectStageLabels, leadSourceLabels } from "@/lib/labels";
import { cn, formatCurrencyBRL, formatDateBR, todayUtc } from "@/lib/utils";
import type { ProspectOverview } from "@/lib/ace-shared";

export function ProspectsBoard({
  businessId,
  prospects,
}: {
  businessId: string;
  prospects: ProspectOverview[];
}) {
  const [editing, setEditing] = useState<ProspectOverview | null>(null);
  const today = todayUtc();

  const overdueCount = prospects.filter(
    (p) => p.nextFollowUpAt && attentionFromDueDate(p.nextFollowUpAt, today) === "atrasado",
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
          <StatCard label="Prospects em aberto" value={prospects.length} />
          <StatCard
            label="Follow-up atrasado"
            value={overdueCount}
            valueClassName={overdueCount > 0 ? "text-danger" : undefined}
          />
        </div>
        <NewProspectForm businessId={businessId} />
      </div>

      {prospects.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum prospect em aberto neste negócio.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {prospectOpenStages.map((stage) => {
            const items = prospects.filter((p) => p.stage === stage);
            return (
              <div key={stage} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  {prospectStageLabels[stage]}{" "}
                  <span className="font-normal text-text-secondary">({items.length})</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-text-secondary">Nada por aqui.</p>
                  ) : (
                    items.map((p) => {
                      const level = p.nextFollowUpAt
                        ? attentionFromDueDate(p.nextFollowUpAt, today)
                        : "neutro";
                      return (
                        <Card
                          key={p.linkId}
                          className="flex cursor-pointer flex-col gap-1.5 p-3 transition-colors hover:bg-hover"
                          onClick={() => setEditing(p)}
                        >
                          <div className="flex items-center gap-2">
                            <ClientAvatar client={p} size="md" />
                            <p className="min-w-0 truncate text-sm font-medium text-text-primary">
                              {p.name}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {p.source && (
                              <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                                {leadSourceLabels[p.source]}
                              </span>
                            )}
                            {p.proposalValue != null && (
                              <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                                {formatCurrencyBRL(p.proposalValue)}
                              </span>
                            )}
                          </div>
                          {p.nextFollowUpAt && (
                            <div
                              className={cn(
                                "flex items-center gap-1 text-xs",
                                level === "atrasado" && "font-medium text-danger",
                                level === "atencao" && "font-medium text-warning-soft-text",
                                level === "ok" && "text-text-secondary",
                              )}
                            >
                              <Clock size={12} />
                              {formatDateBR(new Date(p.nextFollowUpAt))}
                              {level === "atrasado" && (
                                <AttentionBadge level="atrasado">Atrasado</AttentionBadge>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <ProspectModal prospect={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
