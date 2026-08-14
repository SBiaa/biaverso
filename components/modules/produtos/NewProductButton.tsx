"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { ProductFormModal, type BusinessOption } from "./ProductFormModal";

export function NewProductButton({
  businesses,
  categories,
}: {
  businesses: BusinessOption[];
  categories: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} />
        Novo produto
      </Button>
      {open && (
        <ProductFormModal
          businesses={businesses}
          categories={categories}
          onClose={() => setOpen(false)}
          // Cadastrar a base é só metade do trabalho: o que interessa é a
          // composição do custo, que só existe na página do produto.
          onSaved={(id) => router.push(`/produtos/${id}`)}
        />
      )}
    </>
  );
}
