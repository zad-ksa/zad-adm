"use client";

import {
  Paperclip,
  Download,
  Calendar,
  CalendarCheck,
  Building2,
  Palette,
  CalendarPlus,
  FileCheck2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
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
  /** When it was actually finalised — charity sign-off or the 24h auto-approval. */
  completedAt?: string | null;
  /** When it was rejected. */
  rejectedAt?: string | null;
  /** Finalised by the deadline passing rather than by the charity acting. */
  autoApproved?: boolean;
  /**
   * Whether this request went through the charity review cycle at all.
   *
   * Requests completed before that cycle existed were finished by Zad
   * directly, and nothing records who signed them off — so they show the
   * date alone rather than claiming an approval that never happened.
   */
  wasReviewed?: boolean;
  status?: string;
  /** Staff view only. */
  charityName?: string;
  /** Chosen design types, for display. */
  types?: { id: string; name: string }[];
  /** Business days promised: the types' total plus anything staff added. */
  totalWorkingDays?: number;
  addedDays?: number;
  /** Why the deadline moved. Shown to the charity, newest last. */
  extensions?: { id: string; days: number; reason: string; createdAt: string }[];
  attachments: { id: string; fileUrl: string; fileName: string; fileSize: number | null }[];
  /** Finished files from Zad, attached on delivery. Kept after completion. */
  deliverables?: { id: string; fileUrl: string; fileName: string; fileSize: number | null }[];
};

export default function DesignRequestCard({
  request,
  progress,
  actions,
  footer,
}: {
  request: DesignRequestCardData;
  progress: DesignRequestProgress;
  actions?: ReactNode;
  /**
   * Rendered below the status actions and separated from them.
   *
   * For things that apply whatever state the request is in — deleting it,
   * today — so they do not have to be repeated inside every status branch,
   * which is how the delete button ended up available on one tab only.
   */
  footer?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  // A rough threshold rather than measuring the rendered box: the clamp is two
  // lines, and anything under this reliably fits in them at every card width.
  const isLongDescription = (request.description?.length ?? 0) > 110;

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
            <div>
              <p
                className={`text-slate-500 dark:text-slate-400 whitespace-pre-line ${
                  expanded ? "" : "line-clamp-2"
                }`}
                style={{ fontSize: "var(--dr-fs-body)" }}
              >
                {request.description}
              </p>
              {/* Only offered when the text is actually long enough to be cut.
                  A "show more" that reveals nothing is worse than none. */}
              {isLongDescription && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 font-bold text-primary dark:text-teal-300 hover:underline"
                  style={{ fontSize: "var(--dr-fs-eyebrow)" }}
                >
                  {expanded ? "عرض أقل" : "عرض المزيد"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <DesignRequestCountdownBadge progress={progress} />
        </div>
      </div>

      {request.types && request.types.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Palette className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
          {request.types.map((t) => (
            <span
              key={t.id}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              style={{ fontSize: "var(--dr-fs-eyebrow)" }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {request.extensions && request.extensions.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-500/[0.07] px-3 py-2.5 space-y-2">
          <p
            className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400"
            style={{ fontSize: "var(--dr-fs-eyebrow)" }}
          >
            <CalendarPlus className="w-3 h-3 shrink-0" />
            تم تمديد موعد التسليم
          </p>
          {request.extensions.map((ext) => (
            <div key={ext.id} className="flex items-start gap-2">
              <span
                className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold tabular-nums"
                style={{ fontSize: "var(--dr-fs-eyebrow)" }}
              >
                +{ext.days}
              </span>
              <span
                className="text-slate-600 dark:text-slate-300 whitespace-pre-line"
                style={{ fontSize: "var(--dr-fs-eyebrow)" }}
              >
                {ext.reason}
                <span className="text-slate-400 dark:text-slate-500"> — {ext.createdAt}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-6 flex flex-col gap-4">
        <div
          className="flex flex-col gap-2 text-slate-500 dark:text-slate-400"
          style={{ fontSize: "var(--dr-fs-meta)" }}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>الرفع:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{request.submittedAt}</span>
          </span>
          {request.status === "COMPLETED" ? (
            <span className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-emerald-700 dark:text-emerald-400">تاريخ الإنجاز:</span>{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {request.completedAt ?? "—"}
              </span>
              {request.wasReviewed && (
                <span className="text-slate-400 dark:text-slate-500">
                  ({request.autoApproved ? "اعتماد تلقائي — لم تردّ الجمعية" : "باعتماد الجمعية"})
                </span>
              )}
            </span>
          ) : request.status === "REJECTED" ? (
            <span className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-rose-600 dark:text-rose-400">تاريخ الرفض:</span>{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {request.rejectedAt ?? "—"}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-primary dark:text-teal-400 shrink-0" />
              <span className="text-primary dark:text-teal-400">وقت التسليم:</span>{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{request.expectedCompletionDate}</span>
              {typeof request.totalWorkingDays === "number" && (
                <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                  ({request.totalWorkingDays} يوم عمل
                  {request.addedDays ? ` منها ${request.addedDays} مضافة` : ""})
                </span>
              )}
            </span>
          )}
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

        {/* The delivered files, set apart from the brief: after completion this
            is the only attachment block left, and it is what the charity came
            back for. */}
        {request.deliverables && request.deliverables.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
            <p
              className="flex items-center gap-1.5 font-bold text-primary dark:text-teal-300"
              style={{ fontSize: "var(--dr-fs-eyebrow)" }}
            >
              <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
              الملفات النهائية
            </p>
            <div className="flex flex-wrap gap-2">
              {request.deliverables.map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/[0.05] dark:bg-primary/10 hover:bg-primary/[0.1] transition-colors"
                  style={{ fontSize: "var(--dr-fs-meta)" }}
                >
                  <Download className="w-3.5 h-3.5 text-primary dark:text-teal-300 shrink-0" />
                  <span className="font-bold text-primary dark:text-teal-300 truncate max-w-[140px]">
                    {att.fileName}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {actions && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
            {actions}
          </div>
        )}

        {footer && <div className={actions ? "" : "pt-4 border-t border-slate-100 dark:border-slate-800/60"}>{footer}</div>}
      </div>
    </div>
  );
}
