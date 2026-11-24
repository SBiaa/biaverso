"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorNote, SaveStatus, useSaveStatus } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

/** Quanto esperar depois da última tecla antes de gravar. */
const PAUSE_MS = 1500;

/**
 * Documentação livre do projeto — briefing, combinados, anotações.
 *
 * Salva sozinha quando ela para de digitar (1,5s) ou sai do campo, com o
 * mesmo aviso "Salvando… / Salvo" do resto do app. Antes tinha um botão
 * "Salvar documentação" ao lado de um "Tudo salvo" — dois avisos que se
 * contradiziam. Esperar a pausa, e não gravar a cada tecla, mantém o cuidado
 * de não fazer um PATCH por caractere.
 */
export function ProjectDocumentation({
  projectId,
  initialContent,
}: {
  projectId: string;
  initialContent: string | null;
}) {
  const [content, setContent] = useState(initialContent ?? "");
  const [error, setError] = useState<string | null>(null);
  const { state, track } = useSaveStatus();
  const saved = useRef(initialContent ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (value === saved.current) return;
    setError(null);
    try {
      await track(api.patch(`/api/projects/${projectId}`, { content: value }));
      saved.current = value;
    } catch (e) {
      // O texto continua no campo; só o aviso aparece.
      setError(errorMessage(e));
    }
  }

  // O texto mais recente, para a gravação de saída abaixo.
  const latest = useRef(content);
  useEffect(() => {
    latest.current = content;
  });

  // Saiu da página no meio da pausa: grava o que estava esperando, senão as
  // últimas palavras digitadas se perdiam. O pedido segue mesmo com o
  // componente desmontado; não há mais tela para mostrar "Salvo".
  useEffect(() => {
    return () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      if (latest.current !== saved.current) {
        void api.patch(`/api/projects/${projectId}`, { content: latest.current }).catch(() => {});
      }
    };
  }, [projectId]);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => {
          const value = e.target.value;
          setContent(value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void flush(value), PAUSE_MS);
        }}
        onBlur={() => void flush(content)}
        rows={12}
        placeholder="Briefing, combinados, links, anotações… aceita markdown. Salva sozinho."
        aria-label="Documentação do projeto"
        className="w-full resize-y rounded-lg border border-border p-3 font-mono text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex min-h-5 items-center justify-end">
        <SaveStatus state={state} />
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
