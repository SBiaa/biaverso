"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { getPillarIcon } from "@/lib/vision-visuals";
import { PillarFormModal } from "./PillarFormModal";

type PillarHeaderData = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
};

export function PillarHeader({ pillar }: { pillar: PillarHeaderData }) {
  const [editing, setEditing] = useState(false);
  const Icon = getPillarIcon(pillar.icon);

  return (
    <div
      className="flex items-center gap-4 rounded-[10px] border border-border p-4"
      style={{ backgroundColor: `${pillar.color}14` }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${pillar.color}33`, color: pillar.color }}
      >
        {/* eslint-disable-next-line react-hooks/static-components -- icon is looked up per pillar, not created dynamically */}
        <Icon size={26} />
      </div>
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-text-primary">{pillar.name}</h1>
        {pillar.description && (
          <p className="text-sm text-text-secondary">{pillar.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-text-secondary hover:text-text-primary"
      >
        <Pencil size={16} />
      </button>

      {editing && (
        <PillarFormModal mode="edit" initial={pillar} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
