"use client";

import { useState } from "react";
import { FileText, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, formatDateBR } from "@/lib/utils";
import { contentStatusLabels, productionStatusLabels } from "@/lib/labels";
import {
  ContentPostModal,
  INTERNAL_CLIENT,
  type ClientOption,
  type ProjectOption,
  type PostRecord,
} from "@/components/modules/ace/ContentPostModal";
import {
  ProductionTaskModal,
  type TaskRecord,
} from "@/components/modules/ace/ProductionTaskModal";

/** Posts e tarefas de produção pendurados no projeto, com criação e edição. */
export function ProjectItems({
  businessId,
  projectId,
  clientId,
  posts,
  tasks,
  clients,
  projectOptions,
}: {
  businessId: string;
  projectId: string;
  /** Null = projeto interno do negócio. */
  clientId: string | null;
  posts: PostRecord[];
  tasks: TaskRecord[];
  clients: ClientOption[];
  projectOptions: ProjectOption[];
}) {
  const [creating, setCreating] = useState<"post" | "task" | null>(null);
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);

  const defaultClientId = clientId ?? INTERNAL_CLIENT;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
          <ListTodo size={14} />
          Tarefas de produção
        </h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhuma tarefa vinculada.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => setEditingTask(task)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-hover"
                >
                  <span
                    className={cn(
                      "text-text-primary",
                      task.status === "CONCLUIDO" && "text-text-secondary line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
                    {productionStatusLabels[task.status]}
                    {task.dueDate && <span>{formatDateBR(new Date(task.dueDate))}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
          <FileText size={14} />
          Posts
        </h3>
        {posts.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhum post vinculado.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {posts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  onClick={() => setEditingPost(post)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-hover"
                >
                  <span className="text-text-primary">{post.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
                    {contentStatusLabels[post.status]}
                    {post.publishDate && (
                      <span>{formatDateBR(new Date(post.publishDate))}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setCreating("task")}>
          <Plus size={14} />
          Nova tarefa
        </Button>
        <Button type="button" variant="secondary" onClick={() => setCreating("post")}>
          <Plus size={14} />
          Novo post
        </Button>
      </div>

      {creating === "post" && (
        <ContentPostModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={defaultClientId}
          defaultProjectId={projectId}
          onClose={() => setCreating(null)}
        />
      )}
      {creating === "task" && (
        <ProductionTaskModal
          businessId={businessId}
          clients={clients}
          projects={projectOptions}
          defaultClientId={defaultClientId}
          defaultProjectId={projectId}
          onClose={() => setCreating(null)}
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
