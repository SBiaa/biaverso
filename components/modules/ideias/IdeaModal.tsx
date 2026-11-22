"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FolderKanban, Trash2 } from "lucide-react";
import {
  Button,
  confirmAction,
  ErrorNote,
  Field,
  fieldClass,
  Modal,
  ModalActions,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { ideaStatusLabels } from "@/lib/labels";
import { projectHref } from "@/lib/projects-shared";
import type { Idea } from "./IdeaCard";
import { capturedLabel, PESSOAL_LABEL } from "./labels";

type Business = { id: string; name: string };

/**
 * A ideia inteira, para ler e editar. O card mostra só o começo do texto;
 * aqui ele aparece completo, com as quebras de linha, e é onde se muda
 * destino e status, se apaga e se transforma a ideia em projeto.
 */
export function IdeaModal({
  idea,
  businesses,
  onClose,
}: {
  idea: Idea;
  businesses: Business[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: idea.title,
    description: idea.description ?? "",
    businessId: idea.businessId ?? "",
    status: idea.status,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    form.title !== idea.title ||
    form.description !== (idea.description ?? "") ||
    form.businessId !== (idea.businessId ?? "") ||
    form.status !== idea.status;

  async function save() {
    if (!form.title.trim()) return;
    if (!dirty) return onClose();
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/ideas/${idea.id}`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        businessId: form.businessId || null,
        status: form.status,
      });
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const confirmed = await confirmAction({
      title: `Apagar "${idea.title}"?`,
      description: idea.project
        ? "O projeto que nasceu dela continua existindo."
        : "Não dá para desfazer.",
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/api/ideas/${idea.id}`);
      router.refresh();
      notify("Ideia apagada.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function toProject() {
    // O projeto nasce do que está gravado: alterações não salvas iriam se
    // perder ou criar um projeto com um nome diferente do da ideia.
    if (dirty) {
      setError("Salve as alterações antes de transformar em projeto.");
      return;
    }
    const business = businesses.find((b) => b.id === idea.businessId);
    const confirmed = await confirmAction({
      title: "Transformar em projeto?",
      description: `Cria o projeto "${idea.title}" em ${business?.name ?? "o negócio"}, com a descrição desta ideia, e marca a ideia como "Virou projeto".`,
      confirmLabel: "Criar projeto",
    });
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const { href } = await api.post<{ href: string }>(`/api/ideas/${idea.id}/project`, {});
      notify("Projeto criado.");
      router.push(href);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Modal title="Ideia" onClose={onClose} onSubmit={save} size="md">
      <Field label="Ideia">
        <input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className={fieldClass}
        />
      </Field>
      <Field label="Detalhes">
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Contexto, links, números…"
          rows={Math.min(14, Math.max(4, form.description.split("\n").length + 1))}
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Para onde vai">
          <select
            value={form.businessId}
            onChange={(e) => setForm((p) => ({ ...p, businessId: e.target.value }))}
            // Depois de virar projeto, o negócio é o do projeto.
            disabled={!!idea.project}
            className={fieldClass}
          >
            <option value="">{PESSOAL_LABEL}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className={fieldClass}
          >
            {Object.entries(ideaStatusLabels)
              // "Virou projeto" se marca criando o projeto, não na mão — a não
              // ser que já esteja assim.
              .filter(([s]) => s !== "VIROU_PROJETO" || idea.status === s)
              .map(([s, label]) => (
                <option key={s} value={s}>
                  {label}
                </option>
              ))}
          </select>
        </Field>
      </div>

      {/* O que a ideia virou, ou o caminho para virar. */}
      {idea.project ? (
        <Link
          href={projectHref(idea.project.businessId, idea.project.id)}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-hover"
        >
          <FolderKanban size={16} className="shrink-0 text-accent-ink" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-text-secondary">Virou o projeto</span>
            <span className="block truncate font-medium text-text-primary">{idea.project.name}</span>
          </span>
          <ArrowUpRight size={16} className="shrink-0 text-text-secondary" aria-hidden />
        </Link>
      ) : idea.businessId ? (
        <Button variant="secondary" onClick={toProject} disabled={busy} className="self-start">
          <FolderKanban size={15} aria-hidden />
          Transformar em projeto
        </Button>
      ) : (
        <p className="text-xs text-text-secondary">
          Para transformar em projeto, escolha um negócio em &quot;Para onde vai&quot; e salve.
        </p>
      )}

      <p className="text-xs text-text-secondary">Capturada {capturedLabel(idea.createdAt)}.</p>

      <ErrorNote message={error} />

      <div className="flex items-center justify-between gap-2">
        <ModalActions>
          <Button type="submit" disabled={busy || !form.title.trim()}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
        </ModalActions>
        <Button
          variant="ghost"
          onClick={remove}
          disabled={busy}
          className="mt-2 text-danger hover:bg-danger-soft-bg"
          aria-label={`Apagar a ideia ${idea.title}`}
        >
          <Trash2 size={15} aria-hidden />
          Apagar
        </Button>
      </div>
    </Modal>
  );
}
