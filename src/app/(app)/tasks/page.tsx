import type { Metadata } from "next";

import { getTasks } from "@/features/tasks/queries";
import { getSubjects } from "@/features/schedule/queries";
import { TaskView } from "@/features/tasks/components/task-view";

export const metadata: Metadata = { title: "Todo" };

export default async function TasksPage() {
  const [tasks, subjects] = await Promise.all([getTasks(), getSubjects()]);

  return (
    <TaskView
      tasks={tasks}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
