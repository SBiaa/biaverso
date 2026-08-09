"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui";

type PasswordRowProps = {
  name: string;
  login: string | null;
  password: string;
  url: string | null;
};

export function PasswordRow({ name, login, password, url }: PasswordRowProps) {
  const [visible, setVisible] = useState(false);

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
    </Card>
  );
}
