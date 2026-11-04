"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { Button, ErrorNote, IconButton, InlineEdit } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { pillarKindLabels, pillarStatusLabels } from "@/lib/labels";
import { PILLAR_COLORS, VISION_TONES, getPillarIcon } from "@/lib/vision-visuals";
import { hexToRgba } from "@/lib/utils";
import { PillSelect, type PillOption } from "./cells";
import { PillarFormModal } from "./PillarFormModal";
import { useRows } from "./useRows";

export type PillarRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  status: string;
  kind: string;
  /** Objetivos metrificados em andamento sob este pilar. */
  inProgressCount: number;
  /** Negócios ligados ao pilar (a ligação mora no negócio: Business.pillarId). */
  businesses: { id: string; name: string; color: string }[];
};

const toOptions = (labels: Record<string, string>): PillOption[] =>
  Object.entries(labels).map(([value, label]) => ({
    value,
    label,
    color: VISION_TONES[value],
  }));

const statusOptions = toOptions(pillarStatusLabels);
const kindOptions = toOptions(pillarKindLabels);

const th = "pb-2 pr-3 font-medium";

/** Negócio ativo, com o pilar em que está hoje (para avisar quando vai mudar). */
export type PillarBusinessOption = {
  id: string;
  name: string;
  color: string;
  pillarId: string | null;
};

/**
 * "+ negócio" da coluna Negócios. Lista os negócios que ainda não estão neste
 * pilar; os que já têm outro pilar mostram qual, porque escolher aqui muda o
 * pilar deles (cada negócio fica em um pilar só).
 */
function AddBusinessSelect({
  pillarId,
  businesses,
  pillarNames,
  disabled,
  onPick,
}: {
  pillarId: string;
  businesses: PillarBusinessOption[];
  pillarNames: Record<string, string>;
  disabled: boolean;
  onPick: (businessId: string) => void;
}) {
  const options = businesses.filter((b) => b.pillarId !== pillarId);
  if (options.length === 0) return null;

  return (
    <select
      value=""
      disabled={disabled}
      onChange={(e) => e.target.value && onPick(e.target.value)}
      aria-label="Ligar um negócio a este pilar"
      className="max-w-[9rem] cursor-pointer rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-[11px] text-text-secondary outline-none hover:text-text-primary focus:ring-2 focus:ring-accent disabled:opacity-50"
    >
      <option value="">+ negócio</option>
      {options.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
          {b.pillarId && pillarNames[b.pillarId] ? ` (sai de ${pillarNames[b.pillarId]})` : ""}
        </option>
      ))}
    </select>
  );
}

export function PillarsTable({
  initialRows,
  businesses,
}: {
  initialRows: PillarRow[];
  businesses: PillarBusinessOption[];
}) {
  const router = useRouter();
  const { rows, error, patch, add } = useRows(initialRows, "/api/vision/pillars");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<PillarRow | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const pillarNames = Object.fromEntries(rows.map((r) => [r.id, r.name]));

  // A ligação mora no negócio (Business.pillarId); depois de gravar, o refresh
  // traz a tabela e a lista de negócios de novo do servidor.
  async function setBusinessPillar(businessId: string, pillarId: string | null) {
    setLinking(true);
    setLinkError(null);
    try {
      await api.patch(`/api/businesses/${businessId}`, { pillarId });
      router.refresh();
    } catch (e) {
      setLinkError(errorMessage(e));
    } finally {
      setLinking(false);
    }
  }

  async function create() {
    const name = newName.trim();
    if (!name) return;

    const color = PILLAR_COLORS[rows.length % PILLAR_COLORS.length];
    const ok = await add<{ id: string } & Omit<PillarRow, "inProgressCount" | "businesses">>(
      { name, color },
      (created) => ({ ...created, inProgressCount: 0, businesses: [] }),
    );
    if (ok) setNewName("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-text-secondary">
              <th scope="col" className={th}>Pilar</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Tipo</th>
              <th scope="col" className={th}>Objetivos em andamento</th>
              <th scope="col" className="pb-2 font-medium">Negócios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const Icon = getPillarIcon(row.icon);
              return (
                <tr key={row.id}>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: hexToRgba(row.color, 0.14), color: row.color }}
                      >
                        <Icon size={14} />
                      </span>
                      <InlineEdit
                        value={row.name}
                        ariaLabel="Nome do pilar"
                        onSave={(name) => patch(row.id, { name })}
                      />
                      <Link
                        href={`/visao/${row.id}`}
                        className="text-xs text-text-secondary hover:text-text-primary hover:underline"
                      >
                        Abrir
                      </Link>
                      <IconButton
                        onClick={() => setEditing(row)}
                        aria-label={`Editar ${row.name}`}
                        title="Cor, ícone e descrição"
                      >
                        <Pencil size={14} />
                      </IconButton>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <PillSelect
                      value={row.status}
                      options={statusOptions}
                      ariaLabel="Status do pilar"
                      onChange={(status) => patch(row.id, { status })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <PillSelect
                      value={row.kind}
                      options={kindOptions}
                      ariaLabel="Tipo do pilar"
                      onChange={(kind) => patch(row.id, { kind })}
                    />
                  </td>
                  <td className="py-2 pr-3 text-text-secondary">{row.inProgressCount}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {row.businesses.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full py-0.5 pl-2 pr-1 text-[11px] font-medium"
                          style={{ backgroundColor: hexToRgba(b.color, 0.12), color: b.color }}
                        >
                          <Link href={`/negocios/${b.id}`} className="hover:underline">
                            {b.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setBusinessPillar(b.id, null)}
                            disabled={linking}
                            aria-label={`Tirar ${b.name} deste pilar`}
                            title="Tirar deste pilar"
                            className="rounded-full p-0.5 opacity-60 hover:opacity-100 disabled:opacity-30"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                      <AddBusinessSelect
                        pillarId={row.id}
                        businesses={businesses}
                        pillarNames={pillarNames}
                        disabled={linking}
                        onPick={(businessId) => setBusinessPillar(businessId, row.id)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-text-secondary">Nenhum pilar ainda.</p>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Novo pilar"
          aria-label="Nome do novo pilar"
          className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button variant="secondary" onClick={create} disabled={!newName.trim()}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      <ErrorNote message={error ?? linkError} />

      {editing && (
        <PillarFormModal
          mode="edit"
          initial={editing}
          onClose={() => {
            setEditing(null);
            // O modal grava no servidor e só atualiza a tela por refresh.
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
