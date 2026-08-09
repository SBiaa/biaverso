"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { formatDateLongBR } from "@/lib/utils";

type DayPickerProps = {
  date: string;
};

export function DayPicker({ date }: DayPickerProps) {
  const router = useRouter();
  const pathname = usePathname();

  function go(deltaDays: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + deltaDays);
    const isoDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    router.push(`${pathname}?date=${isoDate}`);
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
