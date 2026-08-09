"use client";

import { useEffect, useRef, useState } from "react";

type NotesFieldProps = {
  dayId: string;
  initialNotes: string | null;
};

export function NotesField({ dayId, initialNotes }: NotesFieldProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/dias/${dayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
    }, 700);
  }

  return (
    <textarea
      value={notes}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Como foi o seu dia?"
      rows={4}
      className="w-full resize-none rounded-lg border border-border p-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
    />
  );
}
