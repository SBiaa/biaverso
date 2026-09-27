"use client";

import { passwordCategoryLabels } from "@/lib/labels";

export type PasswordForm = {
  name: string;
  login: string;
  password: string;
  url: string;
  category: string;
};

export const emptyPasswordForm: PasswordForm = {
  name: "",
  login: "",
  password: "",
  url: "",
  category: "OUTRO",
};

/** Uma senha só vale se tiver nome e valor — o resto é opcional. */
export function isPasswordFormValid(form: PasswordForm) {
  return Boolean(form.name.trim() && form.password);
}

/** Corpo pronto para as rotas de senha: vazio vira null, não string vazia. */
export function passwordFormPayload(form: PasswordForm) {
  return {
    name: form.name.trim(),
    login: form.login.trim() || null,
    password: form.password,
    url: form.url.trim() || null,
    category: form.category,
  };
}

const inputClass =
  "rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent";

/**
 * Campos de uma senha. Mesmo formulário no cadastro do cofre, na edição e no
 * "criar nova" das credenciais — assim os três não saem do lugar quando um
 * campo muda.
 */
export function PasswordFields({
  form,
  onChange,
}: {
  form: PasswordForm;
  onChange: (form: PasswordForm) => void;
}) {
  function update<K extends keyof PasswordForm>(key: K, value: string) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        placeholder="Nome"
        className={inputClass}
      />
      <select
        value={form.category}
        onChange={(e) => update("category", e.target.value)}
        className={inputClass}
      >
        {Object.keys(passwordCategoryLabels).map((c) => (
          <option key={c} value={c}>
            {passwordCategoryLabels[c]}
          </option>
        ))}
      </select>
      <input
        value={form.login}
        onChange={(e) => update("login", e.target.value)}
        placeholder="Login/e-mail (opcional)"
        className={inputClass}
      />
      <input
        value={form.password}
        onChange={(e) => update("password", e.target.value)}
        placeholder="Senha"
        className={inputClass}
      />
      <input
        value={form.url}
        onChange={(e) => update("url", e.target.value)}
        placeholder="URL (opcional)"
        className={`${inputClass} sm:col-span-2`}
      />
    </div>
  );
}
