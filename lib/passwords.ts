import { decrypt } from "@/lib/crypto";

/**
 * O campo `password` do cofre sai do banco cifrado. Estes helpers são o único
 * lugar por onde ele volta a ser legível, para nenhuma tela esquecer de
 * decriptar e acabar mostrando `v1:...` no lugar da senha.
 *
 * Server-only, como lib/crypto.
 */

/** Uma entrada do cofre com a senha legível. */
export function decryptEntry<T extends { password: string }>(entry: T): T {
  return { ...entry, password: decrypt(entry.password) };
}

/**
 * Os vínculos de credencial de um projeto ou negócio: o `passwordEntry` de
 * dentro é que carrega a senha.
 */
export function decryptCredentialLinks<
  T extends { passwordEntry: { password: string } },
>(links: T[]): T[] {
  return links.map((link) => ({
    ...link,
    passwordEntry: decryptEntry(link.passwordEntry),
  }));
}
