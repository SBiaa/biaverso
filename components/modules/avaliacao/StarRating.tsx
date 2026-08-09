"use client";

import { Star } from "lucide-react";

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
};

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            size={22}
            className={n <= value ? "text-accent" : "text-border"}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
