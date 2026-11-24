"use client";

import { Star } from "lucide-react";

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  /** Do que é a nota ("Efetividade", "Nota do livro"). */
  label?: string;
};

/**
 * Cada estrela diz o próprio número e se é a escolhida: antes eram cinco
 * botões sem nome, e pelo teclado ou leitor de tela não dava para saber qual
 * nota estava marcada. Alvo de 44px no celular, com a estrela de 22px dentro.
 */
export function StarRating({ value, onChange, label = "Nota" }: StarRatingProps) {
  return (
    <div className="flex gap-0.5 sm:gap-1" role="group" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} de 5`}
          aria-pressed={n === value}
          className="-m-1 flex size-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:m-0 sm:size-8"
        >
          <Star
            size={22}
            className={n <= value ? "text-accent-ink" : "text-border"}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
