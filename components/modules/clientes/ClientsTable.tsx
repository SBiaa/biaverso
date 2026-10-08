"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { BusinessBadge, Card, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { prospectStageLabels, leadSourceLabels } from "@/lib/labels";
import { cn, formatDateBR } from "@/lib/utils";
import { ClientAvatar } from "./ClientAvatar";

export type ClientRow = {
  id: string;
  name: string;
  color: string | null;
  photo: string | null;
  niche: string | null;
  contact: string;
  links: {
    id: string;
    status: string;
    stage: string | null;
    business: { name: string; color: string };
  }[];
  /** Origem do primeiro prospect em aberto. */
  source: string | null;
  /** Contato mais recente entre os prospects em aberto (ISO). */
  lastContactAt: string | null;
  /** Follow-up mais próximo entre os prospects em aberto (ISO). */
  nextFollowUpAt: string | null;
  followUpOverdue: boolean;
  /** Vínculos PROSPECT — é neles que o "contatei hoje" grava. */
  prospectLinks: { id: string; stage: string | null }[];
};

const th = "px-3 py-2 text-left text-xs font-medium text-text-secondary whitespace-nowrap";
const td = "px-3 py-2.5 align-middle text-sm";

function dateCell(iso: string | null) {
  return iso ? formatDateBR(new Date(iso)) : "—";
}

/** Lista de clientes e prospects em tabela, com "contatei hoje" em um clique. */
export function ClientsTable({
  rows,
  mode,
}: {
  rows: ClientRow[];
  mode: "cliente" | "prospect";
}) {
  const pipeline = mode === "prospect";
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function markContacted(row: ClientRow) {
    setBusyId(row.id);
    try {
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });
      await Promise.all(
        row.prospectLinks.map((link) =>
          api.patch(`/api/client-business/${link.id}`, {
            lastContactAt: today,
            // Quem ainda estava em "Novo contato" passa pra "Contato feito".
            ...(link.stage === "NOVO_CONTATO" || link.stage === null
              ? { prospectStage: "CONTATO_FEITO" }
              : {}),
          }),
        ),
      );
      router.refresh();
      notify("Contato registrado.");
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] border-collapse">
        <thead className="border-b border-border">
          <tr>
            <th className={th}>Cliente</th>
            <th className={th}>Nicho</th>
            <th className={th}>{pipeline ? "Negócio / etapa" : "Negócios"}</th>
            {pipeline && (
              <>
                <th className={th}>Último contato</th>
                <th className={th}>Próximo follow-up</th>
                <th className={th}>Origem</th>
                <th className={th} />
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isProspect = row.prospectLinks.length > 0;
            return (
              <tr
                key={row.id}
                className="border-b border-border last:border-b-0 transition-colors hover:bg-hover"
              >
                <td className={td}>
                  <Link href={`/clientes/${row.id}`} className="flex items-center gap-3">
                    <ClientAvatar client={row} />
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">{row.name}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {row.contact || "Sem contato cadastrado"}
                      </p>
                    </div>
                  </Link>
                </td>

                <td className={td}>
                  {row.niche ? (
                    <span className="rounded-full bg-hover px-2.5 py-0.5 text-xs text-text-primary">
                      {row.niche}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>

                <td className={td}>
                  <div className="flex flex-wrap items-center gap-1">
                    {row.links.length === 0 ? (
                      <span className="text-xs text-text-secondary">Sem negócio</span>
                    ) : (
                      row.links.map((link) => (
                        <span key={link.id} className="inline-flex items-center gap-1">
                          <BusinessBadge
                            business={link.business}
                            className={
                              link.status === "ATIVO" || link.status === "PROSPECT"
                                ? undefined
                                : "opacity-50"
                            }
                          />
                          {pipeline && link.status === "PROSPECT" && (
                            <span className="rounded-full bg-warning-soft-bg px-2 py-0.5 text-[10px] font-medium text-warning-soft-text">
                              {prospectStageLabels[link.stage ?? "NOVO_CONTATO"]}
                            </span>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </td>

                {pipeline && (
                  <>
                    <td className={td}>
                      {isProspect && !row.lastContactAt ? (
                        <span className="text-xs font-medium text-warning-soft-text">
                          Ainda não contatei
                        </span>
                      ) : (
                        <span className="text-text-secondary">{dateCell(row.lastContactAt)}</span>
                      )}
                    </td>

                    <td className={td}>
                      <span
                        className={cn(
                          row.followUpOverdue ? "font-medium text-danger" : "text-text-secondary",
                        )}
                      >
                        {dateCell(row.nextFollowUpAt)}
                        {row.followUpOverdue && " · atrasado"}
                      </span>
                    </td>

                    <td className={cn(td, "text-text-secondary")}>
                      {row.source ? leadSourceLabels[row.source] : "—"}
                    </td>

                    <td className={cn(td, "text-right")}>
                      {isProspect && (
                        <button
                          type="button"
                          onClick={() => markContacted(row)}
                          disabled={busyId === row.id}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-primary transition-colors hover:bg-surface disabled:opacity-50"
                        >
                          <Check size={13} />
                          Contatei hoje
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
