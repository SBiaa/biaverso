"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  confirmAction,
  ErrorNote,
  Modal,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  postTypeLabels,
  socialNetworkLabels,
  contentStatusLabels,
  contentPilarLabels,
} from "@/lib/labels";
import {
  addUtcDays,
  formatDateBR,
  getMonthRange,
  parseDateOnly,
  toDateInputValue,
  todayUtc,
} from "@/lib/utils";
import { ClientOptions } from "./ClientOptions";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const typeOptions = Object.keys(postTypeLabels);
const networkOptions = Object.keys(socialNetworkLabels);
const statusOptions = Object.keys(contentStatusLabels);

/** `linked` = já tem vínculo com o negócio da tela; os demais vêm de outros negócios. */
export type ClientOption = { id: string; name: string; linked: boolean };
export type ProjectOption = { id: string; name: string; clientId: string | null; createdAt: string };

export type PostRecord = {
  id: string;
  title: string;
  type: string;
  network: string;
  status: string;
  publishDate: string | null;
  completedAt: string | null;
  caption: string | null;
  notes: string | null;
  /** Null = post interno do próprio negócio. */
  clientId: string | null;
  projectId: string | null;
  /** Só vêm preenchidos em post importado do gerador externo de conteúdo. */
  pilar?: string | null;
  objective?: string | null;
  hook?: string | null;
  cta?: string | null;
  hashtags?: string[];
  slides?: unknown;
  script?: unknown;
  visualBrief?: unknown;
  storySupport?: string | null;
};
type PostInitial = PostRecord;

type Slide = { numero: number; texto: string };
type RoteiroItem = { tempo: string; acao: string; fala: string };
type BriefingVisual = {
  conceito: string;
  elementos: string[];
  texto_na_arte: string;
  paleta: string;
  referencia: string | null;
  prompt_imagem: string | null;
};

/** "" no form = projeto interno; no payload isso vira `null`. */
export const INTERNAL_CLIENT = "";

function dateInputValue(date: string | Date | null) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayInputValue() {
  return dateInputValue(new Date());
}

/** Projetos de um cliente — ou os internos, quando `clientId` é "". */
export function projectsForClient(projects: ProjectOption[], clientId: string) {
  return projects.filter((p) => (p.clientId ?? INTERNAL_CLIENT) === clientId);
}

function mostRecentProjectId(projects: ProjectOption[], clientId: string) {
  const clientProjects = projectsForClient(projects, clientId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return clientProjects[0]?.id ?? "";
}

function emptyForm(
  clients: ClientOption[],
  projects: ProjectOption[],
  defaultClientId?: string,
  defaultProjectId?: string,
  defaultDate?: string,
) {
  const clientId = defaultClientId ?? clients[0]?.id ?? INTERNAL_CLIENT;
  return {
    title: "",
    type: typeOptions[0],
    network: networkOptions[0],
    status: "PLANEJADO",
    publishDate: defaultDate ?? "",
    completedAt: "",
    caption: "",
    notes: "",
    clientId,
    projectId: defaultProjectId ?? mostRecentProjectId(projects, clientId),
  };
}

function formFromPost(post: PostInitial) {
  return {
    title: post.title,
    type: post.type,
    network: post.network,
    status: post.status,
    publishDate: dateInputValue(post.publishDate),
    completedAt: dateInputValue(post.completedAt),
    caption: post.caption ?? "",
    notes: post.notes ?? "",
    clientId: post.clientId ?? INTERNAL_CLIENT,
    projectId: post.projectId ?? "",
  };
}

/**
 * O que veio de um import (gancho, CTA, hashtags, roteiro, briefing visual...)
 * mostrado somente-leitura — título e legenda já ficam editáveis nos campos
 * de cima (é onde `gancho`/`copy` caem). Some inteiro pra post criado à mão.
 */
function ImportedContentDetails({ post }: { post: PostInitial }) {
  const hasHashtags = (post.hashtags?.length ?? 0) > 0;
  const slides = Array.isArray(post.slides) ? (post.slides as Slide[]) : [];
  const roteiro = Array.isArray(post.script) ? (post.script as RoteiroItem[]) : [];
  const briefing = post.visualBrief as BriefingVisual | null | undefined;

  const hasContent =
    post.pilar ||
    post.objective ||
    post.hook ||
    post.cta ||
    post.storySupport ||
    hasHashtags ||
    slides.length > 0 ||
    roteiro.length > 0 ||
    briefing;

  if (!hasContent) return null;

  const sectionTitle =
    "mb-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-hover/40 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Conteúdo importado
      </p>

      {(post.pilar || post.objective) && (
        <div className="flex flex-wrap gap-1.5">
          {post.pilar && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
              {contentPilarLabels[post.pilar] ?? post.pilar}
            </span>
          )}
          {post.objective && (
            <span className="rounded-full bg-hover-strong px-2.5 py-0.5 text-xs text-text-secondary">
              {post.objective}
            </span>
          )}
        </div>
      )}

      {post.hook && (
        <div>
          <p className={sectionTitle}>Gancho</p>
          <p className="leading-relaxed">{post.hook}</p>
        </div>
      )}
      {post.cta && (
        <div>
          <p className={sectionTitle}>CTA</p>
          <p className="leading-relaxed">{post.cta}</p>
        </div>
      )}
      {post.storySupport && (
        <div>
          <p className={sectionTitle}>Story de apoio</p>
          <p className="leading-relaxed">{post.storySupport}</p>
        </div>
      )}

      {slides.length > 0 && (
        <div>
          <p className={sectionTitle}>Slides ({slides.length})</p>
          <ol className="flex flex-col gap-1.5">
            {slides.map((s) => (
              <li
                key={s.numero}
                className="flex gap-2.5 rounded-md border border-border bg-surface p-2"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-hover-strong text-xs font-medium text-text-secondary">
                  {s.numero}
                </span>
                <span className="leading-relaxed">{s.texto}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {roteiro.length > 0 && (
        <div>
          <p className={sectionTitle}>Roteiro</p>
          <ul className="flex flex-col gap-1.5">
            {roteiro.map((r, i) => (
              <li key={i} className="rounded-md border border-border bg-surface p-2">
                <span className="text-xs font-medium text-accent">{r.tempo}</span>
                <p className="leading-relaxed">{r.acao}</p>
                {r.fala && (
                  <p className="mt-0.5 italic text-text-secondary">&ldquo;{r.fala}&rdquo;</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {briefing && (
        <div>
          <p className={sectionTitle}>Briefing visual</p>
          <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-2">
            <p className="leading-relaxed">{briefing.conceito}</p>
            {briefing.elementos?.length > 0 && (
              <p className="text-xs text-text-secondary">
                <span className="font-medium">Elementos:</span> {briefing.elementos.join(", ")}
              </p>
            )}
            {briefing.texto_na_arte && (
              <p className="text-xs text-text-secondary">
                <span className="font-medium">Texto na arte:</span> {briefing.texto_na_arte}
              </p>
            )}
            {briefing.paleta && (
              <p className="text-xs text-text-secondary">
                <span className="font-medium">Paleta:</span> {briefing.paleta}
              </p>
            )}
          </div>
        </div>
      )}

      {hasHashtags && (
        <div className="flex flex-wrap gap-1">
          {post.hashtags!.map((h) => (
            <span key={h} className="rounded bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
              #{h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const fieldClass =
  "w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function ContentPostModal({
  businessId,
  clients,
  projects,
  post,
  defaultClientId,
  defaultProjectId,
  defaultDate,
  onClose,
}: {
  businessId: string;
  clients: ClientOption[];
  projects: ProjectOption[];
  post?: PostInitial;
  defaultClientId?: string;
  defaultProjectId?: string;
  /** "YYYY-MM-DD" — preenche a publicação ao criar a partir de um dia do calendário. */
  defaultDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = !!post;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateDays, setDuplicateDays] = useState<Set<number>>(new Set());
  const [duplicateUntil, setDuplicateUntil] = useState("");
  const [form, setForm] = useState(
    post
      ? formFromPost(post)
      : emptyForm(clients, projects, defaultClientId, defaultProjectId, defaultDate),
  );

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "clientId") {
        next.projectId = mostRecentProjectId(projects, value);
      }
      if (key === "status" && value === "PUBLICADO" && !prev.completedAt) {
        next.completedAt = todayInputValue();
      }
      return next;
    });
  }

  const clientProjects = projectsForClient(projects, form.clientId);

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      businessId,
      clientId: form.clientId || null,
      projectId: form.projectId || null,
      publishDate: form.publishDate || null,
      completedAt: form.completedAt || null,
    };

    try {
      if (isEdit) await api.patch(`/api/ace/posts/${post!.id}`, payload);
      else await api.post("/api/ace/posts", payload);
      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function duplicateBaseDate() {
    return (form.publishDate && parseDateOnly(form.publishDate)) || todayUtc();
  }

  // Abre o painel de repetição já com o dia de semana do post original marcado
  // e limite até o fim do mês — cobre o caso comum ("story toda sexta") com um clique.
  function openDuplicatePanel() {
    if (!isEdit) return;
    const base = duplicateBaseDate();
    const { end } = getMonthRange(base);
    setDuplicateDays(new Set([base.getUTCDay()]));
    setDuplicateUntil(toDateInputValue(addUtcDays(end, -1)));
    setDuplicateOpen(true);
  }

  function toggleDuplicateDay(day: number) {
    setDuplicateDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  // Todas as datas entre o dia seguinte ao post original e o limite escolhido
  // cujo dia da semana está marcado — pode virar 1 data (equivalente ao duplicar
  // antigo) ou uma série inteira (ex.: story todo dia até o fim do mês).
  function duplicateDates(): string[] {
    const until = duplicateUntil ? parseDateOnly(duplicateUntil) : null;
    if (!until || duplicateDays.size === 0) return [];
    const dates: string[] = [];
    let cursor = addUtcDays(duplicateBaseDate(), 1);
    while (cursor.getTime() <= until.getTime()) {
      if (duplicateDays.has(cursor.getUTCDay())) dates.push(toDateInputValue(cursor));
      cursor = addUtcDays(cursor, 1);
    }
    return dates;
  }

  async function handleDuplicate() {
    if (!isEdit) return;
    const dates = duplicateDates();
    if (dates.length === 0) return;
    setSaving(true);
    setError(null);

    const basePayload = {
      title: form.title,
      type: form.type,
      network: form.network,
      status: "PLANEJADO",
      completedAt: null,
      caption: form.caption,
      notes: form.notes,
      businessId,
      clientId: form.clientId || null,
      projectId: form.projectId || null,
    };

    try {
      await Promise.all(
        dates.map((publishDate) => api.post("/api/ace/posts", { ...basePayload, publishDate })),
      );
      router.refresh();
      notify(
        dates.length === 1
          ? `Duplicado para ${formatDateBR(new Date(`${dates[0]}T00:00:00Z`))}.`
          : `Duplicado para ${dates.length} dias.`,
      );
      setDuplicateOpen(false);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    const confirmed = await confirmAction({
      title: "Excluir este post do cronograma?",
      destructive: true,
    });
    if (!confirmed) return;
    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/ace/posts/${post!.id}`);
      router.refresh();
      notify("Excluído.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Editar post" : "Novo post"}
      size="lg"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <Field label="Título">
            <textarea
              placeholder="Título"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              rows={3}
              className={`${fieldClass} resize-y`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Formato">
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className={fieldClass}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {postTypeLabels[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rede">
              <select
                value={form.network}
                onChange={(e) => update("network", e.target.value)}
                className={fieldClass}
              >
                {networkOptions.map((n) => (
                  <option key={n} value={n}>
                    {socialNetworkLabels[n]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className={fieldClass}
            >
              {/* Prazo perdido é gravado pelo sistema; só aparece se já for o status. */}
              {statusOptions
                .filter((s) => s !== "PRAZO_PERDIDO" || form.status === s)
                .map((s) => (
                <option key={s} value={s}>
                  {contentStatusLabels[s]}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Publicação">
              <input
                type="date"
                value={form.publishDate}
                onChange={(e) => update("publishDate", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Finalização">
              <input
                type="date"
                value={form.completedAt}
                onChange={(e) => update("completedAt", e.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>

          <Field label="Negócio">
            <select
              value={form.clientId}
              onChange={(e) => update("clientId", e.target.value)}
              className={fieldClass}
            >
              <option value={INTERNAL_CLIENT}>Projeto interno</option>
              <ClientOptions clients={clients} />
            </select>
          </Field>
          <Field label="Projeto">
            <select
              value={form.projectId}
              onChange={(e) => update("projectId", e.target.value)}
              className={fieldClass}
            >
              <option value="">Sem projeto</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Legenda">
            <textarea
              placeholder="Legenda"
              value={form.caption}
              onChange={(e) => update("caption", e.target.value)}
              rows={5}
              className={`${fieldClass} resize-y`}
            />
          </Field>
          <Field label="Notas">
            <textarea
              placeholder="Notas"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              className={`${fieldClass} resize-y`}
            />
          </Field>

          {post && <ImportedContentDetails post={post} />}
        </div>
      </div>

      {isEdit && duplicateOpen && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-hover/40 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Repetir nos dias
            </p>
            <button
              type="button"
              onClick={() =>
                setDuplicateDays(
                  duplicateDays.size === 7 ? new Set() : new Set([0, 1, 2, 3, 4, 5, 6]),
                )
              }
              className="text-xs text-accent hover:underline"
            >
              {duplicateDays.size === 7 ? "Limpar" : "Todo dia"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => (
              <label key={day} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={duplicateDays.has(day)}
                  onChange={() => toggleDuplicateDay(day)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-text-secondary">até</p>
            <input
              type="date"
              value={duplicateUntil}
              onChange={(e) => setDuplicateUntil(e.target.value)}
              className="rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleDuplicate}
              disabled={saving || duplicateDates().length === 0}
            >
              Duplicar para {duplicateDates().length}{" "}
              {duplicateDates().length === 1 ? "dia" : "dias"}
            </Button>
            <Button variant="ghost" onClick={() => setDuplicateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <ErrorNote message={error} />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        {isEdit && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => (duplicateOpen ? setDuplicateOpen(false) : openDuplicatePanel())}
              disabled={saving || deleting}
            >
              {duplicateOpen ? "Fechar" : "Duplicar"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:bg-red-50"
            >
              Excluir
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
