"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Lock, User } from "lucide-react";
import { Card } from "@/components/ui";

type PasswordRowProps = {
  name: string;
  login: string | null;
  password: string;
  url: string | null;
};

export function PasswordRow({ name, login, password, url }: PasswordRowProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<"login" | "password" | null>(null);

  async function handleCopy(value: string, type: "login" | "password") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{name}</p>
        {login && <p className="text-xs text-text-secondary">{login}</p>}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-text-secondary">
            {visible ? password : "•".repeat(Math.max(password.length, 8))}
          </span>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-text-secondary hover:text-text-primary"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-accent"
          >
            {url}
          </a>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {login && (
          <button
            type="button"
            title="Copiar login"
            onClick={() => handleCopy(login, "login")}
            className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
          >
            {copied === "login" ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <User size={14} />
            )}
          </button>
        )}
        <button
          type="button"
          title="Copiar senha"
          onClick={() => handleCopy(password, "password")}
          className="rounded-md p-1.5 text-text-secondary hover:bg-black/[0.03] hover:text-text-primary"
        >
          {copied === "password" ? (
            <Check size={14} className="text-emerald-600" />
          ) : (
            <Lock size={14} />
          )}
        </button>
      </div>
    </Card>
  );
}
