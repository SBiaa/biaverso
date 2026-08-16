"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, ErrorNote, Modal, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { projectStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(projectStatusLabels);

/** Projeto existente, com as datas já em "YYYY-MM-DD" para os inputs. */
export type ProjectFormValues = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  clientId: string | null;
};

type ProjectFormModalProps = {
  businessId: string;
  clientId?: string;
  /** Projeto do próprio negócio, sem cliente do outro lado. */
  isInternal?: boolean;
  /** Preenchido = edita o projeto; vazio = cria um novo. */
  project?: ProjectFormValues;
  /** Com a lista, o formulário deixa trocar o cliente do projeto. */
  clients?: { id: string; name: string }[];
  onClose: () => void;
};

export function ProjectFormModal({
  businessId,
  clientId,
  isInternal = false,
  project,
  clients,
  onClose,
}: ProjectFormModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? "EM_ANDAMENTO",
    startDate: project?.startDate ?? "",
    endDate: project?.endDate ?? "",
    clientId: project?.clientId ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    // Data em branco vai como null: o campo aceita data ou nada, e "" era
    // recusado na validação como data inválida.
    const payload = {
      name: form.name,
      description: form.description,
      status: form.status,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    try {
      if (project) {
        const chosenClient = clients ? form.clientId || null : project.clientId;
        await api.patch(`/api/projects/${project.id}`, {
          ...payload,
          clientId: chosenClient,
          // Sem cliente do outro lado, o projeto é interno do negócio.
          isInternal: !chosenClient,
        });
      } else {
        await api.post("/api/projects", { ...payload, businessId, clientId, isInternal });
      }
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const title = project
    ? "Editar projeto"
    : isInternal
      ? "Novo projeto interno"
      : "Novo projeto";

  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={handleSubmit}
    >

      <input
        placeholder="Nome"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        placeholder="Descrição (opcional)"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <select
        value={form.status}
        onChange={(e) => update("status", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      >
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {projectStatusLabels[s]}
          </option>
        ))}
      </select>

      {clients && (
        <div>
          <p className="mb-1 text-xs text-text-secondary">Cliente</p>
          <select
            value={form.clientId}
            onChange={(e) => update("clientId", e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Projeto interno (sem cliente)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <p className="mb-1 text-xs text-text-secondary">Início</p>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex-1">
          <p className="mb-1 text-xs text-text-secondary">Fim</p>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <ErrorNote message={error} />

      <div className="mt-2 flex gap-2">
        <Button type="submit" disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
