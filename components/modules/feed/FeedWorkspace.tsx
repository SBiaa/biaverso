"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Link2,
  Plus,
  X,
} from "lucide-react";
import { Button, Card, CardTitle, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { contentStatusLabels } from "@/lib/labels";
import { buildGrid, feedWarnings, shortDate, type FeedPost } from "@/lib/feed";
import { cn } from "@/lib/utils";
import { ProfileMockup, type MockupHighlight } from "./ProfileMockup";
import { ProfilePanel, type ProfileFormValues } from "./ProfilePanel";
import { HighlightsPanel } from "./HighlightsPanel";
import { FeedPostModal, type FeedProjectOption } from "./FeedPostModal";

type ModalState = { post?: FeedPost } | null;

export function FeedWorkspace({
  businessId,
  clientId,
  clientName,
  clientPhoto,
  profile: initialProfile,
  highlights: initialHighlights,
  posts,
  projects,
  until: initialUntil,
  defaultUntil,
}: {
  businessId: string;
  clientId: string;
  clientName: string;
  clientPhoto: string | null;
  profile: ProfileFormValues;
  highlights: MockupHighlight[];
  posts: FeedPost[];
  projects: FeedProjectOption[];
  until: string;
  /** Domingo desta semana: o "padrão" do seletor. */
  defaultUntil: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const phoneRef = useRef<HTMLDivElement>(null);
  const [until, setUntil] = useState(initialUntil);
  const [profile, setProfile] = useState(initialProfile);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [clientMode, setClientMode] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grid = useMemo(() => buildGrid(posts, until), [posts, until]);
  const warnings = useMemo(() => feedWarnings(posts, grid, until), [posts, grid, until]);
  const later = posts
    .filter((p) => p.status !== "CANCELADO" && p.publishDate && p.publishDate > until)
    .sort((a, b) => a.publishDate!.localeCompare(b.publishDate!));
  const undated = posts.filter((p) => p.status !== "CANCELADO" && !p.publishDate);
  const groups = groupList(posts);

  function changeUntil(value: string) {
    if (!value) return;
    setUntil(value);
    // Na URL, para o "até" continuar o mesmo depois de salvar um post.
    const params = value === defaultUntil ? "" : `?ate=${value}`;
    router.replace(`${pathname}${params}`, { scroll: false });
  }

  function handlePostClick(post: FeedPost) {
    if (!selecting) {
      setModal({ post });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(post.id)) next.delete(post.id);
      else if (next.size < 3) next.add(post.id);
      return next;
    });
  }

  async function saveGroup() {
    setError(null);
    try {
      await api.post("/api/feed/grid-groups", { ids: [...selected] });
      setSelecting(false);
      setSelected(new Set());
      router.refresh();
      notify("Trio marcado.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function removeGroup(groupId: string) {
    setError(null);
    try {
      await api.delete(`/api/feed/grid-groups/${groupId}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function exportPng() {
    if (!phoneRef.current) return;
    setExporting(true);
    setError(null);
    // O PNG sai sempre limpo, como no Modo cliente, mesmo clicando fora dele.
    const wasClientMode = clientMode;
    flushSync(() => setClientMode(true));
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(phoneRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${(profile.handle || clientName).replace(/[^\w.-]+/g, "-")}-ate-${until}.png`;
      link.click();
    } catch {
      setError("Não consegui gerar a imagem. Tente tirar um print no Modo cliente.");
    } finally {
      setClientMode(wasClientMode);
      setExporting(false);
    }
  }

  const phone = (
    <div
      ref={phoneRef}
      className="w-[430px] max-w-full shrink-0 overflow-hidden rounded-[44px] border-[10px] border-neutral-900 bg-white shadow-xl"
    >
      <StatusBar />
      <ProfileMockup
        profile={{ ...profile, photo: profile.photo ?? clientPhoto }}
        clientName={clientName}
        highlights={highlights}
        grid={grid}
        clientMode={clientMode}
        selectedIds={selecting ? selected : highlighted}
        onPostClick={handlePostClick}
      />
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-end gap-2">
      {!clientMode && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-secondary">Visualizar até</span>
            <input
              type="date"
              value={until}
              onChange={(e) => changeUntil(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          {until !== defaultUntil && (
            <Button variant="ghost" onClick={() => changeUntil(defaultUntil)}>
              Fim desta semana
            </Button>
          )}
          <Button variant="secondary" onClick={() => setModal({})}>
            <Plus size={16} />
            Novo post
          </Button>
        </>
      )}
      <Button
        variant={clientMode ? "primary" : "secondary"}
        onClick={() => {
          setSelecting(false);
          setSelected(new Set());
          setHighlighted(new Set());
          setClientMode((v) => !v);
        }}
      >
        {clientMode ? <EyeOff size={16} /> : <Eye size={16} />}
        {clientMode ? "Sair do Modo cliente" : "Modo cliente"}
      </Button>
      <Button variant="secondary" onClick={exportPng} disabled={exporting}>
        <Download size={16} />
        {exporting ? "Gerando…" : "Baixar PNG"}
      </Button>
    </div>
  );

  if (clientMode) {
    return (
      <div className="flex flex-col items-center gap-4">
        {toolbar}
        <ErrorNote message={error} />
        {phone}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}
      <ErrorNote message={error} />

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full justify-center lg:sticky lg:top-4 lg:w-auto">{phone}</div>

        <div className="w-full min-w-0 flex-1 space-y-4">
          <Card className="space-y-3">
            <CardTitle>
              Avisos {warnings.length > 0 && <span className="text-text-secondary">({warnings.length})</span>}
            </CardTitle>
            {warnings.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-text-secondary">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Nada a ajustar até {shortDate(until)}.
              </p>
            ) : (
              <ul className="space-y-2">
                {warnings.map((w) => (
                  <li
                    key={w.id}
                    onMouseEnter={() => setHighlighted(new Set(w.postIds))}
                    onMouseLeave={() => setHighlighted(new Set())}
                    className="flex gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-text-secondary">
              São lembretes: nada é bloqueado. Passe o mouse num aviso para ver os posts no grid.
            </p>
          </Card>

          <Card className="space-y-3">
            <CardTitle>Trios do grid</CardTitle>
            {groups.length > 0 && (
              <ul className="space-y-1.5">
                {groups.map(([groupId, members]) => (
                  <li key={groupId} className="flex items-center gap-2 text-sm">
                    <Link2 size={14} className="shrink-0 text-text-secondary" />
                    <span className="min-w-0 flex-1 truncate">{members.map((m) => m.title).join(" · ")}</span>
                    <button
                      type="button"
                      onClick={() => removeGroup(groupId)}
                      className="text-xs text-text-secondary hover:text-danger"
                    >
                      Desfazer
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selecting ? (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  Clique nos 3 posts do trio no grid ({selected.size}/3).
                </p>
                <div className="flex gap-2">
                  <Button onClick={saveGroup} disabled={selected.size !== 3}>
                    Salvar trio
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelecting(false);
                      setSelected(new Set());
                    }}
                  >
                    <X size={16} />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setSelecting(true)}>
                <Link2 size={16} />
                Marcar trio
              </Button>
            )}
          </Card>

          {(later.length > 0 || undated.length > 0) && (
            <Card className="space-y-3">
              <CardTitle>Fora do grid nessa data</CardTitle>
              <PostList title={`Depois de ${shortDate(until)}`} posts={later} onOpen={(post) => setModal({ post })} />
              <PostList title="Sem data" posts={undated} onOpen={(post) => setModal({ post })} />
            </Card>
          )}

          <Card className="space-y-3">
            <CardTitle>Perfil</CardTitle>
            <ProfilePanel clientId={clientId} values={profile} clientPhoto={clientPhoto} onChange={setProfile} />
          </Card>

          <Card className="space-y-3">
            <CardTitle>Destaques</CardTitle>
            <HighlightsPanel clientId={clientId} highlights={highlights} onChange={setHighlights} />
          </Card>
        </div>
      </div>

      {modal && (
        <FeedPostModal
          key={modal.post?.id ?? "novo"}
          businessId={businessId}
          clientId={clientId}
          projects={projects}
          post={modal.post}
          defaultDate={until}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/** Conjuntos de trio com os posts de cada um, na ordem de data. */
function groupList(posts: FeedPost[]) {
  const map = new Map<string, FeedPost[]>();
  for (const post of posts) {
    if (!post.gridGroupId || post.status === "CANCELADO") continue;
    map.set(post.gridGroupId, [...(map.get(post.gridGroupId) ?? []), post]);
  }
  return [...map.entries()].map(
    ([id, members]) =>
      [id, members.sort((a, b) => (a.publishDate ?? "").localeCompare(b.publishDate ?? ""))] as const,
  );
}

function PostList({
  title,
  posts,
  onOpen,
}: {
  title: string;
  posts: FeedPost[];
  onOpen: (post: FeedPost) => void;
}) {
  if (posts.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {title} ({posts.length})
      </p>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <button
              type="button"
              onClick={() => onOpen(post)}
              className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-hover"
            >
              <span className="w-12 shrink-0 text-xs text-text-secondary">{shortDate(post.publishDate)}</span>
              <span className="min-w-0 flex-1 truncate">{post.title}</span>
              <span className={cn("shrink-0 text-xs text-text-secondary")}>
                {contentStatusLabels[post.status] ?? post.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra de status do celular, só para o print parecer uma tela de verdade. */
function StatusBar() {
  return (
    <div
      className="flex h-11 items-center justify-between bg-white px-7 text-[15px] font-semibold text-black"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <span>9:41</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="17" height="8" rx="1.8" fill="currentColor" />
          <rect x="24" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}
