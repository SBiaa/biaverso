"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatMonthYearBR } from "@/lib/utils";

type MonthPickerProps = {
  month: number;
  year: number;
};

export function MonthPicker({ month, year }: MonthPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => go(-1)}
        className="rounded-md border border-border p-1.5 hover:bg-hover"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-text-primary">
        {formatMonthYearBR(month, year)}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="rounded-md border border-border p-1.5 hover:bg-hover"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
