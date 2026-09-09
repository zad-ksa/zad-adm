"use client";

import { Lock, Unlock } from "lucide-react";
import { setZadAttendanceOpen } from "@/app/actions/zadAttendance";
import { BTN, CARD, Feedback, GHOST, useSettingsAction } from "./shared";

/**
 * The master switch, kept on the hub rather than behind a card of its own.
 *
 * It is one toggle, and it is the one thing you come here to check: whether
 * the system is counting anybody's day right now. A click to reach that answer
 * would be a click too many.
 */
export default function GateCard({ isOpen, siteCount }: { isOpen: boolean; siteCount: number }) {
  const { busy, error, notice, run } = useSettingsAction();

  return (
    <div dir="rtl">
      <Feedback error={error} notice={notice} />

      <div className={CARD}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[14px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {isOpen ? (
                <Unlock className="w-4 h-4 text-emerald-500" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400" />
              )}
              {isOpen ? "التحضير مفعّل" : "التحضير غير مفعّل"}
            </p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
              {isOpen
                ? "الموظفون يسجّلون حضورهم وانصرافهم الآن."
                : "لا يُسجَّل حضور ولا غياب حتى تفعّله."}
            </p>
            {siteCount === 0 && (
              <p className="mt-2 text-[12px] font-bold text-amber-600 dark:text-amber-400 leading-relaxed max-w-lg">
                لا يوجد موقع عمل واحد بعد. التفعيل الآن يرفض كل محاولة تحضير ويسجّل الأيام غياباً —
                أضف موقعاً أولاً.
              </p>
            )}
          </div>
          <button
            className={isOpen ? GHOST : BTN}
            disabled={busy}
            onClick={() =>
              run(() => setZadAttendanceOpen(!isOpen), isOpen ? "أُوقف التحضير" : "فُعّل التحضير")
            }
          >
            {isOpen ? "إيقاف" : "تفعيل"}
          </button>
        </div>
      </div>
    </div>
  );
}
