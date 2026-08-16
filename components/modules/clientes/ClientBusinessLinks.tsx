"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Link2Off } from "lucide-react";
import { BusinessBadge, Button, ErrorNote, IconButton } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { clientStatusLabels } from "@/lib/labels";
import { formatDateBR } from "@/lib/utils";

type Link = {
  id: string;
  businessId: string;
  status: string;
  joinedAt: string;
  business: { name: string; color: string };
};

type BusinessOption = { id: string; name: string };

const statusOptions = Object.keys(clientStatusLabels);

/**
 * Negócios de um cliente: vincular, mudar status e desvincular.
 *
 * O mesmo cliente pode atender Ace e Creative ao mesmo tempo — cada vínculo tem
 * status próprio, então ele pode estar ativo num e inativo no outro.
 */
export function ClientBusinessLinks({
  clientId,
  links,
  allBusinesses,
}: {
  clientId: string;
  links: Link[];
  allBusinesses: BusinessOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(links);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = allBusinesses.filter(
    (b) => !items.some((l) => l.businessId === b.id),
  );
  const [selected, setSelected] = useState(available[0]?.id ?? "");

  async function addLink() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/clients/${clientId}/business-links`, {
        businessId: selected,
      });
      setAdding(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(linkId: string, status: string) {
    const previous = items;
    setError(null);
    setItems((prev) => prev.map((l) => (l.id === linkId ? { ...l, status } : l)));
    try {
      await api.patch(`/api/client-business/${linkId}`, { status });
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  async function removeLink(linkId: string) {
    const previous = items;
    setError(null);
    setItems((prev) => prev.filter((l) => l.id !== linkId));
    try {
      await api.delete(`/api/client-business/${linkId}`);
      router.refresh();
    } catch (e) {
      setItems(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="text-sm text-text-secondary">
          Este cliente ainda não está em nenhum negócio.
        </p>
      )}

      {items.map((link) => (
        <div key={link.id} className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BusinessBadge business={link.business} />
            <span className="text-xs text-text-secondary">
              desde {formatDateBR(new Date(link.joinedAt))}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <select
              value={link.status}
              onChange={(e) => changeStatus(link.id, e.target.value)}
              aria-label={`Status em ${link.business.name}`}
              className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {clientStatusLabels[s]}
                </option>
              ))}
            </select>
            <IconButton
              onClick={() => removeLink(link.id)}
              title={`Desvincular de ${link.business.name}`}
              aria-label={`Desvincular de ${link.business.name}`}
              tone="danger"
            >
              <Link2Off size={15} />
            </IconButton>
          </div>
        </div>
      ))}

      {available.length > 0 &&
        (adding ? (
          <div className="flex flex-wrap gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              {available.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Button onClick={addLink} disabled={saving}>
              Vincular
            </Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setAdding(true)}
            className="self-start"
          >
            <Plus size={14} />
            Vincular a outro negócio
          </Button>
        ))}

      <ErrorNote message={error} />
    </div>
  );
}
