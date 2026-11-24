"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";
import { BusinessBadge, ClickableCard } from "@/components/ui";
import { IdeaModal } from "./IdeaModal";
import { capturedLabel } from "./labels";

type Business = { id: string; name: string; color: string };

export type Idea = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  businessId: string | null;
  business: Business | null;
  /** ISO. */
  createdAt: string;
  project: { id: string; name: string; businessId: string } | null;
};

/**
 * Um card por ideia, todos do mesmo tamanho: o título e o começo dos detalhes
 * (3 linhas, com as quebras de linha do texto). Antes a descrição vinha
 * inteira e uma ideia de 1.600 caracteres virava uma coluna até o fim da
 * página. O texto completo, a edição e o resto moram na janela da ideia.
 */
export function IdeaCard({ idea, businesses }: { idea: Idea; businesses: Business[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ClickableCard
        onActivate={() => setOpen(true)}
        label={`Abrir a ideia ${idea.title}`}
        className="flex h-full flex-col gap-2"
      >
        <p className="line-clamp-2 text-sm font-semibold text-text-primary">{idea.title}</p>

        {idea.description && (
          <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
            {idea.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-text-secondary">
          <BusinessBadge business={idea.business} />
          {idea.project && (
            <span className="inline-flex min-w-0 items-center gap-1 text-accent-ink">
              <FolderKanban size={12} className="shrink-0" aria-hidden />
              <span className="truncate">{idea.project.name}</span>
            </span>
          )}
          <span className="ml-auto shrink-0">{capturedLabel(idea.createdAt)}</span>
        </div>
      </ClickableCard>

      {open && (
        <IdeaModal idea={idea} businesses={businesses} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
