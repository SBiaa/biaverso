"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { formatDateBR } from "@/lib/utils";

type WeekPickerProps = {
  weekStart: string;
  weekEnd: string;
};

export function WeekPicker({ weekStart, weekEnd }: WeekPickerProps) {
  const router = useRouter();
  const pathname = usePathname();

  function go(deltaDays: number) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + deltaDays);
    router.push(`${pathname}?week=${next.toISOString().slice(0, 10)}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => go(-7)}
        className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-text-primary">
        {formatDateBR(new Date(weekStart))} – {formatDateBR(new Date(weekEnd))}
      </span>
      <button
        type="button"
        onClick={() => go(7)}
        className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
