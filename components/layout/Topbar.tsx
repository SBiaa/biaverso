import type { ReactNode } from "react";

type TopbarProps = {
  title: string;
  action?: ReactNode;
};

export function Topbar({ title, action }: TopbarProps) {
  return (
    <header className="hidden h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-6 md:flex">
      <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
      {action}
    </header>
  );
}
