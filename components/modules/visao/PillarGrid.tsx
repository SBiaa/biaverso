"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Target } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { getPillarIcon } from "@/lib/vision-visuals";
import { PillarFormModal } from "./PillarFormModal";

type PillarItem = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  inProgressCount: number;
};

export function PillarGrid({ pillars }: { pillars: PillarItem[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PillarItem | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setCreating(true)}>+ Novo pilar</Button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = getPillarIcon(pillar.icon);
          return (
            <Card key={pillar.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <Link href={`/visao/${pillar.id}`} className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${pillar.color}1F`, color: pillar.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{pillar.name}</p>
                    {pillar.description && (
                      <p className="text-xs text-text-secondary">{pillar.description}</p>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setEditing(pillar)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <Pencil size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Target size={14} />
                {pillar.inProgressCount} objetivo(s) em andamento
              </div>
            </Card>
          );
        })}
      </div>

      {creating && <PillarFormModal mode="create" onClose={() => setCreating(false)} />}
      {editing && (
        <PillarFormModal mode="edit" initial={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
