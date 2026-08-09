"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui";
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
  notes: string | null;
};

export function BookCard({ book: initialBook }: { book: Book }) {
  const [book, setBook] = useState(initialBook);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(patch: Partial<Book>) {
    setBook((prev) => ({ ...prev, ...patch }));
    fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function saveNotesDebounced(notes: string) {
    setBook((prev) => ({ ...prev, notes }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    }, 700);
  }

  return (
    <Card className="flex flex-col gap-3">
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
