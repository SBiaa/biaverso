"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { addUtcDays, formatDateBR, toDateInputValue } from "@/lib/utils";
import { IconButton } from "@/components/ui";

type WeekPickerProps = {
  weekStart: string;
  weekEnd: string;
};

export function WeekPicker({ weekStart, weekEnd }: WeekPickerProps) {
  const router = useRouter();
  const pathname = usePathname();

  function go(deltaDays: number) {
    const next = addUtcDays(new Date(weekStart), deltaDays);
    router.push(`${pathname}?week=${toDateInputValue(next)}`);
  }

  return (
    <div className="flex items-center gap-3">
      <IconButton
        onClick={() => go(-7)}
        className="border border-border"
      >
        <ChevronLeft size={16} />
      </IconButton>
      <span className="text-sm font-medium text-text-primary">
        {formatDateBR(new Date(weekStart))} – {formatDateBR(new Date(weekEnd))}
      </span>
      <IconButton
        onClick={() => go(7)}
        className="border border-border"
      >
        <ChevronRight size={16} />
      </IconButton>
    </div>
  );
}
