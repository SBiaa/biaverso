"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

/**
 * Documentação livre do projeto — briefing, combinados, anotações.
 *
 * Salva no botão, não a cada tecla: é um campo de texto longo, e um PATCH por
 * caractere digitado encheria o banco de escrita à toa.
 */
export function ProjectDocumentation({
  projectId,
  initialContent,
}: {
  projectId: string;
  initialContent: string | null;
}) {
  const [content, setContent] = useState(initialContent ?? "");
  const [saved, setSaved] = useState(initialContent ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = content !== saved;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/projects/${projectId}`, { content });
      setSaved(content);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        placeholder="Briefing, combinados, links, anotações… aceita markdown."
        className="w-full resize-y rounded-lg border border-border p-3 font-mono text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          Salvar documentação
        </Button>
        {!dirty && !saving && (
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            <Check size={14} className="text-emerald-600" />
            Tudo salvo
          </span>
        )}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
