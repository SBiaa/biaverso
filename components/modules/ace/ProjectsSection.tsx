"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button, Card, CardTitle } from "@/components/ui";
import { formatDateBR } from "@/lib/utils";
import { projectStatusLabels, contentStatusLabels, productionStatusLabels } from "@/lib/labels";
import { ProjectFormModal } from "@/components/modules/negocios/ProjectFormModal";
import {
  ContentPostModal,
  INTERNAL_CLIENT,
  type ClientOption,
  type ProjectOption,
  type PostRecord,
} from "./ContentPostModal";
import { ProductionTaskModal, type TaskRecord } from "./ProductionTaskModal";

export type ProjectWithItems = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  posts: PostRecord[];
  tasks: TaskRecord[];
};

/**
 * Projetos com o conteúdo pendurado neles. Serve tanto ao perfil de um cliente
 * quanto à aba Interno do negócio: sem `clientId`, tudo que for criado aqui
 * nasce interno (`clientId` nulo).
 */
export function ProjectsSection({
  businessId,
  clientId,
  projects,
  clients,
  projectOptions,
  loosePosts = [],
  looseTasks = [],
}: {
  businessId: string;
  /** Undefined = seção interna do negócio. */
  clientId?: string;
  projects: ProjectWithItems[];
  clients: ClientOption[];
  projectOptions: ProjectOption[];
  /** Itens sem projeto — aparecem num bloco solto no fim. */
  loosePosts?: PostRecord[];
  looseTasks?: TaskRecord[];
}) {
  const internal = clientId === undefined;
  const [expandedId, setExpandedId] = useState<string | null>(projects[0]?.id ?? null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingFor, setCreatingFor] = useState<{
    projectId: string | null;
    kind: "post" | "task";
  } | null>(null);
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);

  const defaultClientId = clientId ?? INTERNAL_CLIENT;

  function postList(posts: PostRecord[]) {
    if (posts.length === 0) {
      return <p className="text-xs text-text-secondary">Nenhum post vinculado.</p>;
    }
    return (
      <ul className="flex flex-col gap-1">
        {posts.map((post) => (
          <li key={post.id}>
            <button
              type="button"
              onClick={() => setEditingPost(post)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-hover"
            >
              <span className="text-text-primary">{post.title}</span>
              <span className="flex items-center gap-2 text-xs text-text-secondary">
                {contentStatusLabels[post.status]}
                {post.publishDate && <span>{formatDateBR(new Date(post.publishDate))}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function taskList(tasks: TaskRecord[]) {
    if (tasks.length === 0) {
      return <p className="text-xs text-text-secondary">Nenhuma tarefa vinculada.</p>;
    }
    return (
      <ul className="flex flex-col gap-1">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => setEditingTask(task)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-hover"
            >
              <span className="text-text-primary">{task.title}</span>
              <span className="flex items-center gap-2 text-xs text-text-secondary">
                {productionStatusLabels[task.status]}
                {task.dueDate && <span>{formatDateBR(new Date(task.dueDate))}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  function itemsBlock(
    posts: PostRecord[],
    tasks: TaskRecord[],
    projectId: string | null,
  ) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            Posts do cronograma
          </p>
          {postList(posts)}
          <Button
            variant="ghost"
            onClick={() => setCreatingFor({ projectId, kind: "post" })}
            className="mt-1 text-xs"
          >
            <Plus size={12} />
            Adicionar post
          </Button>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            Tarefas de produção
          </p>
          {taskList(tasks)}
          <Button
            variant="ghost"
            onClick={() => setCreatingFor({ projectId, kind: "task" })}
            className="mt-1 text-xs"
          >
            <Plus size={12} />
            Adicionar tarefa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <CardTitle>
          {internal ? "Projetos internos" : "Projetos"}
        </CardTitle>
        <Button variant="secondary" onClick={() => setCreatingProject(true)}>
          <Plus size={14} />
          {internal ? "Novo projeto interno" : "Novo projeto"}
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum projeto cadastrado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => {
            const expanded = expandedId === project.id;
            return (
              <Card key={project.id} className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : project.id)}
                  className="flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2">
                    {expanded ? (
                      <ChevronDown size={16} className="text-text-secondary" />
                    ) : (
                      <ChevronRight size={16} className="text-text-secondary" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{project.name}</p>
                      {project.description && (
                        <p className="text-xs text-text-secondary">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-text-secondary">
                    {projectStatusLabels[project.status]}
                  </span>
                </button>

                {/* Fora do botão de expandir: um <a> dentro de <button> é HTML
                    inválido e o clique no link seria engolido pelo toggle. */}
                <Link
                  href={`/negocios/${businessId}/projetos/${project.id}`}
                  className="inline-flex items-center gap-1 self-start text-xs font-medium text-accent hover:underline"
                >
                  Abrir projeto
                  <ArrowRight size={13} />
                </Link>

                {expanded && itemsBlock(project.posts, project.tasks, project.id)}
              </Card>
            );
          })}
        </div>
      )}

      {(loosePosts.length > 0 || looseTasks.length > 0) && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text-primary">Sem projeto</p>
          {itemsBlock(loosePosts, looseTasks, null)}
        </Card>
      )}

      {creatingProject && (
        <ProjectFormModal
          businessId={businessId}
          clientId={clientId}
          isInternal={internal}
          onClose={() => setCreatingProject(false)}
        />
      )}
      {creatingFor?.kind === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={defaultClientId}
          defaultProjectId={creatingFor.projectId ?? ""}
          onClose={() => setCreatingFor(null)}
        />
      )}
      {creatingFor?.kind === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={defaultClientId}
          defaultProjectId={creatingFor.projectId ?? ""}
          onClose={() => setCreatingFor(null)}
        />
      )}
      {editingPost && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          post={editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
      {editingTask && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
