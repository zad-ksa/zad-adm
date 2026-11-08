"use client";

import { X } from "lucide-react";
import Select from "@/components/console/Select";
import type { Employee } from "../MeetingsClient";

const MANUAL = "__manual__";

export type AssigneeValue = { assignedToId: string | null; assignedToName: string | null };

/**
 * اختيار مكلَّف المهمة: موظفٌ من القائمة، أو اسمٌ يُكتب يدوياً.
 *
 * والاسم اليدوي نصٌّ في المهمة وحدها: لا يُضاف للموظفين ولا يظهر في قائمة
 * مهمةٍ أخرى. و`assignedToName !== null` هو ما يعني «وضع الكتابة»، ولو كان
 * النصّ فارغاً بعد.
 */
export default function MeetingAssigneePicker({
  value,
  onChange,
  employees,
  roleLabels,
}: {
  value: AssigneeValue;
  onChange: (next: AssigneeValue) => void;
  employees: Employee[];
  roleLabels: Record<string, string>;
}) {
  if (value.assignedToName !== null) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <input
          autoFocus={value.assignedToName === ""}
          value={value.assignedToName}
          onChange={(e) => onChange({ assignedToId: null, assignedToName: e.target.value })}
          maxLength={120}
          placeholder="اكتب اسم المكلف"
          aria-label="اسم المكلف"
          className="min-w-0 flex-1 text-caption border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={() => onChange({ assignedToId: null, assignedToName: null })}
          title="العودة إلى قائمة الموظفين"
          aria-label="العودة إلى قائمة الموظفين"
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Select
      variant="soft"
      value={value.assignedToId || ""}
      onSelect={(v) =>
        onChange(v === MANUAL ? { assignedToId: null, assignedToName: "" } : { assignedToId: v || null, assignedToName: null })
      }
      placeholder="— المكلف —"
      options={[
        { value: "", label: "— بلا مكلَّف —" },
        { value: MANUAL, label: "＋ كتابة اسم يدوياً" },
        ...employees.map((e) => ({ value: e.id, label: e.name, hint: roleLabels[e.role] || e.role })),
      ]}
      className="flex-1 [&>button]:w-full [&>button]:justify-between"
    />
  );
}
