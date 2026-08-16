"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { addUtcDays, formatDateLongBR, toDateInputValue } from "@/lib/utils";
import { IconButton } from "@/components/ui";

type DayPickerProps = {
  date: string;
};

export function DayPicker({ date }: DayPickerProps) {
  const router = useRouter();
  const pathname = usePathname();

  function go(deltaDays: number) {
    const next = addUtcDays(new Date(date), deltaDays);
    router.push(`${pathname}?date=${toDateInputValue(next)}`);
  }

  function goToday() {
    router.push(pathname);
  }

  return (
    <div className="flex items-center gap-3">
      <IconButton
        onClick={() => go(-1)}
        aria-label="Dia anterior"
        className="border border-border"
      >
        <ChevronLeft size={16} />
      </IconButton>
      <button
        type="button"
        onClick={goToday}
        className="text-xl font-semibold text-text-primary hover:text-accent"
      >
        {formatDateLongBR(new Date(date))}
      </button>
      <IconButton
        onClick={() => go(1)}
        aria-label="Próximo dia"
        className="border border-border"
      >
        <ChevronRight size={16} />
      </IconButton>
    </div>
  );
}
