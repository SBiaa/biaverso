"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Power, Users } from "lucide-react";
import { Card, Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { getBusinessIcon } from "@/lib/business-visuals";
import { cn } from "@/lib/utils";
import { BusinessFormModal } from "./BusinessFormModal";

type BusinessItem = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  active: boolean;
  activeClientCount: number;
};

export function BusinessGrid({ businesses }: { businesses: BusinessItem[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BusinessItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(business: BusinessItem) {
    setError(null);

    try {
      await api.patch(`/api/businesses/${business.id}`, { active: !business.active });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setCreating(true)}>+ Novo negócio</Button>

      <ErrorNote message={error} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((business) => {
          const Icon = getBusinessIcon(business.icon);
          return (
            <Card
              key={business.id}
              className={cn("flex flex-col gap-3", !business.active && "opacity-50")}
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/negocios/${business.id}`}
                  className="flex items-center gap-3"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${business.color}1F`, color: business.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
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
              </div>

              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Users size={14} />
                {business.activeClientCount} cliente(s) ativo(s)
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(business)}>
                  <Pencil size={14} />
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => toggleActive(business)}>
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
