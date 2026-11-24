import { prisma } from "@/lib/prisma";

/**
 * Quando cada capa mudou pela última vez (ms), por negócio. É o `?v=` da URL
 * da imagem; negócio sem capa fica de fora e a tela usa a cor dele.
 *
 * Se a tabela ainda não existe (migration não aplicada), as telas seguem sem
 * capa em vez de quebrar — o dia a dia inteiro depende desta consulta.
 */
export async function getCoverVersions(businessIds?: string[]): Promise<Record<string, number>> {
  try {
    const rows = await prisma.businessCover.findMany({
      where: businessIds ? { businessId: { in: businessIds } } : undefined,
      select: { businessId: true, updatedAt: true },
    });
    return Object.fromEntries(rows.map((r) => [r.businessId, r.updatedAt.getTime()]));
  } catch (error) {
    console.error("[capas] não consegui ler as capas dos negócios", error);
    return {};
  }
}
