"use client";

import { useState, useTransition } from "react";
import { toggleReadinessVisibility, togglePerformanceEditability, toggleVisionMissionVisibility } from "@/app/actions/strategy";

export default function StrategyPermissionToggle({
  charityName,
  type,
  initialState,
  label,
  description
}: {
  charityName: string;
  type: "readiness" | "performance" | "vision-mission";
  initialState: boolean;
  label: string;
  description?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initialState);

  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    
    startTransition(async () => {
      try {
        if (type === "readiness") {
          await toggleReadinessVisibility(charityName, newState);
        } else if (type === "performance") {
          await togglePerformanceEditability(charityName, newState);
        } else {
          await toggleVisionMissionVisibility(charityName, newState);
        }
      } catch (error) {
        // Revert on error
        setEnabled(!newState);
        console.error("Failed to toggle permission", error);
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm mb-6 transition-colors">
      <div>
        <h4 className="font-bold text-slate-800 dark:text-slate-200">{label}</h4>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={isPending}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50
          ${enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}
        `}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
            ${enabled ? "-translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
