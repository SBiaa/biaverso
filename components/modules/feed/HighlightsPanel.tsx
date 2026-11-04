"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button, confirmAction, ErrorNote, IconButton } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { resizeClientPhoto } from "@/lib/client-photo";
import type { MockupHighlight } from "./ProfileMockup";

/**
 * Destaques em lista ordenável. A ordem muda na tela na hora (e já reflete na
 * prévia); se o servidor recusar, volta como estava.
 */
export function HighlightsPanel({
  clientId,
  highlights,
  onChange,
}: {
  clientId: string;
  highlights: MockupHighlight[];
  onChange: (highlights: MockupHighlight[]) => void;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const previous = highlights;
    const next = arrayMove(
      highlights,
      highlights.findIndex((h) => h.id === active.id),
      highlights.findIndex((h) => h.id === over.id),
    );
    onChange(next);
    try {
      await api.post(`/api/feed/${clientId}/highlights/reorder`, { ids: next.map((h) => h.id) });
    } catch (e) {
      onChange(previous);
      setError(errorMessage(e));
    }
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      const created = await api.post<MockupHighlight>(`/api/feed/${clientId}/highlights`, { name });
      onChange([...highlights, created]);
      setNewName("");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function patch(id: string, data: Partial<MockupHighlight>) {
    const previous = highlights;
    onChange(highlights.map((h) => (h.id === id ? { ...h, ...data } : h)));
    try {
      await api.patch(`/api/feed/highlights/${id}`, data);
    } catch (e) {
      onChange(previous);
      setError(errorMessage(e));
    }
  }

  async function remove(highlight: MockupHighlight) {
    const confirmed = await confirmAction({
      title: `Excluir o destaque “${highlight.name}”?`,
      destructive: true,
    });
    if (!confirmed) return;
    const previous = highlights;
    onChange(highlights.filter((h) => h.id !== highlight.id));
    try {
      await api.delete(`/api/feed/highlights/${highlight.id}`);
    } catch (e) {
      onChange(previous);
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-3">
      {highlights.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum destaque ainda.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={highlights.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {highlights.map((h) => (
                <SortableHighlight
                  key={h.id}
                  highlight={h}
                  onRename={(name) => patch(h.id, { name })}
                  onCover={(cover) => patch(h.id, { cover })}
                  onDelete={() => remove(h)}
                  onError={setError}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do destaque"
        />
        <Button type="submit" variant="secondary" disabled={!newName.trim()}>
          <Plus size={16} />
          Adicionar
        </Button>
      </form>
      <ErrorNote message={error} />
    </div>
  );
}

function SortableHighlight({
  highlight,
  onRename,
  onCover,
  onDelete,
  onError,
}: {
  highlight: MockupHighlight;
  onRename: (name: string) => void;
  onCover: (cover: string) => void;
  onDelete: () => void;
  onError: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(highlight.name);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: highlight.id,
  });

  async function pickCover(file: File | undefined) {
    if (!file) return;
    try {
      onCover(await resizeClientPhoto(file));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Não consegui abrir essa imagem.");
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="group flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar destaque"
        className="cursor-grab text-text-secondary"
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Trocar capa"
        className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-hover text-text-secondary"
      >
        {highlight.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL
          <img src={highlight.cover} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus size={14} />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pickCover(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (!trimmed) setName(highlight.name);
          else if (trimmed !== highlight.name) onRename(trimmed);
        }}
        aria-label="Nome do destaque"
      />
      <IconButton tone="danger" revealOnHover onClick={onDelete} aria-label="Excluir destaque">
        <Trash2 size={14} />
      </IconButton>
    </div>
  );
}
