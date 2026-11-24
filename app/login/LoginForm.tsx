"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="de" value={returnTo} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-primary">Senha</span>
        <div className="relative">
          <input
            name="senha"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "login-erro" : undefined}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 pr-11 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Esconder senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-text-secondary transition-colors hover:text-text-primary"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      {state.error && (
        <p
          id="login-erro"
          role="alert"
          className="rounded-lg bg-danger-soft-bg px-3 py-2 text-sm text-danger-soft-text"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 size={16} className="animate-spin" />}
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
