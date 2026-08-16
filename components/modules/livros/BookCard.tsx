"use client";

import { useRef, useState } from "react";
import { Card, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { StarRating } from "@/components/modules/avaliacao/StarRating";
import { colorFromString } from "@/lib/utils";
import { bookStatusLabels } from "@/lib/labels";

const statusOptions = Object.keys(bookStatusLabels);

type Book = {
  id: string;
  title: string;
  author: string | null;
  status: string;
  rating: number | null;
  totalPages: number | null;
  currentPage: number | null;
  notes: string | null;
};

export function BookCard({ book: initialBook }: { book: Book }) {
  const [book, setBook] = useState(initialBook);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(patch: Partial<Book>) {
    const previous = book;
    setError(null);
    setBook((prev) => ({
      ...prev,
      ...patch,
      currentPage:
        patch.status === "LIDO"
          ? (patch.totalPages ?? prev.totalPages)
          : (patch.currentPage ?? prev.currentPage),
    }));

    try {
      // O servidor devolve o livro já com startedAt/finishedAt resolvidos,
      // então a tela passa a refletir o que ficou gravado de fato.
      setBook(await api.patch<Book>(`/api/books/${book.id}`, patch));
    } catch (e) {
      setBook(previous);
      setError(errorMessage(e));
    }
  }

  function saveNotesDebounced(notes: string) {
    setBook((prev) => ({ ...prev, notes }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        await api.patch(`/api/books/${book.id}`, { notes });
        setError(null);
      } catch (e) {
        // As notas continuam na tela; só o aviso aparece.
        setError(errorMessage(e));
      }
    }, 700);
  }

  function submitPage() {
    const value = Number(pageInput);
    if (!value || value <= 0) return;
    save({ currentPage: value });
    setPageInput("");
    setEditingPage(false);
  }

  function submitTotal() {
    const value = Number(totalInput);
    if (!value || value <= 0) return;
    save({ totalPages: value });
    setTotalInput("");
    setEditingTotal(false);
  }

  const progress =
    book.totalPages && book.currentPage
      ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
      : null;

  return (
    <Card className="flex flex-col gap-3">
      <ErrorNote message={error} />
      <div className="flex gap-3">
        <div
          className="h-16 w-11 shrink-0 rounded-md"
          style={{ backgroundColor: colorFromString(book.title) }}
        />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-text-primary">
            {book.title}
          </p>
          {book.author && (
            <p className="text-xs text-text-secondary">{book.author}</p>
          )}
          <select
            value={book.status}
            onChange={(e) => save({ status: e.target.value })}
            className="w-fit rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {bookStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {book.status === "LENDO" && (
        <div className="flex flex-col gap-1.5">
          {book.totalPages ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-text-secondary">
                página {book.currentPage ?? 0} de {book.totalPages}
                {progress !== null ? ` · ${progress}%` : ""}
              </p>
            </>
          ) : editingTotal ? (
            <div className="flex gap-2">
              <input
                type="number"
                autoFocus
                placeholder="Total de páginas"
                value={totalInput}
                onChange={(e) => setTotalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitTotal()}
                className="w-28 rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={submitTotal}
                className="-my-2 py-2 text-xs font-medium text-accent"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setEditingTotal(false)}
                className="text-xs text-text-secondary"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingTotal(true)}
              className="w-fit text-xs font-medium text-accent"
            >
              + Definir total de páginas
            </button>
          )}

          {editingPage ? (
            <div className="flex gap-2">
              <input
                type="number"
                autoFocus
                placeholder="Página atual"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitPage()}
                className="w-28 rounded-md border border-border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={submitPage}
                className="-my-2 py-2 text-xs font-medium text-accent"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setEditingPage(false)}
                className="text-xs text-text-secondary"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingPage(true)}
              className="w-fit text-xs font-medium text-accent"
            >
              + Atualizar página
            </button>
          )}
        </div>
      )}

      {book.status === "LIDO" && (
        <StarRating
          value={book.rating ?? 0}
          onChange={(n) => save({ rating: n })}
        />
      )}

      <textarea
        value={book.notes ?? ""}
        onChange={(e) => saveNotesDebounced(e.target.value)}
        placeholder="Notas e aprendizados"
        rows={2}
        className="resize-none rounded-md border border-border p-2 text-xs outline-none focus:ring-2 focus:ring-accent"
      />
    </Card>
  );
}
