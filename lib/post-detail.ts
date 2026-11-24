import { contentStatusLabels, postTypeLabels, socialNetworkLabels } from "@/lib/labels";

/**
 * Linha cinza sob o título do post no Dia: tipo, rede, cliente e, quando diz
 * algo, em que pé está no cronograma. Usada no servidor e no painel, que
 * refaz a linha na hora quando ela troca o tipo, a rede ou o status.
 */
export function postDetail(
  post: { type: string; network: string; status: string; clientName: string | null },
  done: boolean,
) {
  return [
    `Post · ${postTypeLabels[post.type] ?? post.type}`,
    socialNetworkLabels[post.network] ?? post.network,
    post.clientName ?? "Interno",
    // Publicado é o "feito"; planejado e prazo perdido já aparecem de outro jeito.
    !done && post.status !== "PLANEJADO" && post.status !== "PRAZO_PERDIDO"
      ? contentStatusLabels[post.status]
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
