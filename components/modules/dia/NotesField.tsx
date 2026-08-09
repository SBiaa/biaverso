"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui";

type NotesFieldProps = {
  dayId: string;
  initialNotes: string | null;
};

export function NotesField({ dayId, initialNotes }: NotesFieldProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  function persist(value: string) {
    return fetch(`/api/dias/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
  }

  function handleChange(value: string) {
    setNotes(value);
    setSaved(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      persist(value);
    }, 700);
  }

  async function handleSave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await persist(notes);
    setSaved(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Como foi o seu dia?"
        rows={4}
        className="w-full resize-none rounded-lg border border-border p-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-accent">
            <Check size={14} /> Salvo
          </span>
        )}
        <Button type="button" variant="secondary" onClick={handleSave}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
