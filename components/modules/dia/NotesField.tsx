"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ErrorNote, SaveStatus, useSaveStatus } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

type NotesFieldProps = {
  dayId: string;
  initialNotes: string | null;
};

export function NotesField({ dayId, initialNotes }: NotesFieldProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const { state: saveState, track } = useSaveStatus();
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function persist(value: string) {
    try {
      await track(api.patch(`/api/dias/${dayId}`, { notes: value }));
      setError(null);
      return true;
    } catch (e) {
      // Só avisa: o texto digitado continua na tela para não se perder.
      setError(errorMessage(e));
      return false;
    }
  }

  function handleChange(value: string) {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => void persist(value), 700);
  }

  async function handleSave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await persist(notes);
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
        <ErrorNote message={error} />
        <SaveStatus state={saveState} />
        <Button type="button" variant="secondary" onClick={handleSave}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
