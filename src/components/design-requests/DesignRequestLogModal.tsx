"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getDesignRequestLog } from "@/app/actions/designRequests";
import LinkifiedText from "@/components/ui/LinkifiedText";
import { DESIGN_EVENT_LABEL, type DesignEventKind } from "@/lib/designEventLabels";
import { Dialog } from "@/components/console/Dialog";

/**
 * Everything that has happened to one design request, oldest first.
 *
 * The same component on both sides. The charity is shown the same history as
 * Zad — it is their design, and "who moved my delivery date" should not require
 * a phone call to answer.
 *
 * Fetched when opened rather than shipped with every card: most cards are never
 * asked about, and a log grows for the life of the request.
 */

type LogEvent = {
  id: string;
  kind: DesignEventKind;
  actorType: "EMPLOYEE" | "CHARITY_USER" | "SYSTEM" | null;
  actorName: string | null;
  note: string | null;
  createdAt: string | Date;
};

/** The colour carries the meaning, so the timeline is readable at a glance. */
const TONE: Record<DesignEventKind, string> = {
  CREATED: "bg-slate-400",
  APPROVED: "bg-primary",
  REJECTED: "bg-rose-500",
  RESUBMITTED: "bg-slate-400",
  EDITED: "bg-slate-400",
  RESCHEDULED: "bg-amber-500",
  QUEUE_REORDERED: "bg-amber-500",
  EXTENDED: "bg-amber-500",
  STARTED: "bg-indigo-500",
  DELIVERED: "bg-primary",
  REVISION_REQUESTED: "bg-amber-500",
  CHARITY_APPROVED: "bg-emerald-500",
  AUTO_APPROVED: "bg-emerald-500",
  COMPLETED: "bg-emerald-500",
  // Returned still open: amber, like the charity's own revision request.
  // Closed with notes: rose, because the request ended without the change.
  REVISION_RETURNED: "bg-amber-500",
  CLOSED_WITH_NOTES: "bg-rose-500",
};

const ACTOR_LABEL: Record<string, string> = {
  EMPLOYEE: "فريق زاد",
  CHARITY_USER: "الجمعية",
  SYSTEM: "النظام",
};

export default function DesignRequestLogModal({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<LogEvent[] | null>(null);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getDesignRequestLog(requestId);
        if (!alive) return;
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        if ("success" in res) {
          setTitle(res.title);
          setEvents(res.events as LogEvent[]);
        }
      } catch (err: any) {
        if (alive) setError(err?.message || "تعذّر تحميل السجل");
      }
    })();
    // The modal can be closed while the request is still in flight; setting
    // state afterwards would be a write into a component that is gone.
    return () => {
      alive = false;
    };
  }, [requestId]);

  const when = (value: string | Date) =>
    new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(value));

  return (
    <Dialog
scopeClassName="design-requests-ui"
title="سجل الطلب"
description={<>{title}</>}
onClose={onClose}
closeOnBackdrop={false}
>
<div className="p-5 overflow-y-auto">
          {error ? (
            <div className="flex items-start gap-2 rounded-xl bg-rose-500/[0.07] text-rose-600 dark:text-rose-400 p-3 text-[12px] font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : events === null ? (
            <div className="py-10 grid place-items-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-slate-400 dark:text-slate-500">
              لا توجد أحداث مسجّلة لهذا الطلب.
            </p>
          ) : (
            <ol className="relative space-y-4 pr-4 border-r border-slate-200 dark:border-slate-800">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -right-[21px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                      TONE[e.kind] ?? "bg-slate-400"
                    }`}
                  />
                  <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    {DESIGN_EVENT_LABEL[e.kind] ?? e.kind}
                  </p>
                  {e.note && (
                    <p className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed break-words whitespace-pre-line">
                      <LinkifiedText text={e.note} />
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {when(e.createdAt)}
                    {e.actorName ? ` · بواسطة ${e.actorName}` : ""}
                    {e.actorType && ACTOR_LABEL[e.actorType] ? ` (${ACTOR_LABEL[e.actorType]})` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
</Dialog>
  );
}
