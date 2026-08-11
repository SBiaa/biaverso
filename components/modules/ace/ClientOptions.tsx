"use client";

import type { ClientOption } from "./ContentPostModal";

/**
 * Opções do select de cliente, separadas em "deste negócio" e "outros".
 *
 * A lista inteira aparece de propósito: a mesma pessoa costuma ser cliente de
 * mais de um negócio, e antes só apareciam os que já tinham vínculo — para usar
 * um cliente da Ace na Creative era preciso cadastrar tudo de novo. Ao escolher
 * alguém de "Outros clientes", a API cria o vínculo sozinha.
 */
export function ClientOptions({ clients }: { clients: ClientOption[] }) {
  const linked = clients.filter((c) => c.linked);
  const others = clients.filter((c) => !c.linked);

  // Sem ninguém de fora, os grupos só acrescentariam um cabeçalho inútil.
  if (others.length === 0) {
    return (
      <>
        {linked.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </>
    );
  }

  return (
    <>
      {linked.length > 0 && (
        <optgroup label="Clientes deste negócio">
          {linked.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Outros clientes">
        {others.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </optgroup>
    </>
  );
}
