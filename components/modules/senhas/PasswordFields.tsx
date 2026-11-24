"use client";

import { Field, fieldClass } from "@/components/ui";
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

/**
 * Campos de uma senha. Mesmo formulário no cadastro do cofre, na edição e no
 * "criar nova" das credenciais — assim os três não saem do lugar quando um
 * campo muda. Cada campo tem rótulo: só com placeholder, ao começar a digitar
 * não dava mais para saber se aquele era o login ou a senha.
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
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome">
        <input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ex.: Banco"
          className={fieldClass}
        />
      </Field>
      <Field label="Categoria">
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          className={fieldClass}
        >
          {Object.keys(passwordCategoryLabels).map((c) => (
            <option key={c} value={c}>
              {passwordCategoryLabels[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Login/e-mail (opcional)">
        <input
          value={form.login}
          onChange={(e) => update("login", e.target.value)}
          autoComplete="off"
          className={fieldClass}
        />
      </Field>
      <Field label="Senha">
        <input
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className={fieldClass}
        />
      </Field>
      <Field label="URL (opcional)" className="sm:col-span-2">
        <input
          type="url"
          value={form.url}
          onChange={(e) => update("url", e.target.value)}
          placeholder="https://"
          className={fieldClass}
        />
      </Field>
    </div>
  );
}
