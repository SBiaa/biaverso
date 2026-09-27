"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNote, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  PasswordFields,
  emptyPasswordForm,
  isPasswordFormValid,
  passwordFormPayload,
} from "@/components/modules/senhas/PasswordFields";

export function AddPasswordForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPasswordForm);

  async function handleSubmit() {
    if (!isPasswordFormValid(form)) return;
    setSaving(true);
    setError(null);

    try {
      await api.post("/api/passwords", passwordFormPayload(form));
      // Só limpa depois de gravar: uma senha digitada e perdida é irrecuperável.
      setOpen(false);
      setForm(emptyPasswordForm);
      router.refresh();
      notify("Salvo.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Nova senha</Button>;
  }

  return (
    <Card className="flex flex-col gap-2">
      <ErrorNote message={error} />
      <PasswordFields form={form} onChange={setForm} />
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving || !isPasswordFormValid(form)}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
