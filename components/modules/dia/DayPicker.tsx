"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { addUtcDays, formatDateLongBR, toDateInputValue } from "@/lib/utils";

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
      <button
        type="button"
        onClick={() => go(-1)}
        className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
        aria-label="Dia anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={goToday}
        className="text-xl font-semibold text-text-primary hover:text-accent"
      >
        {formatDateLongBR(new Date(date))}
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
        aria-label="Próximo dia"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
