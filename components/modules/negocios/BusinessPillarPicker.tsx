"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

/**
 * Liga e desliga os pilares da Central de Visão direto na página do negócio.
 * Um negócio pode estar em vários pilares (ex.: tarô é pessoal e financeiro).
 */
export function BusinessPillarPicker({
  businessId,
  pillarIds,
}: {
  businessId: string;
  pillarIds: string[];
}) {
  const router = useRouter();
  const [pillars, setPillars] = useState<{ id: string; name: string; color: string }[] | null>(
    null,
  );
  const [selected, setSelected] = useState(pillarIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ id: string; name: string; color: string }[]>("/api/vision/pillars")
      .then((list) => !cancelled && setPillars(list))
      .catch((e) => !cancelled && setError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    const before = selected;
    setSelected(next);
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/businesses/${businessId}`, { pillarIds: next });
      notify("Pilares salvos.");
      router.refresh();
    } catch (e) {
      setSelected(before);
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (pillars === null) {
    return error ? (
      <ErrorNote message={error} />
    ) : (
      <p className="text-xs text-text-secondary">Carregando pilares…</p>
    );
  }

  if (pillars.length === 0) {
    return (
      <p className="text-xs text-text-secondary">
        Você ainda não tem pilares. Crie um na Central de Visão primeiro.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {pillars.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              disabled={saving}
              onClick={() => toggle(p.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                on
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:bg-hover",
              )}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-text-secondary">Pode marcar mais de um.</p>
      <ErrorNote message={error} />
    </div>
  );
}
