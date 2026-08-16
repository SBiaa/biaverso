"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { confirmAction, ErrorNote, IconButton, notify } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import {
  ProjectFormModal,
  type ProjectFormValues,
} from "@/components/modules/negocios/ProjectFormModal";

/**
 * Editar e apagar o projeto, no cabeçalho da própria página dele. A tela era só
 * de leitura: dava para criar projeto e mudar o status, mas nome, datas e
 * cliente ficavam presos ao que foi digitado na criação.
 */
export function ProjectActions({
  businessId,
  project,
  clients,
  redirectTo,
}: {
  businessId: string;
  project: ProjectFormValues;
  /** Sem a lista, a edição não mexe no cliente — mantém o que já está gravado. */
  clients?: { id: string; name: string }[];
  /** Para onde ir depois de apagar. Sem isso, só recarrega a lista onde está. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = await confirmAction({
      title: `Apagar o projeto "${project.name}"?`,
      description: `A documentação, os documentos, a tabela de preços e as senhas vinculadas vão junto. Posts, tarefas de produção e tarefas do dia continuam existindo, só perdem o vínculo com o projeto. Não dá para desfazer.`,
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/projects/${project.id}`);
      // Na página do projeto não dá para ficar: ela deixou de existir.
      if (redirectTo) router.push(redirectTo);
      router.refresh();
      notify("Excluído.");
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <IconButton
          title="Editar projeto"
          onClick={() => setEditing(true)}
          className="hover:bg-border"
        >
          <Pencil size={15} />
        </IconButton>
        <IconButton
          title="Apagar projeto"
          onClick={handleDelete}
          disabled={deleting}
          tone="danger"
          className="hover:bg-border"
        >
          <Trash2 size={15} />
        </IconButton>
      </div>

      <ErrorNote message={error} />

      {editing && (
        <ProjectFormModal
          businessId={businessId}
          project={project}
          clients={clients}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
