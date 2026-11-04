"use client";

import { forwardRef } from "react";
import { AlertTriangle, Link2 } from "lucide-react";
import { contentStatusLabels } from "@/lib/labels";
import {
  feedStatusChip,
  formatProfileCount,
  postCoverUrl,
  shortDate,
  type FeedPost,
} from "@/lib/feed";
import { cn, getInitials } from "@/lib/utils";
import {
  AddPersonIcon,
  BackIcon,
  BellIcon,
  CarouselBadge,
  GridIcon,
  LinkIcon,
  MoreIcon,
  PinBadge,
  ReelsBadge,
  ReelsIcon,
  TaggedIcon,
} from "./InstagramIcons";

export type MockupProfile = {
  handle: string | null;
  displayName: string | null;
  category: string | null;
  bio: string | null;
  link: string | null;
  /** Foto do perfil ou, na falta, a da cliente. */
  photo: string | null;
  postsCount: number | null;
  followersCount: number | null;
  followingCount: number | null;
};

export type MockupHighlight = { id: string; name: string; cover: string | null };

/** Rótulos curtos: a célula do grid tem ~140px. */
const SHORT_STATUS: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Aguard. aprovação",
};

// O mockup segue o tema claro do app do Instagram, qualquer que seja o tema do
// biaVerso: é o que a cliente vê no celular. Por isso as cores são fixas aqui.
const IG = {
  text: "#000000",
  muted: "#737373",
  border: "#DBDBDB",
  button: "#EFEFEF",
  blue: "#0095F6",
  link: "#00376B",
  placeholder: "#EFEFEF",
};

/**
 * O perfil como aparece no app, em ~430px. `clientMode` tira tudo o que é
 * interno (etiquetas, marcação de conjunto, seleção) e deixa só o que a
 * cliente veria — é o modo de tirar print.
 */
export const ProfileMockup = forwardRef<
  HTMLDivElement,
  {
    profile: MockupProfile;
    clientName: string;
    highlights: MockupHighlight[];
    grid: FeedPost[];
    clientMode: boolean;
    selectedIds?: Set<string>;
    onPostClick?: (post: FeedPost) => void;
  }
>(function ProfileMockup(
  { profile, clientName, highlights, grid, clientMode, selectedIds, onPostClick },
  ref,
) {
  const handle = profile.handle?.replace(/^@/, "") || "seu.perfil";
  const linkText = profile.link?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div
      ref={ref}
      className="w-full max-w-[430px] overflow-hidden bg-white"
      style={{
        color: IG.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Barra do topo: perfil visto por quem ainda não segue. */}
      <div className="flex h-11 items-center gap-3 px-3">
        <BackIcon size={26} />
        <span className="min-w-0 flex-1 truncate text-[17px] font-bold">{handle}</span>
        <BellIcon size={24} />
        <MoreIcon size={24} />
      </div>

      <div className="px-4 pt-1.5">
        <div className="flex items-center gap-6">
          <div className="size-[86px] shrink-0 overflow-hidden rounded-full border" style={{ borderColor: IG.border }}>
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL
              <img src={profile.photo} alt="" className="size-full object-cover" />
            ) : (
              <div
                className="flex size-full items-center justify-center text-2xl font-semibold"
                style={{ background: IG.placeholder, color: IG.muted }}
              >
                {getInitials(profile.displayName || clientName)}
              </div>
            )}
          </div>
          <div className="flex flex-1 justify-around text-center">
            {[
              [profile.postsCount, "posts"],
              [profile.followersCount, "seguidores"],
              [profile.followingCount, "seguindo"],
            ].map(([value, label]) => (
              <div key={label as string} className="flex flex-col leading-tight">
                <span className="text-[17px] font-semibold">
                  {formatProfileCount(value as number | null)}
                </span>
                <span className="text-[13px]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2.5 space-y-0.5 text-[14px] leading-[18px]">
          <p className="font-semibold">{profile.displayName || clientName}</p>
          {profile.category && <p style={{ color: IG.muted }}>{profile.category}</p>}
          {profile.bio && <p className="whitespace-pre-line">{profile.bio}</p>}
          {linkText && (
            <p className="flex items-center gap-1 font-semibold" style={{ color: IG.link }}>
              <LinkIcon size={14} className="shrink-0 -rotate-45" />
              <span className="truncate">{linkText}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex gap-1.5 text-[14px] font-semibold">
          <span className="flex h-8 flex-1 items-center justify-center rounded-lg text-white" style={{ background: IG.blue }}>
            Seguir
          </span>
          <span className="flex h-8 flex-1 items-center justify-center rounded-lg" style={{ background: IG.button }}>
            Mensagem
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg" style={{ background: IG.button }}>
            <AddPersonIcon size={16} />
          </span>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="flex gap-4 overflow-x-auto px-4 pt-4 pb-1 [scrollbar-width:none]">
          {highlights.map((h) => (
            <div key={h.id} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <div className="size-16 rounded-full border p-[3px]" style={{ borderColor: IG.border }}>
                {h.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL
                  <img src={h.cover} alt="" className="size-full rounded-full object-cover" />
                ) : (
                  <div className="size-full rounded-full" style={{ background: IG.placeholder }} />
                )}
              </div>
              <span className="w-full truncate text-center text-[12px]">{h.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Abas: grid (ativa), reels, marcados. */}
      <div className="mt-3 flex border-t" style={{ borderColor: IG.border }}>
        <span className="flex h-11 flex-1 items-center justify-center border-b-[1.5px] border-black">
          <GridIcon size={24} />
        </span>
        <span className="flex h-11 flex-1 items-center justify-center" style={{ color: IG.muted }}>
          <ReelsIcon size={24} />
        </span>
        <span className="flex h-11 flex-1 items-center justify-center" style={{ color: IG.muted }}>
          <TaggedIcon size={24} />
        </span>
      </div>

      {grid.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full border-2 border-black">
            <GridIcon size={28} />
          </span>
          <p className="text-[20px] font-bold">Ainda não há publicações</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px]">
          {grid.map((post) => (
            <GridCell
              key={post.id}
              post={post}
              clientMode={clientMode}
              selected={selectedIds?.has(post.id) ?? false}
              onClick={onPostClick ? () => onPostClick(post) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function GridCell({
  post,
  clientMode,
  selected,
  onClick,
}: {
  post: FeedPost;
  clientMode: boolean;
  selected: boolean;
  onClick?: () => void;
}) {
  const cover = postCoverUrl(post);
  const missed = post.status === "PRAZO_PERDIDO";
  const statusLabel = SHORT_STATUS[post.status] ?? contentStatusLabels[post.status] ?? post.status;

  const badge = post.pinnedAt ? (
    <PinBadge size={18} />
  ) : post.type === "CARROSSEL" ? (
    <CarouselBadge size={18} />
  ) : post.type === "REELS" || post.type === "FEED_VIDEO" ? (
    <ReelsBadge size={18} />
  ) : null;

  const content = (
    <>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- rota própria, já em cache
        <img src={cover} alt={post.title} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center p-2 text-center",
            !clientMode && "border-2 border-dashed",
          )}
          style={{
            background: clientMode ? IG.placeholder : "#FAFAFA",
            borderColor: "#BDBDBD",
          }}
        >
          <span className="line-clamp-4 text-[12px] leading-tight font-medium" style={{ color: "#555" }}>
            {post.title}
          </span>
        </div>
      )}

      {badge && (
        <span
          className={cn(
            "absolute top-1.5 right-1.5",
            // Sobre a foto, branco com sombra como no app; no slot vazio, cinza.
            cover ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : "text-neutral-500",
          )}
        >
          {badge}
        </span>
      )}

      {!clientMode && (
        <>
          {post.gridGroupId && (
            <span
              title="Faz parte de um trio"
              className="absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white"
            >
              <Link2 size={12} />
            </span>
          )}
          <span
            className={cn(
              "absolute bottom-1 left-1 right-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-tight font-semibold shadow-sm",
              feedStatusChip[post.status] ?? "bg-white text-black",
            )}
          >
            {missed && <AlertTriangle size={11} className="shrink-0" />}
            <span className="truncate">
              {shortDate(post.publishDate)} · {statusLabel}
            </span>
          </span>
          {selected && <span className="absolute inset-0 ring-4 ring-inset ring-blue-500" />}
        </>
      )}
    </>
  );

  const className = "relative aspect-[3/4] overflow-hidden text-left";
  if (!onClick || clientMode) return <div className={className}>{content}</div>;
  return (
    <button type="button" onClick={onClick} className={cn(className, "focus-visible:outline-2 focus-visible:outline-blue-500")}>
      {content}
    </button>
  );
}
