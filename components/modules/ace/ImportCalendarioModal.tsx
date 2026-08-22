"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorNote, Modal, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { socialNetworkLabels } from "@/lib/labels";
import { INTERNAL_CLIENT, projectsForClient, type ClientOption, type ProjectOption } from "./ContentPostModal";
import { ClientOptions } from "./ClientOptions";

const networkOptions = Object.keys(socialNetworkLabels);

/**
 * Cola o mesmo JSON que o gerador externo de cronograma de conteúdo já
 * produz (a dona usa isso hoje noutra ferramenta) e cria/atualiza os
 * `ContentPost` daqui — reimportar o mesmo mês atualiza em vez de duplicar.
 */
export function ImportCalendarioModal({
  businessId,
  clients,
  projects,
  onClose,
}: {
  businessId: string;
  clients: ClientOption[];
  projects: ProjectOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [jsonText, setJsonText] = useState("");
  const [network, setNetwork] = useState(networkOptions[0]);
  const [clientId, setClientId] = useState(clients[0]?.id ?? INTERNAL_CLIENT);
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientProjects = projectsForClient(projects, clientId);

  async function handleSubmit() {
    setError(null);

    let calendario: unknown;
    try {
      calendario = JSON.parse(jsonText);
    } catch {
      setError("Isso não é um JSON válido.");
      return;
    }

    setSaving(true);
    try {
      const result = await api.post<{ created: number; updated: number; total: number }>(
        "/api/ace/import-calendario",
        {
          businessId,
          clientId: clientId || null,
          projectId: projectId || null,
          network,
          calendario,
        },
      );
      router.refresh();
      notify(
        `${result.total} post${result.total === 1 ? "" : "s"} — ${result.created} novo${result.created === 1 ? "" : "s"}, ${result.updated} atualizado${result.updated === 1 ? "" : "s"}.`,
      );
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Importar calendário do bot" size="md" onClose={onClose} onSubmit={handleSubmit}>
      <p className="text-xs text-text-secondary">
        Cola aqui o JSON gerado pelo cronograma de conteúdo. Cada post vira um item no calendário —
        importar o mesmo mês de novo atualiza os posts já criados em vez de duplicar.
      </p>

      <textarea
        placeholder='{ "cliente": { ... }, "posts": [ ... ] }'
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        rows={10}
        className="rounded-md border border-border px-3 py-1.5 font-mono text-xs outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {networkOptions.map((n) => (
            <option key={n} value={n}>
              {socialNetworkLabels[n]}
            </option>
          ))}
        </select>
        <select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setProjectId("");
          }}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          <option value={INTERNAL_CLIENT}>Projeto interno</option>
          <ClientOptions clients={clients} />
        </select>
      </div>

      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Sem projeto</option>
        {clientProjects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
        <Button type="submit" disabled={saving || !jsonText.trim()}>
          {saving ? "Importando…" : "Importar"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
