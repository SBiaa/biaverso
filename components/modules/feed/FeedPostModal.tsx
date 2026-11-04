"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button, confirmAction, ErrorNote, Modal, ModalActions, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { resizePostCover } from "@/lib/client-photo";
import { contentPilarLabels, contentStatusLabels, postTypeLabels } from "@/lib/labels";
import { FEED_CREATE_TYPES, FEED_STATUSES, postCoverUrl, type FeedPost } from "@/lib/feed";

export type FeedProjectOption = { id: string; name: string };

const fieldClass =
  "w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

/**
 * Post do Feed: o mesmo `ContentPost` do calendário do Ace, com o que o grid
 * precisa a mais (capa, pilar, fixado). Sai sempre como Instagram.
 */
export function FeedPostModal({
  businessId,
  clientId,
  projects,
  post,
  defaultDate,
  onClose,
}: {
  businessId: string;
  clientId: string;
  projects: FeedProjectOption[];
  post?: FeedPost;
  defaultDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!post;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Capa nova escolhida e ainda não salva; `null` = pediu para tirar a atual.
  const [newCover, setNewCover] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState({
    title: post?.title ?? "",
    type: post?.type ?? "FEED_FOTO",
    status: post?.status ?? "PLANEJADO",
    publishDate: post?.publishDate ?? defaultDate,
    pilar: post?.pilar ?? "",
    caption: post?.caption ?? "",
    notes: post?.notes ?? "",
    projectId: post?.projectId ?? projects[0]?.id ?? "",
    pinned: !!post?.pinnedAt,
  });

  const typeOptions = FEED_CREATE_TYPES.includes(form.type as (typeof FEED_CREATE_TYPES)[number])
    ? FEED_CREATE_TYPES
    : [...FEED_CREATE_TYPES, form.type];
  const coverPreview = newCover === undefined ? (post ? postCoverUrl(post) : null) : newCover;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function pickCover(file: File | undefined) {
    if (!file) return;
    try {
      setNewCover(await resizePostCover(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui abrir essa imagem.");
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      type: form.type,
      status: form.status,
      publishDate: form.publishDate || null,
      pilar: form.pilar || null,
      caption: form.caption,
      notes: form.notes,
      projectId: form.projectId || null,
    };

    try {
      let id = post?.id;
      if (id) {
        await api.patch(`/api/ace/posts/${id}`, payload);
      } else {
        const created = await api.post<{ id: string }>("/api/ace/posts", {
          ...payload,
          businessId,
          clientId,
          network: "INSTAGRAM",
        });
        id = created.id;
      }

      if (newCover) await api.put(`/api/ace/posts/${id}/cover`, { image: newCover });
      if (newCover === null) await api.delete(`/api/ace/posts/${id}/cover`);
      // Por último: se passar de 3 fixados, o resto já ficou salvo e o aviso aparece.
      if (form.pinned !== !!post?.pinnedAt) {
        await api.patch(`/api/ace/posts/${id}`, { pinned: form.pinned });
      }

      router.refresh();
      notify("Salvo.");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    const confirmed = await confirmAction({
      title: "Excluir este post?",
      description: "Ele sai também do calendário e do kanban.",
      destructive: true,
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await api.delete(`/api/ace/posts/${post.id}`);
      router.refresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Editar post" : "Novo post no feed"} onClose={onClose} onSubmit={handleSubmit} size="md">
      <div className="flex gap-4">
        {/* Capa em 4:5, com a faixa 3:4 que o grid mostra marcada por cima. */}
        <div className="w-32 shrink-0 space-y-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative block aspect-[4/5] w-full overflow-hidden rounded-md border-2 border-dashed border-border bg-hover/40 text-text-secondary hover:border-accent"
          >
            {coverPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL ou rota própria */}
                <img src={coverPreview} alt="" className="absolute inset-0 size-full object-cover" />
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[3.33%] bg-black/40" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3.33%] bg-black/40" />
              </>
            ) : (
              <span className="flex size-full flex-col items-center justify-center gap-1 text-xs">
                <ImagePlus size={20} />
                Capa 4:5
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pickCover(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {coverPreview && (
            <button
              type="button"
              onClick={() => setNewCover(null)}
              className="text-xs text-text-secondary hover:text-danger"
            >
              Tirar imagem
            </button>
          )}
          <p className="text-[11px] leading-tight text-text-secondary">
            As faixas escuras ficam de fora no grid (3:4).
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Field label="Título">
            <input
              className={fieldClass}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select className={fieldClass} value={form.type} onChange={(e) => update("type", e.target.value)}>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t === "FEED_FOTO" ? "Post" : postTypeLabels[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data planejada">
              <input
                type="date"
                className={fieldClass}
                value={form.publishDate}
                onChange={(e) => update("publishDate", e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select className={fieldClass} value={form.status} onChange={(e) => update("status", e.target.value)}>
                {FEED_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {contentStatusLabels[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pilar">
              <select className={fieldClass} value={form.pilar} onChange={(e) => update("pilar", e.target.value)}>
                <option value="">Sem pilar</option>
                {Object.entries(contentPilarLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => update("pinned", e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            Fixado no topo do perfil
          </label>
        </div>
      </div>

      <Field label="Legenda">
        <textarea
          className={fieldClass}
          rows={4}
          value={form.caption}
          onChange={(e) => update("caption", e.target.value)}
        />
      </Field>
      <Field label="Observações">
        <textarea
          className={fieldClass}
          rows={2}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </Field>
      {projects.length > 0 && (
        <Field label="Projeto">
          <select className={fieldClass} value={form.projectId} onChange={(e) => update("projectId", e.target.value)}>
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <ErrorNote message={error} />

      <ModalActions>
        {isEdit && (
          <Button variant="ghost" onClick={handleDelete} disabled={saving} className="text-danger">
            <Trash2 size={16} />
            Excluir
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} className="ml-auto">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !form.title.trim()}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </ModalActions>
    </Modal>
  );
}
