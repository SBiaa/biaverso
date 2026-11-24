"use client";

import { useId, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { notify } from "@/components/ui";
import { errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Lista que se reordena arrastando.
 *
 * Os dados continuam vindo do servidor (props): o componente guarda só a ordem
 * que ela acabou de montar, para a lista não pular de volta enquanto a gravação
 * viaja. Quando a ordem do servidor muda (gravou, ou outra aba mexeu), a dela
 * é descartada e vale a do servidor — o mesmo vale se a gravação falhar.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  layout = "list",
  className,
  itemClassName,
  children,
}: {
  items: T[];
  /** Grava a ordem nova. Se lançar, a lista volta ao que estava. */
  onReorder: (ids: string[]) => Promise<unknown>;
  layout?: "list" | "grid";
  className?: string;
  itemClassName?: string;
  /** `handle` é a alça de arrastar já pronta: cada tela escolhe onde pô-la. */
  children: (item: T, handle: ReactNode) => ReactNode;
}) {
  // Sem um id estável o dnd-kit numera o texto de acessibilidade por contador, e
  // o contador do servidor não bate com o do navegador (erro de hidratação).
  const dndId = useId();
  const serverOrder = items.map((i) => i.id).join(",");
  const [override, setOverride] = useState<string[] | null>(null);
  const [seenOrder, setSeenOrder] = useState(serverOrder);

  // Ajuste durante a renderização (e não em effect): evita um quadro com a
  // ordem velha quando o servidor devolve a nova.
  if (seenOrder !== serverOrder) {
    setSeenOrder(serverOrder);
    setOverride(null);
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered =
    override && override.length === items.length && override.every((id) => byId.has(id))
      ? override.map((id) => byId.get(id)!)
      : items;

  // Um toque curto não pode virar arrasto, senão tocar na linha no celular
  // move a lista em vez de abrir o que se queria.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = ordered.findIndex((i) => i.id === active.id);
    const to = ordered.findIndex((i) => i.id === over.id);
    const next = arrayMove(ordered, from, to).map((i) => i.id);

    setOverride(next);
    try {
      await onReorder(next);
    } catch (e) {
      setOverride(null);
      notify(errorMessage(e), "error");
    }
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={ordered.map((i) => i.id)}
        strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <div className={className}>
          {ordered.map((item) => (
            <SortableItem key={item.id} id={item.id} className={itemClassName}>
              {(handle) => children(item, handle)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Arrastar para reordenar"
      title="Arrastar para reordenar"
      // touch-none: sem isso o navegador usa o gesto para rolar a página e o
      // arrasto nunca começa no celular.
      className="inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-text-secondary hover:bg-hover active:cursor-grabbing"
    >
      <GripVertical size={16} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-60", className)}
    >
      {children(handle)}
    </div>
  );
}
