import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
};

export function StatCard({
  label,
  value,
  icon,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        {icon}
      </div>
      <span
        className={cn(
          "text-2xl font-semibold text-text-primary",
          valueClassName,
        )}
      >
        {value}
      </span>
    </Card>
  );
}
