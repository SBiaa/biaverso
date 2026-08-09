"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type QuarterPickerProps = {
  quarter: number;
  year: number;
};

export function QuarterPicker({ quarter, year }: QuarterPickerProps) {
  const router = useRouter();
  const pathname = usePathname();

  function go(delta: number) {
    let nextQuarter = quarter + delta;
    let nextYear = year;
    if (nextQuarter > 4) {
      nextQuarter = 1;
      nextYear += 1;
    } else if (nextQuarter < 1) {
      nextQuarter = 4;
      nextYear -= 1;
    }
    router.push(`${pathname}?quarter=${nextQuarter}&year=${nextYear}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => go(-1)}
        className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-medium text-text-primary">
        {quarter}º trimestre de {year}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        className="rounded-md border border-border p-1.5 hover:bg-black/[0.03]"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
