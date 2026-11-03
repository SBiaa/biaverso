"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { resizeCover } from "@/lib/client-photo";
import { cn, hexToRgba } from "@/lib/utils";

export const coverUrl = (businessId: string, version: number) =>
  `/api/businesses/${businessId}/cover?v=${version}`;

/**
 * Capa do negócio, como a de uma página do Notion. Sem imagem, vira uma faixa
 * na cor do negócio — a tela nunca fica com um buraco no topo.
 *
 * `editable` liga os botões de trocar e remover (só na página do negócio; no
 * painel da tarefa ela é só a identidade visual de onde a tarefa vem).
 */
export function BusinessCover({
  businessId,
  color,
  version,
  editable = false,
  className,
}: {
  businessId: string;
  color: string;
  /** Quando a capa mudou (ms); `null` = sem imagem. */
  version: number | null;
  editable?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(version);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const image = await resizeCover(file);
      const { version: next } = await api.put<{ version: number }>(
        `/api/businesses/${businessId}/cover`,
        { image },
      );
      setCurrent(next);
      router.refresh();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/api/businesses/${businessId}/cover`);
      setCurrent(null);
      router.refresh();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn("group relative w-full overflow-hidden", className)}
      style={{
        background: `linear-gradient(120deg, ${hexToRgba(color, 0.85)}, ${hexToRgba(color, 0.35)})`,
      }}
    >
      {current !== null && (
        // eslint-disable-next-line @next/next/no-img-element -- imagem da própria API, já reduzida
        <img
          src={coverUrl(businessId, current)}
          alt=""
          className="absolute inset-0 size-full object-cover"
          // Capa apagada por outro lugar: volta para a faixa de cor.
          onError={() => setCurrent(null)}
        />
      )}

      {editable && (
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/65 disabled:opacity-60"
          >
            <ImagePlus size={14} aria-hidden />
            {busy ? "Salvando…" : current !== null ? "Trocar capa" : "Adicionar capa"}
          </button>
          {current !== null && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              aria-label="Remover capa"
              title="Remover capa"
              className="inline-flex items-center rounded-md bg-black/50 px-2 py-1 text-white backdrop-blur hover:bg-black/65 disabled:opacity-60"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
