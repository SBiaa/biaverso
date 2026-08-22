import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, route } from "@/lib/api";
import { importCalendarioSchema } from "@/lib/schemas";
import { linkClientToBusiness } from "@/lib/ace";
import { parseDateOnly } from "@/lib/utils";
import type {
  ContentPilar,
  ContentStatus,
  PostType,
} from "@/app/generated/prisma/client";

/** Fonte fixa: hoje só existe um gerador externo de cronograma de conteúdo. */
const EXTERNAL_SOURCE = "bot-calendario-conteudo";

const formatoToType: Record<string, PostType> = {
  carrossel: "CARROSSEL",
  estatico: "FEED_FOTO",
  reels: "REELS",
  story: "STORY",
};

const pilarToEnum: Record<string, ContentPilar> = {
  Autoridade: "AUTORIDADE",
  Prova: "PROVA",
  Oferta: "OFERTA",
  Humano: "HUMANO",
  Conversa: "CONVERSA",
};

// "aprovado" no gerador é aprovação do texto, antes de produzir; "produzido"
// e "agendado" já estão prontos, só esperando a data — mais perto de
// "aprovado" no biaVerso do que de "ainda em criação".
const statusToContentStatus: Record<string, ContentStatus> = {
  rascunho: "PLANEJADO",
  aprovado: "EM_CRIACAO",
  produzido: "APROVADO",
  agendado: "APROVADO",
  publicado: "PUBLICADO",
};

export const POST = route(async (request: Request) => {
  const { businessId, clientId, projectId, network, calendario } = await parseBody(
    request,
    importCalendarioSchema,
  );

  if (clientId) await linkClientToBusiness(clientId, businessId);

  let created = 0;
  let updated = 0;

  for (const post of calendario.posts) {
    const data = {
      title: post.gancho,
      type: formatoToType[post.formato],
      network,
      status: statusToContentStatus[post.status],
      publishDate: parseDateOnly(post.data),
      caption: post.copy,
      notes: post.observacao,
      pilar: pilarToEnum[post.pilar],
      objective: post.objetivo,
      hook: post.gancho,
      cta: post.cta,
      hashtags: post.hashtags,
      slides: post.slides,
      script: post.roteiro,
      visualBrief: post.briefing_visual,
      storySupport: post.story_apoio,
      businessId,
      clientId: clientId ?? null,
      projectId: projectId ?? null,
      externalSource: EXTERNAL_SOURCE,
      externalId: post.id,
    };

    const existing = await prisma.contentPost.findFirst({
      where: { businessId, externalSource: EXTERNAL_SOURCE, externalId: post.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.contentPost.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.contentPost.create({ data });
      created++;
    }
  }

  return NextResponse.json({ created, updated, total: calendario.posts.length });
});
