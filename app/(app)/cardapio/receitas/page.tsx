import { redirect } from "next/navigation";

// A biblioteca passou a viver embaixo da grade, em /cardapio. O endereço
// antigo continua de pé para não quebrar link salvo nem histórico.
export default function ReceitasPage() {
  redirect("/cardapio");
}
