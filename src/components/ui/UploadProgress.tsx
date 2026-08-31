"use client";

import { Loader2, CheckCircle2 } from "lucide-react";
import type { UploadProgress as Progress } from "@/lib/clientUpload";

/**
 * Progress for an in-flight upload batch.
 *
 * Files go straight from the browser to Cloudinary now, which means a large one
 * takes as long as the user's uplink takes — with no server round trip to blame
 * and, until this existed, nothing on screen while it happened. A spinner alone
 * cannot distinguish "uploading a 40MB file" from "stuck".
 *
 * `percent` is null until the browser reports the first chunk, so the bar starts
 * indeterminate rather than claiming 0% — which reads as "nothing is happening".
 */
export default function UploadProgress({
  progress,
  done = false,
}: {
  progress: Progress | null;
  /** Show the completed state briefly after the last file lands. */
  done?: boolean;
}) {
  if (!progress && !done) return null;

  if (done) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400 font-bold"
        style={{ fontSize: "var(--dr-fs-meta, 0.75rem)" }}
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        اكتمل الرفع
      </div>
    );
  }

  const p = progress!;
  const pct = p.percent;

  return (
    <div
      className="px-3 py-2 rounded-lg bg-primary/[0.06] dark:bg-primary/10"
      style={{ fontSize: "var(--dr-fs-meta, 0.75rem)" }}
    >
      <div className="flex items-center gap-2 text-primary dark:text-teal-300 font-bold mb-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span className="flex-1 truncate">
          {p.total > 1 ? `جارٍ رفع ${p.index} من ${p.total}: ${p.fileName}` : `جارٍ رفع ${p.fileName}`}
        </span>
        {pct !== null && <span className="shrink-0 tabular-nums">{pct}%</span>}
      </div>

      <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
        <div
          className={`h-full rounded-full bg-primary dark:bg-teal-400 transition-[width] duration-200 ${
            pct === null ? "animate-pulse" : ""
          }`}
          // Indeterminate reads as a third of the bar pulsing; a real percentage
          // fills it honestly.
          style={{ width: pct === null ? "33%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}
