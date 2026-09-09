"use client";

import { useState } from "react";
import {
  Check,
  Globe,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TriangleAlert,
  Wifi,
  X,
} from "lucide-react";
import { saveZadIpPolicy, readNetworkOrigin } from "@/app/actions/zadAttendance";
import { isValidIpRangeEntry, isIpAllowed } from "@/lib/geo";
import { BTN, CARD, Feedback, GHOST, INPUT, useSettingsAction } from "../shared";

type Mode = "OFF" | "WARN" | "BLOCK";

const MODES: {
  id: Mode;
  label: string;
  body: string;
  icon: typeof ShieldOff;
  tone: string;
  ring: string;
}[] = [
  {
    id: "OFF",
    label: "معطّلة",
    body: "لا يُنظر إلى الشبكة إطلاقاً. الموقع الجغرافي وحده يحكم.",
    icon: ShieldOff,
    tone: "text-slate-500 dark:text-slate-400",
    ring: "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60",
  },
  {
    id: "WARN",
    label: "تنبيه فقط",
    body: "التحضير من خارج الشبكة يُقبل ويُعلَّم للمراجعة البشرية.",
    icon: ShieldAlert,
    tone: "text-amber-600 dark:text-amber-400",
    ring: "border-amber-400 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-500/10",
  },
  {
    id: "BLOCK",
    label: "منع",
    body: "يُرفض أي تحضير من خارج الشبكة، مهما كان الموقع الجغرافي.",
    icon: ShieldCheck,
    tone: "text-rose-600 dark:text-rose-400",
    ring: "border-rose-400 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/10",
  },
];

export default function NetworkClient({
  ipRanges,
  ipMode,
}: {
  ipRanges: string[];
  ipMode: string;
}) {
  const { busy, error, notice, run } = useSettingsAction();

  const [ranges, setRanges] = useState<string[]>(ipRanges);
  const [mode, setMode] = useState<Mode>((ipMode as Mode) ?? "OFF");
  const [entry, setEntry] = useState("");

  const [reading, setReading] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const dirty =
    mode !== ipMode ||
    ranges.length !== ipRanges.length ||
    ranges.some((r, i) => r !== ipRanges[i]);

  const entryValid = entry.trim() !== "" && isValidIpRangeEntry(entry);
  const duplicate = ranges.includes(entry.trim());

  const add = (value: string) => {
    const v = value.trim();
    if (!v || ranges.includes(v)) return;
    setRanges([...ranges, v]);
    setEntry("");
  };

  const read = async () => {
    setReading(true);
    setReadError(null);
    try {
      const res = await readNetworkOrigin();
      if (!res.success) {
        setReadError(res.error ?? "تعذّرت القراءة");
        return;
      }
      setOrigin(res.ip);
    } finally {
      setReading(false);
    }
  };

  // The lockout that this screen exists to prevent: BLOCK with a list your own
  // network is not in means nobody can check in tomorrow, including you.
  const originCovered = origin ? isIpAllowed(origin, ranges) : null;
  const lockout = mode === "BLOCK" && ranges.length > 0 && origin !== null && !originCovered;
  const blockWithoutList = mode === "BLOCK" && ranges.length === 0;

  return (
    <div className="space-y-4" dir="rtl">
      <Feedback error={error} notice={notice} />

      {/* ── قراءة الشبكة ──────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" /> الشبكة المتصل بها الآن
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
              نفّذ القراءة وأنت متصل بشبكة المكتب. العنوان يُقرأ من الخادم نفسه — وهو العنوان
              ذاته الذي سيُقارَن عند كل تحضير، لا ما تقوله خدمة خارجية.
            </p>
          </div>
          <button className={GHOST} disabled={reading} onClick={read}>
            {reading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}
            اقرأ العنوان
          </button>
        </div>

        {readError && (
          <p className="mt-3 text-[12px] font-bold text-rose-600 dark:text-rose-400">{readError}</p>
        )}

        {origin && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p
                className="text-[15px] font-black text-slate-900 dark:text-slate-100 tabular-nums truncate"
                dir="ltr"
              >
                {origin}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {ranges.length === 0
                  ? "لا توجد قائمة بعد — كل العناوين مقبولة حالياً."
                  : originCovered
                    ? "هذا العنوان مشمول بالقائمة أدناه."
                    : "هذا العنوان غير مشمول بالقائمة أدناه."}
              </p>
            </div>
            {!ranges.includes(origin) && (
              <button className={BTN} onClick={() => add(origin)}>
                <Plus className="w-3.5 h-3.5" /> أضفه إلى القائمة
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── القائمة ───────────────────────────────────────────────────── */}
      <div className={CARD}>
        <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-3">
          العناوين المسموح بها
          <span className="mr-2 text-[11px] font-normal text-slate-400 tabular-nums">
            {ranges.length}
          </span>
        </p>

        {ranges.length === 0 ? (
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-3">
            القائمة فارغة — الطبقة معطّلة فعلياً مهما كان النمط المختار.
          </p>
        ) : (
          <ul className="space-y-1.5 mb-3">
            {ranges.map((r) => {
              const covers = origin ? isIpAllowed(origin, [r]) : false;
              return (
                <li
                  key={r}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="text-[12px] font-bold text-slate-700 dark:text-slate-200 tabular-nums truncate"
                      dir="ltr"
                    >
                      {r}
                    </span>
                    {r.includes("/") && (
                      <span className="text-[10px] text-slate-400 shrink-0">نطاق</span>
                    )}
                    {covers && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        يشمل عنوانك
                      </span>
                    )}
                  </span>
                  <button
                    className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                    title="إزالة"
                    onClick={() => setRanges(ranges.filter((x) => x !== r))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <input
            className={INPUT}
            dir="ltr"
            placeholder="212.118.5.10  أو  212.118.5.0/24"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && entryValid && !duplicate) add(entry);
            }}
          />
          <button
            className={BTN}
            disabled={!entryValid || duplicate}
            onClick={() => add(entry)}
          >
            <Plus className="w-3.5 h-3.5" /> إضافة
          </button>
        </div>
        {entry.trim() !== "" && !entryValid && (
          <p className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            صيغة غير صالحة. اكتب عنواناً كاملاً أو نطاقاً بصيغة CIDR.
          </p>
        )}
        {duplicate && (
          <p className="mt-1.5 text-[11px] text-slate-400">هذا العنوان موجود في القائمة.</p>
        )}
      </div>

      {/* ── النمط ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-3">
          ماذا يحدث لمن يحضر من خارج الشبكة؟
        </p>

        <div className="grid sm:grid-cols-3 gap-2">
          {MODES.map((m) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`text-right rounded-xl border p-3.5 transition-colors ${
                  on
                    ? m.ring
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <p
                  className={`text-[13px] font-black flex items-center gap-1.5 ${
                    on ? m.tone : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                  {on && <Check className="w-3.5 h-3.5 mr-auto" />}
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {m.body}
                </p>
              </button>
            );
          })}
        </div>

        {blockWithoutList && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-3 text-[12px] leading-relaxed">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              «منع» بقائمة فارغة لا يمنع شيئاً — الطبقة تُعطَّل تلقائياً حين لا يوجد عنوان واحد.
              أضف عنوان شبكة المكتب أولاً.
            </span>
          </div>
        )}

        {lockout && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-4 py-3 text-[12px] leading-relaxed font-bold">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              عنوانك الحالي <span dir="ltr">{origin}</span> ليس ضمن القائمة. الحفظ بنمط «منع» سيرفض
              التحضير من هذه الشبكة — بما فيها أنت. أضف عنوانك أو اختر «تنبيه فقط».
            </span>
          </div>
        )}
      </div>

      {/* ── الحفظ ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          className={BTN}
          disabled={busy || !dirty}
          onClick={() =>
            run(() => saveZadIpPolicy({ ranges, mode }), "حُفظت السياسة")
          }
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <Check className="w-3.5 h-3.5" /> حفظ السياسة
        </button>
        {dirty && (
          <button
            className={GHOST}
            disabled={busy}
            onClick={() => {
              setRanges(ipRanges);
              setMode((ipMode as Mode) ?? "OFF");
            }}
          >
            <X className="w-3.5 h-3.5" /> تراجع
          </button>
        )}
        {!dirty && <span className="text-[11px] text-slate-400">لا تغييرات غير محفوظة.</span>}
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        هذه طبقة ثانية فوق الموقع الجغرافي، وليست بديلاً عنه. لا تفعّلها إلا إذا كان لمكتبك عنوان
        IP ثابت — العنوان المتغيّر يجعلها ترفض موظفين حاضرين فعلاً. ومن سُمح له بالعمل عن بُعد لا
        تسري عليه هذه الطبقة أصلاً.
      </p>
    </div>
  );
}
