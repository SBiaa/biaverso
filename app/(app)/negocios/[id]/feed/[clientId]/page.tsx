import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BusinessTabs } from "@/components/modules/negocios/BusinessTabs";
import { FeedWorkspace } from "@/components/modules/feed/FeedWorkspace";
import { buildBusinessTabs } from "@/lib/business-modules";
import { syncMissedDeadlines } from "@/lib/ace";
import { FEED_POST_TYPES, sundayOfWeek, type FeedPost } from "@/lib/feed";
import { parseDateOnly, toDateInputValue } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Prévia do perfil do Instagram de uma cliente, até a data escolhida. */
export default async function ClientFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; clientId: string }>;
  searchParams: Promise<{ ate?: string }>;
}) {
  const { id, clientId } = await params;
  const { ate } = await searchParams;

  const [business, client] = await Promise.all([
    prisma.business.findUnique({
      where: { id },
      include: { modules: { orderBy: { order: "asc" } } },
    }),
    prisma.client.findUnique({
      where: { id: clientId },
      include: {
        instagramProfile: true,
        instagramHighlights: { orderBy: { order: "asc" } },
        businessLinks: { where: { businessId: id }, select: { id: true } },
      },
    }),
    // O status aparece em cada post, então o prazo perdido vem marcado antes.
    syncMissedDeadlines(),
  ]);
  if (!business || !client || client.businessLinks.length === 0) notFound();

  const tabs = buildBusinessTabs(id, business.modules);
  if (!tabs.some((t) => t.key === "feed")) notFound();

  const [posts, projects] = await Promise.all([
    prisma.contentPost.findMany({
      where: {
        businessId: id,
        clientId,
        network: "INSTAGRAM",
        type: { in: [...FEED_POST_TYPES] },
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        publishDate: true,
        pinnedAt: true,
        gridGroupId: true,
        pilar: true,
        caption: true,
        notes: true,
        projectId: true,
        cover: { select: { updatedAt: true } },
      },
    }),
    prisma.project.findMany({
      where: { businessId: id, clientId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  const defaultUntil = sundayOfWeek();
  const until = ate && parseDateOnly(ate) ? ate : defaultUntil;

  const feedPosts: FeedPost[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    status: p.status,
    publishDate: p.publishDate ? toDateInputValue(p.publishDate) : null,
    pinnedAt: p.pinnedAt ? p.pinnedAt.toISOString() : null,
    gridGroupId: p.gridGroupId,
    pilar: p.pilar,
    caption: p.caption,
    notes: p.notes,
    projectId: p.projectId,
    coverVersion: p.cover ? p.cover.updatedAt.getTime() : null,
  }));

  const profile = client.instagramProfile;

  return (
    <>
      <Topbar
        title={`Feed · ${client.name}`}
        trail={[
          { label: "Negócios", href: "/negocios" },
          { label: business.name, href: `/negocios/${id}` },
          { label: "Feed", href: `/negocios/${id}/feed` },
        ]}
      />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <BusinessTabs businessId={id} tabs={tabs} active="feed" />
        <FeedWorkspace
          businessId={id}
          clientId={clientId}
          clientName={client.name}
          clientPhoto={client.photo}
          profile={{
            handle: profile?.handle ?? client.instagram?.replace(/^@/, "") ?? null,
            displayName: profile?.displayName ?? null,
            category: profile?.category ?? null,
            bio: profile?.bio ?? null,
            link: profile?.link ?? null,
            photo: profile?.photo ?? null,
            postsCount: profile?.postsCount ?? null,
            followersCount: profile?.followersCount ?? null,
            followingCount: profile?.followingCount ?? null,
          }}
          highlights={client.instagramHighlights.map((h) => ({ id: h.id, name: h.name, cover: h.cover }))}
          posts={feedPosts}
          projects={projects}
          until={until}
          defaultUntil={defaultUntil}
        />
      </main>
    </>
  );
}
