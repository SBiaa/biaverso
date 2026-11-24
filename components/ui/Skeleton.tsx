import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Bloco cinza pulsando usado nas telas de carregamento. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
