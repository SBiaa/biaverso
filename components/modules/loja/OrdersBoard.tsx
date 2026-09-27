"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AttentionBadge, Button, Card } from "@/components/ui";
import { cn, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { ORDER_COLUMNS } from "@/lib/loja";
import { orderStatusLabels } from "@/lib/labels";
import { OrderModal, type CollectionOption, type OrderRecord } from "./OrderModal";
import type { OrderPickOption } from "./OrderItemsEditor";

export type OrderCard = {
  record: OrderRecord;
  collectionName: string | null;
  overdue: boolean;
};

export function OrdersBoard({
  businessId,
  collections,
  orders,
  pickOptions,
  hourlyRate,
  targetMargin,
}: {
  businessId: string;
  collections: CollectionOption[];
  orders: OrderCard[];
  pickOptions: OrderPickOption[];
  hourlyRate: number | null;
  targetMargin: number;
}) {
  const [editing, setEditing] = useState<OrderRecord | null>(null);
  const [creating, setCreating] = useState(false);

  const canceled = orders.filter((o) => o.record.status === "CANCELADO");

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setCreating(true)}>
        <Plus size={14} />
        Novo pedido
      </Button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ORDER_COLUMNS.map((column) => {
          const columnOrders = orders.filter((o) => o.record.status === column.key);
          return (
            <div key={column.key} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                {column.label}{" "}
                <span className="font-normal text-text-secondary">({columnOrders.length})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {columnOrders.length === 0 ? (
                  <p className="text-xs text-text-secondary">Nada por aqui.</p>
                ) : (
                  columnOrders.map((order) => (
                    <Card
                      key={order.record.id}
                      onClick={() => setEditing(order.record)}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1.5 p-3 transition-colors hover:bg-hover",
                        // Prazo estourado com o pedido ainda em aberto.
                        order.overdue && "border-red-500 bg-red-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary">
                          {order.record.customerName}
                        </p>
                        {order.record.orderNumber && (
                          <span className="shrink-0 text-[11px] text-text-secondary">
                            #{order.record.orderNumber}
                          </span>
                        )}
                      </div>

                      <p className="line-clamp-2 text-xs text-text-secondary">
                        {order.record.items.length === 0
                          ? "Sem itens"
                          : order.record.items
                              .map((item) => `${item.quantity}× ${item.name}`)
                              .join(", ")}
                      </p>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                          {formatCurrencyBRL(order.record.totalAmount)}
                        </span>
                        {order.record.totalCost > 0 && (
                          <span
                            className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                            title="Lucro depois do custo dos itens"
                          >
                            lucro{" "}
                            {formatCurrencyBRL(
                              order.record.totalAmount - order.record.totalCost,
                            )}
                          </span>
                        )}
                        {order.collectionName && (
                          <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                            {order.collectionName}
                          </span>
                        )}
                        {order.overdue && (
                          <AttentionBadge level="atrasado">
                            Atrasado
                          </AttentionBadge>
                        )}
                      </div>

                      {order.record.dueDate && (
                        <span
                          className={cn(
                            "text-xs",
                            order.overdue ? "font-medium text-red-600" : "text-text-secondary",
                          )}
                        >
                          Entrega: {formatDateBR(new Date(order.record.dueDate))}
                        </span>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canceled.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {orderStatusLabels.CANCELADO}{" "}
            <span className="font-normal text-text-secondary">({canceled.length})</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {canceled.map((order) => (
              <button
                key={order.record.id}
                type="button"
                onClick={() => setEditing(order.record)}
                className="rounded-full bg-border px-3 py-1 text-xs text-text-secondary line-through"
              >
                {order.record.customerName}
              </button>
            ))}
          </div>
        </div>
      )}

      {creating && (
        <OrderModal
          businessId={businessId}
          collections={collections}
          pickOptions={pickOptions}
          hourlyRate={hourlyRate}
          targetMargin={targetMargin}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <OrderModal
          businessId={businessId}
          collections={collections}
          order={editing}
          pickOptions={pickOptions}
          hourlyRate={hourlyRate}
          targetMargin={targetMargin}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
