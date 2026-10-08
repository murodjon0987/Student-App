"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate, relativeDay } from "@/lib/format";
import { cn, percentage } from "@/lib/utils";
import {
  addGoalTask,
  deleteGoal,
  deleteGoalTask,
  toggleGoalTask,
} from "@/features/goals/actions";
import {
  GoalFormDialog,
  type GoalItem,
} from "@/features/goals/components/goal-form-dialog";

export interface GoalTaskItem {
  id: string;
  title: string;
  done: boolean;
  order: number;
}

export interface GoalWithTasks extends GoalItem {
  createdAt: Date | string;
  tasks: GoalTaskItem[];
}

interface Props {
  goals: GoalWithTasks[];
}

function GoalCard({
  goal,
  onEdit,
}: {
  goal: GoalWithTasks;
  onEdit: (goal: GoalItem) => void;
}) {
  const router = useRouter();
  const [newTask, setNewTask] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);

  const doneCount = goal.tasks.filter((task) => task.done).length;
  const progress = percentage(doneCount, goal.tasks.length);

  async function toggle(task: GoalTaskItem, value: boolean) {
    setPending(task.id);
    const result = await toggleGoalTask(task.id, value);
    setPending(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function removeTask(task: GoalTaskItem) {
    setPending(task.id);
    const result = await deleteGoalTask(task.id);
    setPending(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    setAdding(true);
    const result = await addGoalTask(goal.id, title);
    setAdding(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setNewTask("");
    router.refresh();
  }

  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0" style={{ color: goal.color }}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: goal.color }}
            />
            <CardTitle className="truncate text-foreground">
              {goal.title}
            </CardTitle>
          </div>
          {goal.description && (
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              {goal.description}
            </p>
          )}
          {goal.targetDate && (
            <p className="mt-1 flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Calendar className="size-3.5" />
              {relativeDay(goal.targetDate)} · {formatDate(goal.targetDate)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(goal)}>
            <Pencil className="size-4" />
          </Button>
          <ConfirmDialog
            title="Maqsadni o'chirish"
            description={`"${goal.title}" va uning barcha vazifalari o'chiriladi.`}
            onConfirm={async () => {
              const result = await deleteGoal(goal.id);
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
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {doneCount}/{goal.tasks.length} bajarildi
            </span>
            <span className="font-medium tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="space-y-1.5">
          {goal.tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
            >
              <Checkbox
                checked={task.done}
                disabled={pending === task.id}
                className="size-5"
                onCheckedChange={(value) => toggle(task, value === true)}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  task.done && "text-muted-foreground line-through"
                )}
              >
                {task.title}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                disabled={pending === task.id}
                onClick={() => removeTask(task)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}

          {goal.tasks.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Hali vazifalar qo'shilmagan
            </p>
          )}
        </div>

        <form onSubmit={addTask} className="flex items-center gap-2">
          <Input
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="Yangi kichik vazifa..."
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            variant="outline"
            className="shrink-0"
            disabled={adding || !newTask.trim()}
          >
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Qo'shish
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function GoalsView({ goals }: Props) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GoalItem | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(goal: GoalItem) {
    setEditing(goal);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maqsadlar"
        description="Maqsadlaringizni belgilang va qadamlar bo'yicha kuzatib boring."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Maqsad qo'shish
        </Button>
      </PageHeader>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Maqsadlar yo'q"
          description="Birinchi maqsadingizni qo'shib, rejalashtirishni boshlang."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Maqsad qo'shish
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={openEdit} />
          ))}
        </div>
      )}

      <GoalFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
      />
    </div>
  );
}
