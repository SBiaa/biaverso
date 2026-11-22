import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { projectHref } from "@/lib/projects-shared";

/**
 * Busca de conteúdo para o Ctrl+K: clientes, projetos, receitas, livros...
 * Só nome/título, nunca o resto do registro — em Senhas, nem login nem senha
 * saem daqui, só o nome da entrada.
 */

export type SearchHit = {
  kind: string;
  label: string;
  /** Linha cinza ao lado: de qual negócio, autor... */
  detail: string | null;
  href: string;
};

const LIMIT = 5;

export const GET = route(async (request: Request) => {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  // Duas letras ainda pegam metade do banco; a lista de telas já cobre isso.
  if (q.length < 2) return NextResponse.json([]);

  const has = { contains: q, mode: "insensitive" as const };

  const [clients, projects, products, recipes, books, wishes, ideas, passwords, courses] =
    await Promise.all([
      prisma.client.findMany({
        where: { name: has },
        take: LIMIT,
        orderBy: { name: "asc" },
        select: { id: true, name: true, niche: true },
      }),
      prisma.project.findMany({
        where: { name: has },
        take: LIMIT,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, businessId: true, business: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { name: has },
        take: LIMIT,
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.recipe.findMany({
        where: { title: has },
        take: LIMIT,
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
      prisma.book.findMany({
        where: { OR: [{ title: has }, { author: has }] },
        take: LIMIT,
        orderBy: { title: "asc" },
        select: { id: true, title: true, author: true },
      }),
      prisma.wishlistItem.findMany({
        where: { name: has },
        take: LIMIT,
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.idea.findMany({
        where: { title: has },
        take: LIMIT,
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
      prisma.passwordEntry.findMany({
        where: { name: has },
        take: LIMIT,
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.studyCourse.findMany({
        where: { title: has },
        take: LIMIT,
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
    ]);

  const hits: SearchHit[] = [
    ...clients.map((c) => ({ kind: "Cliente", label: c.name, detail: c.niche, href: `/clientes/${c.id}` })),
    ...projects.map((p) => ({
      kind: "Projeto",
      label: p.name,
      detail: p.business.name,
      href: projectHref(p.businessId, p.id),
    })),
    ...products.map((p) => ({ kind: "Produto", label: p.name, detail: null, href: `/produtos/${p.id}` })),
    ...recipes.map((r) => ({ kind: "Receita", label: r.title, detail: null, href: "/cardapio/receitas" })),
    ...books.map((b) => ({ kind: "Livro", label: b.title, detail: b.author, href: "/livros" })),
    ...wishes.map((w) => ({ kind: "Desejo", label: w.name, detail: null, href: "/desejos" })),
    ...ideas.map((i) => ({ kind: "Ideia", label: i.title, detail: null, href: "/ideias" })),
    ...passwords.map((p) => ({ kind: "Senha", label: p.name, detail: null, href: "/senhas" })),
    ...courses.map((c) => ({ kind: "Curso", label: c.title, detail: null, href: `/conhecimento/curso/${c.id}` })),
  ];

  return NextResponse.json(hits);
});
