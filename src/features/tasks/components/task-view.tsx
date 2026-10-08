"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Circle,
  Clock,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/constants";
import { formatDateTime, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteTask,
  setTaskStatus,
} from "@/features/tasks/actions";
import {
  TaskFormDialog,
  type TaskItem,
} from "@/features/tasks/components/task-form-dialog";

interface Props {
  tasks: TaskItem[];
  subjects: { id: string; name: string }[];
}

type StatusFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";
type SortKey = "deadline" | "created" | "priority";

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function TaskView({ tasks, subjects }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskItem | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState("ALL");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("deadline");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const subjectName = (id: string | null) =>
    subjects.find((s) => s.id === id)?.name ?? null;

  const filtered = React.useMemo(() => {
    return tasks
      .filter((t) => (statusFilter === "ALL" ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === "ALL" ? true : t.priority === priorityFilter))
      .filter((t) =>
        search.trim()
          ? t.title.toLowerCase().includes(search.trim().toLowerCase())
          : true
      )
      .sort((a, b) => {
        if (sort === "priority") {
          return (
            (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
          );
        }
        if (sort === "created") return 0;
        const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aTime - bTime;
      });
  }, [tasks, statusFilter, priorityFilter, search, sort]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(task: TaskItem) {
    setEditing(task);
    setOpen(true);
  }

  async function toggle(task: TaskItem) {
    setPendingId(task.id);
    const next = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    const result = await setTaskStatus(task.id, next);
    setPendingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (next === "COMPLETED") toast.success("Bajarildi deb belgilandi");
    router.refresh();
  }

  const isOverdue = (task: TaskItem) =>
    task.deadline &&
    task.status !== "COMPLETED" &&
    new Date(task.deadline).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Todo"
        description="Shaxsiy vazifalaringizni kuzatib boring."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Vazifa qo'shish
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Barcha holat</SelectItem>
            <SelectItem value="PENDING">Kutilmoqda</SelectItem>
            <SelectItem value="IN_PROGRESS">Jarayonda</SelectItem>
            <SelectItem value="COMPLETED">Bajarildi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Muhimlik</SelectItem>
            <SelectItem value="HIGH">Yuqori</SelectItem>
            <SelectItem value="MEDIUM">O'rta</SelectItem>
            <SelectItem value="LOW">Past</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="priority">Muhimlik</SelectItem>
            <SelectItem value="created">Yangi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Vazifalar yo'q"
          description="Yangi vazifa qo'shib boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Vazifa qo'shish
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const done = task.status === "COMPLETED";
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30",
                  done && "opacity-60"
                )}
              >
                <button
                  onClick={() => toggle(task)}
                  disabled={pendingId === task.id}
                  className="-ml-1.5 mt-0.5 shrink-0 rounded-full p-2"
                  aria-label="Holatni almashtirish"
                >
                  {pendingId === task.id ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : done ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "font-medium",
                        done && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </p>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        PRIORITY_STYLES[task.priority as keyof typeof PRIORITY_STYLES]
                      )}
                    >
                      {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        STATUS_STYLES[task.status as keyof typeof STATUS_STYLES]
                      )}
                    >
                      {STATUS_LABELS[task.status as keyof typeof STATUS_LABELS]}
                    </span>
                    {overdue && <Badge variant="destructive">Kechikkan</Badge>}
                  </div>

                  {task.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {subjectName(task.subjectId) && (
                      <span>{subjectName(task.subjectId)}</span>
                    )}
                    {task.category && <span>{task.category}</span>}
                    {task.deadline && (
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          overdue && "text-destructive"
                        )}
                      >
                        <Clock className="size-3" />
                        {relativeDay(task.deadline)} · {formatDateTime(task.deadline)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(task)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDialog
                    title="Vazifani o'chirish"
                    description={`"${task.title}" o'chiriladi.`}
                    onConfirm={async () => {
                      const result = await deleteTask(task.id);
                      if (!result.success) toast.error(result.error);
                      else {
                        toast.success("O'chirildi");
                        router.refresh();
                      }
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskFormDialog
        open={open}
        onOpenChange={setOpen}
        subjects={subjects}
        initial={editing}
      />
    </div>
  );
}
