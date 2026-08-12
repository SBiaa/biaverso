import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/layout/Topbar";
import { BookFilters } from "@/components/modules/livros/BookFilters";
import { AddBookForm } from "@/components/modules/livros/AddBookForm";
import { BookCard } from "@/components/modules/livros/BookCard";
import type { Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function LivrosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const where: Prisma.BookWhereInput = {};
  if (params.status) {
    where.status = params.status as Prisma.BookWhereInput["status"];
  }

  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Topbar title="Livros" />
      <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-4 px-4 py-5 md:px-8 md:py-8 md:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BookFilters />
        </div>

        <AddBookForm />

        {books.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhum livro encontrado.
          </p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
