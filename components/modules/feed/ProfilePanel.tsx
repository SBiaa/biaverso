"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { resizeClientPhoto } from "@/lib/client-photo";
import type { MockupProfile } from "./ProfileMockup";

const fieldClass =
  "w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

export type ProfileFormValues = Omit<MockupProfile, "photo"> & {
  /** Só a foto própria do perfil; a da cliente é o plano B. */
  photo: string | null;
};

/** Converte o campo de número: vazio = sem número (o mockup mostra "—"). */
function toCount(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** Cabeçalho do perfil. Cada mudança já aparece na prévia; salvar grava. */
export function ProfilePanel({
  clientId,
  values,
  clientPhoto,
  onChange,
}: {
  clientId: string;
  values: ProfileFormValues;
  clientPhoto: string | null;
  onChange: (values: ProfileFormValues) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      set("photo", await resizeClientPhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui abrir essa imagem.");
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/feed/${clientId}/profile`, {
        ...values,
        handle: values.handle?.replace(/^@/, "") ?? null,
      });
      router.refresh();
      notify("Perfil salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const shownPhoto = values.photo ?? clientPhoto;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="size-16 shrink-0 overflow-hidden rounded-full border border-border bg-hover"
          title="Trocar foto do perfil"
        >
          {shownPhoto && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL
            <img src={shownPhoto} alt="" className="size-full object-cover" />
          )}
        </button>
        <div className="text-xs text-text-secondary">
          <button type="button" onClick={() => fileRef.current?.click()} className="font-medium text-accent">
            Trocar foto
          </button>
          {values.photo ? (
            <>
              {" · "}
              <button type="button" onClick={() => set("photo", null)} className="hover:text-danger">
                usar a da cliente
              </button>
            </>
          ) : (
            <p>Usando a foto da cliente.</p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void pickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">@</span>
          <input className={fieldClass} value={values.handle ?? ""} onChange={(e) => set("handle", e.target.value || null)} placeholder="nome.do.perfil" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Nome de exibição</span>
          <input className={fieldClass} value={values.displayName ?? ""} onChange={(e) => set("displayName", e.target.value || null)} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">Categoria</span>
        <input className={fieldClass} value={values.category ?? ""} onChange={(e) => set("category", e.target.value || null)} placeholder="Dentista" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">Bio</span>
        <textarea className={fieldClass} rows={4} value={values.bio ?? ""} onChange={(e) => set("bio", e.target.value || null)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">Link da bio</span>
        <input className={fieldClass} value={values.link ?? ""} onChange={(e) => set("link", e.target.value || null)} placeholder="linktr.ee/…" />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["postsCount", "Posts"],
            ["followersCount", "Seguidores"],
            ["followingCount", "Seguindo"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-text-secondary">{label}</span>
            <input
              className={fieldClass}
              inputMode="numeric"
              value={values[key] ?? ""}
              onChange={(e) => set(key, toCount(e.target.value))}
              placeholder="—"
            />
          </label>
        ))}
      </div>

      <ErrorNote message={error} />
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Salvando…" : "Salvar perfil"}
      </Button>
    </form>
  );
}
