"use client";

import { Paperclip, Download, Calendar, CalendarCheck, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import type { DesignRequestProgress } from "@/lib/designRequestProgress";
import DesignRequestCountdownBadge from "./DesignRequestCountdownBadge";

export type DesignRequestCardData = {
  id: string;
  title: string;
  description: string | null;
  /** Pre-formatted on the server (Intl + civil-date anchoring) — never format dates in this component. */
  submittedAt: string;
  scheduledStartDate: string;
  expectedCompletionDate: string;
  /** Staff view only. */
  charityName?: string;
  attachments: { id: string; fileUrl: string; fileName: string; fileSize: number | null }[];
};

export default function DesignRequestCard({
  request,
  progress,
  actions,
}: {
  request: DesignRequestCardData;
  progress: DesignRequestProgress;
  actions?: ReactNode;
}) {
  return (
    <div className="design-requests-ui group flex flex-col h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0A0A] p-5 shadow-sm hover:shadow-md dark:shadow-none hover:border-primary/40 dark:hover:border-teal-500/40 transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {request.charityName && (
            <div
              className="flex items-center gap-1.5 text-primary dark:text-teal-300 font-bold"
              style={{ fontSize: "var(--dr-fs-eyebrow)" }}
            >
              <Building2 className="w-3 h-3" />
              <span>{request.charityName}</span>
            </div>
          )}
          <h3
            className="font-bold text-slate-900 dark:text-slate-100 truncate"
            style={{ fontSize: "var(--dr-fs-title)" }}
          >
            {request.title}
          </h3>
          {request.description && (
            <p
              className="text-slate-500 dark:text-slate-400 line-clamp-2"
              style={{ fontSize: "var(--dr-fs-body)" }}
            >
              {request.description}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <DesignRequestCountdownBadge progress={progress} />
        </div>
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-4">
        <div
          className="flex flex-col gap-2 text-slate-500 dark:text-slate-400"
          style={{ fontSize: "var(--dr-fs-meta)" }}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>الرفع:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{request.submittedAt}</span>
          </span>
          <span className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary dark:text-teal-400 shrink-0" />
            <span className="text-primary dark:text-teal-400">التسليم المتوقع:</span>{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">{request.expectedCompletionDate}</span>
          </span>
        </div>

        {request.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            {request.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] hover:border-primary/30 hover:bg-primary/[0.04] dark:hover:bg-primary/10 transition-colors"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                  {att.fileName}
                </span>
              </a>
            ))}
          </div>
        )}

        {actions && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
