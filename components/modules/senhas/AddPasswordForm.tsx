"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { passwordCategoryLabels } from "@/lib/labels";

const categoryOptions = Object.keys(passwordCategoryLabels);

export function AddPasswordForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
    url: "",
    category: categoryOptions[0],
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.password) return;
    setSaving(true);
    await fetch("/api/passwords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: "", login: "", password: "", url: "", category: categoryOptions[0] });
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Nova senha</Button>;
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          placeholder="Nome"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        >
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {passwordCategoryLabels[c]}
            </option>
          ))}
        </select>
      </div>
      <input
        placeholder="Login/e-mail (opcional)"
        value={form.login}
        onChange={(e) => update("login", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        placeholder="Senha"
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        placeholder="URL (opcional)"
        value={form.url}
        onChange={(e) => update("url", e.target.value)}
        className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
