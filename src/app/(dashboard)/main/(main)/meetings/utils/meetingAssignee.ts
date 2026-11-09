import type { MeetingTask } from "../MeetingsClient";

/** اسم مكلَّف المهمة كيفما كان مصدره: موظفٌ أو اسمٌ كُتب يدوياً. */
export function meetingAssigneeName(task: Pick<MeetingTask, "assignedTo" | "assignedToName">): string | null {
  return task.assignedTo?.name ?? task.assignedToName ?? null;
}
