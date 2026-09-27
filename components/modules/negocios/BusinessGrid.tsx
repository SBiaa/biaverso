"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Pin, PinOff, Power, Users } from "lucide-react";
import {
  Button,
  Card,
  ErrorNote,
  IconButton,
  notify,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { getBusinessIcon } from "@/lib/business-visuals";
import { moduleLabels, type BusinessModuleState } from "@/lib/business-modules";
import { cn } from "@/lib/utils";
import { BusinessFormModal } from "./BusinessFormModal";

type BusinessItem = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  active: boolean;
  /** Ocupa uma linha na barra lateral. */
  showInNav: boolean;
  activeClientCount: number;
  /** Só os ligados, na ordem das abas. */
  modules: BusinessModuleState["module"][];
};

export function BusinessGrid({ businesses }: { businesses: BusinessItem[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BusinessItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(business: BusinessItem, data: Partial<BusinessItem>) {
    setError(null);

    try {
      await api.patch(`/api/businesses/${business.id}`, data);
      router.refresh();
      notify("Pronto.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setCreating(true)}>+ Novo negócio</Button>

      <ErrorNote message={error} />

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {businesses.map((business) => {
          const Icon = getBusinessIcon(business.icon);
          return (
            <Card
              key={business.id}
              className={cn("flex flex-col gap-3", !business.active && "opacity-50")}
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/negocios/${business.id}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${business.color}1F`, color: business.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {business.name}
                    </p>
                    {business.description && (
                      <p className="text-xs text-text-secondary">
                        {business.description}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Fica no cabeçalho, e não na fila de baixo: com três botões
                    de texto o card virava três linhas de ação. Aqui a chave
                    também lê como uma propriedade do negócio, não como ação. */}
                <IconButton
                  title={
                    business.showInNav
                      ? "Está na barra lateral — clique para tirar"
                      : "Fora da barra lateral — clique para pôr de volta"
                  }
                  onClick={() =>
                    patch(business, { showInNav: !business.showInNav })
                  }
                >
                  {/* A cor vai no ícone, não no botão: `cn` aqui é um join
                      simples, então `text-accent` e o `text-text-secondary`
                      do IconButton brigariam pela ordem do CSS. */}
                  {business.showInNav ? (
                    <Pin size={15} className="text-accent" />
                  ) : (
                    <PinOff size={15} />
                  )}
                </IconButton>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Users size={14} />
                {business.activeClientCount} cliente(s) ativo(s)
              </div>

              {business.modules.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {business.modules.map((module) => (
                    <span
                      key={module}
                      className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                    >
                      {moduleLabels[module]}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditing(business)}>
                  <Pencil size={14} />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => patch(business, { active: !business.active })}
                >
                  <Power size={14} />
                  {business.active ? "Desativar" : "Reativar"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {creating && (
        <BusinessFormModal mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && (
        <BusinessFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
