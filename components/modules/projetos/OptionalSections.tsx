"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui";
import { cardColumns } from "@/components/layout/page-width";

export type OptionalSection = {
  key: string;
  title: string;
  /** Já tem conteúdo: aparece sempre. */
  hasContent: boolean;
  children: ReactNode;
};

/**
 * Seções que nem todo projeto usa (Diário de desenvolvimento, Credenciais,
 * Tabela de preços). Antes as sete seções apareciam em todo projeto: um
 * projeto de conteúdo da Ace tinha quatro caixas de "Nenhum… ainda" e metade
 * da página vazia. Agora cada uma aparece se já tiver algo, ou quando ela
 * pedir no "+" — e continua aberta enquanto a página estiver na tela.
 */
export function OptionalSections({ sections }: { sections: OptionalSection[] }) {
  const [added, setAdded] = useState<string[]>([]);
  const visible = sections.filter((s) => s.hasContent || added.includes(s.key));
  const hidden = sections.filter((s) => !s.hasContent && !added.includes(s.key));

  return (
    <>
      {visible.length > 0 && (
        <div className={cardColumns}>
          {visible.map((s) => (
            <Card key={s.key}>
              <CardTitle className="mb-3">{s.title}</CardTitle>
              {s.children}
            </Card>
          ))}
        </div>
      )}

      {hidden.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-secondary">Adicionar ao projeto:</span>
          {hidden.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setAdded((prev) => [...prev, s.key])}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed border-border px-3 text-xs font-medium text-text-secondary hover:bg-hover hover:text-text-primary"
            >
              <Plus size={13} aria-hidden />
              {s.title}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
