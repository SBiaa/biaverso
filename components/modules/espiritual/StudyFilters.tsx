"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { studyStatusLabels } from "@/lib/espiritual-shared";
import { inputClass } from "./form-kit";

export function StudyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    // "Em aberto" é o padrão da tela, então ele é a URL limpa — e não um
    // `?status=ABERTOS` pendurado em todo link compartilhado.
    if (value === "ABERTOS") params.delete("status");
    else params.set("status", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={searchParams.get("status") ?? "ABERTOS"}
      onChange={(e) => setStatus(e.target.value)}
      aria-label="Filtrar por status"
      className={inputClass}
    >
      {/* "Em aberto" não é status do banco: é o corte de tudo que ainda não foi
          entregue, que é o que ela precisa ver antes de qualquer outra coisa. */}
      <option value="ABERTOS">Em aberto</option>
      <option value="TODOS">Tudo</option>
      {Object.entries(studyStatusLabels).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
