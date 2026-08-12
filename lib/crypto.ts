import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Criptografia dos campos sensíveis do banco: as senhas do cofre e os tokens
 * do Google.
 *
 * O que isto protege: o banco vazar sozinho — um dump, um backup, a connection
 * string parando onde não devia, alguém abrindo o console do Neon. Sem a chave,
 * o que está lá é ruído.
 *
 * O que isto NÃO protege: quem já entrou no app. Passou pelo Basic Auth, vê as
 * senhas na tela — é para isso que o cofre existe. Quem controla o servidor tem
 * a chave junto, e nesse caso a criptografia não muda nada.
 *
 * Server-only: usa `node:crypto` e lê a chave do ambiente, então nunca pode ser
 * importado de um componente "use client".
 */

const PREFIX = "v1";
const ALGORITHM = "aes-256-gcm";
/** 96 bits — o tamanho para o qual o GCM foi especificado. */
const IV_BYTES = 12;
const KEY_BYTES = 32;

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY não está definida. Gere uma com " +
        '`node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"` ' +
        "e guarde no .env — veja a seção Criptografia no README.",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY precisa ter ${KEY_BYTES} bytes em base64 (veio com ${key.length}).`,
    );
  }

  return key;
}

/**
 * Já passou por aqui? O prefixo é o que deixa texto simples e texto cifrado
 * conviverem no mesmo campo enquanto a conversão não rodou.
 */
export function isEncrypted(value: string) {
  return value.startsWith(`${PREFIX}:`);
}

/** Texto simples → `v1:iv:tag:cifra`, tudo em base64 (que não usa ":"). */
export function encrypt(value: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return [
    PREFIX,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Volta ao texto simples. Valor sem o prefixo é dado que ainda não foi
 * convertido: devolve como está, em vez de estourar — é o que permite subir
 * este código com o banco ainda todo em texto simples e converter depois.
 *
 * GCM autentica além de cifrar: se alguém editar o valor direto no banco, ou a
 * chave for a errada, o `final()` lança em vez de devolver lixo silencioso.
 */
export function decrypt(value: string) {
  if (!isEncrypted(value)) return value;

  const [, iv, tag, ciphertext] = value.split(":");
  if (!iv || !tag || !ciphertext) {
    throw new Error("Valor criptografado malformado no banco.");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return (
    decipher.update(Buffer.from(ciphertext, "base64")).toString("utf8") +
    decipher.final("utf8")
  );
}
