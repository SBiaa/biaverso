import { addUtcDays, toDateInputValue, todayUtc } from "@/lib/utils";
import { contentPilarLabels } from "@/lib/labels";

// Regras do Feed (prévia do perfil do Instagram). Puro de propósito: nada aqui
// importa "@/lib/prisma", então a tela usa direto no navegador e recalcula a
// cada mudança de data sem ir ao servidor.

/** O que aparece no grid do perfil. Stories ficam de fora, como no app. */
export const FEED_POST_TYPES = ["FEED_FOTO", "FEED_VIDEO", "CARROSSEL", "REELS"] as const;

/** Tipos que dá para escolher ao criar pelo Feed (vídeo de feed hoje é reels). */
export const FEED_CREATE_TYPES = ["FEED_FOTO", "CARROSSEL", "REELS"] as const;

export const FEED_STATUSES = [
  "PLANEJADO",
  "EM_CRIACAO",
  "AGUARDANDO_APROVACAO",
  "APROVADO",
  "PUBLICADO",
  "PRAZO_PERDIDO",
  "CANCELADO",
] as const;

export const MAX_PINNED = 3;

export type FeedPost = {
  id: string;
  title: string;
  type: string;
  status: string;
  /** "YYYY-MM-DD" ou null. */
  publishDate: string | null;
  pinnedAt: string | null;
  gridGroupId: string | null;
  pilar: string | null;
  caption: string | null;
  notes: string | null;
  projectId: string | null;
  /** `updatedAt` da capa em ms; null = sem imagem ainda (slot tracejado). */
  coverVersion: number | null;
};

/**
 * Etiqueta de status no grid. Cada cor tem uma claridade diferente da outra
 * (do quase branco ao quase preto), então dá para distinguir até numa tela sem
 * cor ou para quem não separa bem os tons.
 */
export const feedStatusChip: Record<string, string> = {
  PLANEJADO: "bg-white text-slate-800 ring-1 ring-slate-300",
  EM_CRIACAO: "bg-amber-300 text-amber-950",
  AGUARDANDO_APROVACAO: "bg-violet-400 text-violet-950",
  APROVADO: "bg-blue-700 text-white",
  PUBLICADO: "bg-emerald-950 text-emerald-50",
  PRAZO_PERDIDO: "bg-red-600 text-white ring-2 ring-white",
};

/** Domingo da semana de `date` (semana de segunda a domingo), em "YYYY-MM-DD". */
export function sundayOfWeek(date: Date = todayUtc()) {
  const day = date.getUTCDay(); // 0 = domingo
  return toDateInputValue(addUtcDays(date, day === 0 ? 0 : 7 - day));
}

/** Segunda-feira da semana de uma data "YYYY-MM-DD". */
function mondayOf(dateOnly: string) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  const day = date.getUTCDay();
  return toDateInputValue(addUtcDays(date, day === 0 ? -6 : 1 - day));
}

/** "12/11" — a data curta da etiqueta. */
export function shortDate(dateOnly: string | null) {
  if (!dateOnly) return "sem data";
  const [, month, day] = dateOnly.split("-");
  return `${day}/${month}`;
}

/**
 * Quem entra no grid até `until`, na ordem do app: fixados primeiro (no máximo
 * 3, na ordem em que foram fixados), depois o resto do mais novo para o mais
 * antigo. Cancelado e post sem data não entram; post com data depois de
 * `until` ainda não saiu.
 */
export function buildGrid(posts: FeedPost[], until: string) {
  const visible = posts.filter(
    (p) => p.status !== "CANCELADO" && p.publishDate !== null && p.publishDate <= until,
  );

  const pinned = visible
    .filter((p) => p.pinnedAt)
    .sort((a, b) => a.pinnedAt!.localeCompare(b.pinnedAt!))
    .slice(0, MAX_PINNED);
  const pinnedIds = new Set(pinned.map((p) => p.id));

  const rest = visible
    .filter((p) => !pinnedIds.has(p.id))
    .sort(
      (a, b) =>
        b.publishDate!.localeCompare(a.publishDate!) || a.title.localeCompare(b.title, "pt-BR"),
    );

  return [...pinned, ...rest];
}

export type FeedWarning = {
  id: string;
  kind: "conjunto" | "pilar";
  message: string;
  postIds: string[];
};

/**
 * Avisos do painel ao lado da prévia. Nunca bloqueiam nada — são lembretes.
 *
 * `grid` é a saída de `buildGrid`; `posts` é a lista inteira da cliente.
 */
export function feedWarnings(posts: FeedPost[], grid: FeedPost[], until: string): FeedWarning[] {
  return [...gridGroupWarnings(posts, grid), ...pilarWarnings(grid, until)];
}

/**
 * Conjunto (o trio que forma uma imagem): ele só fica alinhado se os 3 posts
 * caírem lado a lado na mesma linha do grid. Isso quebra quando os posts que
 * entram depois dele (e os fixados, que ocupam o começo do grid) não somam
 * múltiplo de 3. Olhar a posição real no grid cobre as duas coisas de uma vez.
 */
function gridGroupWarnings(posts: FeedPost[], grid: FeedPost[]): FeedWarning[] {
  const groups = new Map<string, FeedPost[]>();
  for (const post of posts) {
    if (!post.gridGroupId || post.status === "CANCELADO") continue;
    groups.set(post.gridGroupId, [...(groups.get(post.gridGroupId) ?? []), post]);
  }

  const position = new Map(grid.map((p, index) => [p.id, index]));
  const warnings: FeedWarning[] = [];

  for (const [groupId, members] of groups) {
    const names = members.map((m) => `“${m.title}”`).join(", ");
    const indices = members
      .map((m) => position.get(m.id))
      .filter((i): i is number => i !== undefined)
      .sort((a, b) => a - b);

    // Nenhum no ar ainda nessa data: nada a alinhar.
    if (indices.length === 0) continue;

    if (indices.length < members.length) {
      warnings.push({
        id: `conjunto-incompleto-${groupId}`,
        kind: "conjunto",
        message: `Até essa data só ${indices.length} de ${members.length} posts do trio (${names}) estão no perfil: ele aparece pela metade.`,
        postIds: members.map((m) => m.id),
      });
      continue;
    }

    const first = indices[0];
    const sideBySide = indices.every((index, i) => index === first + i);
    if (sideBySide && first % 3 === 0) continue;

    const before = first % 3;
    const fix = sideBySide
      ? `Tem ${first} post${first === 1 ? "" : "s"} antes dele no grid: some mais ${3 - before} ou tire ${before} para ele voltar ao lugar.`
      : "Tem post com data no meio do trio: as datas dele precisam ficar seguidas.";
    warnings.push({
      id: `conjunto-${groupId}`,
      kind: "conjunto",
      message: `O trio vai sair do alinhamento (${names}). ${fix}`,
      postIds: members.map((m) => m.id),
    });
  }

  return warnings;
}

/**
 * Regras de pilar sobre os posts do grid em ordem de data (do mais antigo
 * para o mais novo). Só olha do começo do mês atual até `until`: o histórico
 * antigo já foi publicado e não tem mais o que mudar.
 */
function pilarWarnings(grid: FeedPost[], until: string): FeedWarning[] {
  const startOfMonth = `${toDateInputValue(todayUtc()).slice(0, 7)}-01`;
  const posts = grid
    .filter((p) => p.publishDate! >= startOfMonth && p.publishDate! <= until)
    .sort((a, b) => a.publishDate!.localeCompare(b.publishDate!));
  const label = (pilar: string) => contentPilarLabels[pilar] ?? pilar;
  const warnings: FeedWarning[] = [];

  // 1. Dois seguidos do mesmo pilar.
  for (let i = 1; i < posts.length; i++) {
    const prev = posts[i - 1];
    const curr = posts[i];
    if (prev.pilar && prev.pilar === curr.pilar) {
      warnings.push({
        id: `seguidos-${prev.id}-${curr.id}`,
        kind: "pilar",
        message: `Dois posts seguidos de ${label(curr.pilar)}: “${prev.title}” (${shortDate(prev.publishDate)}) e “${curr.title}” (${shortDate(curr.publishDate)}).`,
        postIds: [prev.id, curr.id],
      });
    }
  }

  // 2. Mais de 30% de Oferta no mês (entre os posts que têm pilar).
  const byMonth = new Map<string, FeedPost[]>();
  for (const post of posts) {
    if (!post.pilar) continue;
    const month = post.publishDate!.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), post]);
  }
  for (const [month, monthPosts] of byMonth) {
    const offers = monthPosts.filter((p) => p.pilar === "OFERTA");
    const share = offers.length / monthPosts.length;
    if (share > 0.3) {
      const [year, m] = month.split("-");
      warnings.push({
        id: `oferta-mes-${month}`,
        kind: "pilar",
        message: `${Math.round(share * 100)}% dos posts de ${m}/${year} são de Oferta (${offers.length} de ${monthPosts.length}). O limite é 30%.`,
        postIds: offers.map((p) => p.id),
      });
    }
  }

  // 3. Oferta sem Autoridade ou Prova antes, na mesma semana (seg a dom).
  for (const offer of posts.filter((p) => p.pilar === "OFERTA")) {
    const week = mondayOf(offer.publishDate!);
    const warmedUp = posts.some(
      (p) =>
        (p.pilar === "AUTORIDADE" || p.pilar === "PROVA") &&
        mondayOf(p.publishDate!) === week &&
        p.publishDate! < offer.publishDate!,
    );
    if (!warmedUp) {
      warnings.push({
        id: `oferta-fria-${offer.id}`,
        kind: "pilar",
        message: `“${offer.title}” (${shortDate(offer.publishDate)}) é Oferta sem um post de Autoridade ou Prova antes, na mesma semana.`,
        postIds: [offer.id],
      });
    }
  }

  return warnings;
}

/** Números do perfil como o app mostra: 1.234 · 12,3 mil · 1,2 mi. "—" se vazio. */
export function formatProfileCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value < 10_000) return value.toLocaleString("pt-BR");
  if (value < 1_000_000) {
    const thousands = value / 1000;
    return `${thousands.toLocaleString("pt-BR", { maximumFractionDigits: thousands < 100 ? 1 : 0 })} mil`;
  }
  const millions = value / 1_000_000;
  return `${millions.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
}

/** URL da capa do post, versionada para o navegador guardar em cache. */
export function postCoverUrl(post: Pick<FeedPost, "id" | "coverVersion">) {
  return post.coverVersion ? `/api/ace/posts/${post.id}/cover?v=${post.coverVersion}` : null;
}
