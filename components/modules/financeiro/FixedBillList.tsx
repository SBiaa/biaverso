"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { billStatusLabels, fixedBillTypeLabels } from "@/lib/labels";

type BillItem = {
  logId: string;
  name: string;
  amount: number;
  dueDay: number;
  type: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
};

const statusStyles: Record<string, string> = {
  PAGO: "bg-badge-creative-bg text-badge-creative-text",
  PENDENTE: "bg-badge-casa-bg text-badge-casa-text",
  ATRASADO: "bg-badge-ace-bg text-badge-ace-text",
};

export function FixedBillList({ items: initialItems }: { items: BillItem[] }) {
  const [items, setItems] = useState(initialItems);

  function toggle(logId: string) {
    const item = items.find((i) => i.logId === logId);
    if (!item) return;
    const nextStatus = item.status === "PAGO" ? "PENDENTE" : "PAGO";
    setItems((prev) =>
      prev.map((i) => (i.logId === logId ? { ...i, status: nextStatus } : i)),
    );
    fetch(`/api/fixed-bill-logs/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Card key={item.logId} className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => toggle(item.logId)}
            className="flex items-center gap-3 text-left"
          >
            {item.status === "PAGO" ? (
              <CheckCircle2 size={18} className="text-accent" />
            ) : (
              <Circle size={18} className="text-text-secondary" />
            )}
            <div>
              <p className="text-sm font-medium text-text-primary">
                {item.name}
              </p>
              <p className="text-xs text-text-secondary">
                {fixedBillTypeLabels[item.type]} · vence dia {item.dueDay}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusStyles[item.status],
              )}
            >
              {billStatusLabels[item.status]}
            </span>
            <span className="text-sm font-semibold text-text-primary">
              {formatCurrencyBRL(item.amount)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
