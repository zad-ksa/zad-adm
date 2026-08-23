"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import {
  deleteWorkSite,
  saveIpPolicy,
  saveWorkSchedule,
  saveWorkSite,
} from "@/app/actions/attendance";
import { ScheduleShape, WEEKDAY_LABELS } from "@/lib/attendanceTime";
import {
  Banner,
  Chip,
  Field,
  HrCard,
  SectionHead,
  ctaClass,
  fs,
  ghostClass,
  inputClass,
} from "../ui";

type Site = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
};

const emptySite = { id: "", name: "", latitude: "", longitude: "", radiusMeters: "150" };

const IP_MODES = [
  { id: "OFF", label: "معطّل", hint: "الاعتماد على تحديد الموقع فقط" },
  { id: "WARN", label: "تنبيه فقط", hint: "يُسمح بالتسجيل خارج الشبكة مع تعليمه للمراجعة" },
  { id: "BLOCK", label: "منع", hint: "يُرفض التسجيل نهائياً من خارج شبكة الجمعية" },
];

export default function AttendanceSettingsClient({
  charityId,
  initialSites,
  initialSchedule,
  initialIpRanges,
  initialIpMode,
  currentIp,
}: {
  charityId: string;
  initialSites: Site[];
  initialSchedule: ScheduleShape;
  initialIpRanges: string[];
  initialIpMode: string;
  currentIp: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [siteForm, setSiteForm] = useState({ ...emptySite });
  const [isSiteFormOpen, setIsSiteFormOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const [schedule, setSchedule] = useState({
    startTime: initialSchedule.startTime,
    endTime: initialSchedule.endTime,
    lateAfterMinutes: String(initialSchedule.lateAfterMinutes),
    earlyLeaveBeforeMinutes: String(initialSchedule.earlyLeaveBeforeMinutes),
    workDays: initialSchedule.workDays,
  });

  const [ipRanges, setIpRanges] = useState<string[]>(initialIpRanges);
  const [ipMode, setIpMode] = useState(initialIpMode);
  const [ipDraft, setIpDraft] = useState("");

  function done(message: string) {
    setError(null);
    setNotice(message);
    startTransition(() => router.refresh());
  }

  /**
   * "Use my current location" replaces a map entirely: the admin stands in the
   * office and presses once. That is in fact more accurate than clicking a
   * rooftop on a map, and it avoids widening the CSP for a tile provider.
   */
  async function useCurrentLocation() {
    setError(null);
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          reject(new Error("متصفحك لا يدعم تحديد الموقع"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          resolve,
          () => reject(new Error("تعذّر تحديد موقعك. تأكد من السماح بإذن الموقع وتفعيل GPS")),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
      });
      setSiteForm((f) => ({
        ...f,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      }));
      setNotice(`تم تحديد الموقع بدقة ± ${Math.round(position.coords.accuracy)} متر`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحديد موقعك");
    } finally {
      setLocating(false);
    }
  }

  async function submitSite() {
    setError(null);
    setBusy("site");
    try {
      const res = await saveWorkSite(charityId, {
        id: siteForm.id || undefined,
        name: siteForm.name,
        latitude: Number(siteForm.latitude),
        longitude: Number(siteForm.longitude),
        radiusMeters: Number(siteForm.radiusMeters),
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSiteForm({ ...emptySite });
      setIsSiteFormOpen(false);
      done("تم حفظ موقع العمل");
    } finally {
      setBusy(null);
    }
  }

  async function removeSite(site: Site) {
    setError(null);
    setBusy(site.id);
    try {
      const res = await deleteWorkSite(charityId, site.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      done("تم تعطيل الموقع");
    } finally {
      setBusy(null);
    }
  }

  async function submitSchedule() {
    setError(null);
    setBusy("schedule");
    try {
      const res = await saveWorkSchedule(charityId, {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        lateAfterMinutes: Number(schedule.lateAfterMinutes),
        earlyLeaveBeforeMinutes: Number(schedule.earlyLeaveBeforeMinutes),
        workDays: schedule.workDays,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      done("تم حفظ أوقات الدوام");
    } finally {
      setBusy(null);
    }
  }

  async function submitIpPolicy() {
    setError(null);
    setBusy("ip");
    try {
      const res = await saveIpPolicy(charityId, { ranges: ipRanges, mode: ipMode });
      if (!res.success) {
        setError(res.error);
        return;
      }
      done("تم حفظ إعدادات الشبكة");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Banner tone="danger" icon={AlertTriangle}>
          {error}
        </Banner>
      )}
      {notice && !error && (
        <Banner tone="ok" icon={Check}>
          {notice}
        </Banner>
      )}

      {/* ── Bento: sites (7) beside schedule (5) ──────────────────────────── */}
      <section className="grid grid-cols-12 gap-4 hr-reveal">
        {/* Work sites */}
        <div className="col-span-12 lg:col-span-7">
          <HrCard className="h-full flex flex-col">
            <div className="p-6 pb-4">
              <SectionHead
                icon={MapPin}
                title="مواقع العمل"
                hint={initialSites.length > 0 ? `${initialSites.length} موقع` : "لم يُحدَّد أي موقع"}
                action={
                  !isSiteFormOpen ? (
                    <button
                      onClick={() => {
                        setSiteForm({ ...emptySite });
                        setIsSiteFormOpen(true);
                      }}
                      className={ghostClass}
                      style={fs.meta}
                    >
                      <Plus className="w-4 h-4" />
                      موقع جديد
                    </button>
                  ) : undefined
                }
              />
            </div>

            {initialSites.length === 0 && !isSiteFormOpen && (
              <p className="px-6 pb-8 text-slate-400" style={fs.body}>
                لن يتمكن الموظفون من التسجيل حتى يُحدَّد موقع واحد على الأقل.
              </p>
            )}

            {initialSites.length > 0 && (
              <ul className="flex-1">
                {initialSites.map((site) => (
                  <li
                    key={site.id}
                    className={`flex flex-wrap items-center gap-4 px-6 py-4
                                shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)]
                                transition-colors duration-300
                                hover:bg-primary/[0.02] dark:hover:bg-teal-400/[0.02]
                                ${site.isActive ? "" : "opacity-60"}`}
                  >
                    <div className="flex-1 min-w-[160px] space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-slate-800 dark:text-slate-100"
                          style={fs.h3}
                        >
                          {site.name}
                        </span>
                        {!site.isActive && <Chip>معطّل</Chip>}
                      </div>
                      <p
                        className="text-slate-400 dark:text-slate-500 font-mono tabular-nums"
                        style={fs.meta}
                        dir="ltr"
                      >
                        {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}
                        <span className="mx-2 opacity-60">·</span>
                        {site.radiusMeters}m
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSiteForm({
                            id: site.id,
                            name: site.name,
                            latitude: String(site.latitude),
                            longitude: String(site.longitude),
                            radiusMeters: String(site.radiusMeters),
                          });
                          setIsSiteFormOpen(true);
                        }}
                        className={ghostClass}
                        style={fs.meta}
                      >
                        تعديل
                      </button>
                      {site.isActive && (
                        <button
                          onClick={() => removeSite(site)}
                          disabled={busy === site.id}
                          style={fs.meta}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium
                                     text-rose-600 dark:text-rose-400
                                     shadow-[inset_0_0_0_1px_rgb(225_29_72_/_.20)]
                                     hover:shadow-[var(--hr-shadow-danger)]
                                     disabled:opacity-40 disabled:pointer-events-none
                                     transition-[box-shadow] duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                          تعطيل
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {isSiteFormOpen && (
              <div className="p-6 shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)] space-y-6">
                <SectionHead
                  title={siteForm.id ? "تعديل الموقع" : "موقع جديد"}
                  action={
                    <button
                      onClick={() => setIsSiteFormOpen(false)}
                      aria-label="إغلاق"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-300 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  }
                />

                <div className="grid grid-cols-12 gap-4">
                  <Field label="اسم الموقع" className="col-span-12">
                    <input
                      value={siteForm.name}
                      onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                      className={inputClass}
                      style={fs.body}
                      placeholder="المقر الرئيسي"
                    />
                  </Field>
                  <Field label="خط العرض" className="col-span-6 sm:col-span-4">
                    <input
                      value={siteForm.latitude}
                      onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })}
                      className={`${inputClass} font-mono tabular-nums`}
                      style={fs.body}
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="24.712345"
                    />
                  </Field>
                  <Field label="خط الطول" className="col-span-6 sm:col-span-4">
                    <input
                      value={siteForm.longitude}
                      onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })}
                      className={`${inputClass} font-mono tabular-nums`}
                      style={fs.body}
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="46.675296"
                    />
                  </Field>
                  <Field
                    label="نطاق السماح (متر)"
                    hint="يُنصح بـ 100–200 متر لاستيعاب خطأ GPS داخل المباني."
                    className="col-span-12 sm:col-span-4"
                  >
                    <input
                      value={siteForm.radiusMeters}
                      onChange={(e) => setSiteForm({ ...siteForm, radiusMeters: e.target.value })}
                      className={`${inputClass} font-mono tabular-nums`}
                      style={fs.body}
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className={ghostClass}
                    style={fs.body}
                  >
                    {locating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crosshair className="w-4 h-4" />
                    )}
                    استخدام موقعي الحالي
                  </button>
                  <button
                    onClick={submitSite}
                    disabled={busy === "site"}
                    className={ctaClass}
                    style={fs.body}
                  >
                    {busy === "site" && <Loader2 className="w-4 h-4 animate-spin" />}
                    حفظ الموقع
                  </button>
                </div>
              </div>
            )}
          </HrCard>
        </div>

        {/* Schedule */}
        <div className="col-span-12 lg:col-span-5">
          <HrCard className="p-6 h-full space-y-6">
            <SectionHead icon={Clock} title="أوقات الدوام" hint="بتوقيت الرياض" />

            <div className="grid grid-cols-2 gap-4">
              <Field label="بداية الدوام">
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
                  className={`${inputClass} tabular-nums`}
                  style={fs.body}
                  dir="ltr"
                />
              </Field>
              <Field label="نهاية الدوام">
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
                  className={`${inputClass} tabular-nums`}
                  style={fs.body}
                  dir="ltr"
                />
              </Field>
              <Field label="مهلة التأخير (د)">
                <input
                  value={schedule.lateAfterMinutes}
                  onChange={(e) => setSchedule({ ...schedule, lateAfterMinutes: e.target.value })}
                  className={`${inputClass} tabular-nums`}
                  style={fs.body}
                  dir="ltr"
                  inputMode="numeric"
                />
              </Field>
              <Field label="الانصراف المبكر (د)">
                <input
                  value={schedule.earlyLeaveBeforeMinutes}
                  onChange={(e) =>
                    setSchedule({ ...schedule, earlyLeaveBeforeMinutes: e.target.value })
                  }
                  className={`${inputClass} tabular-nums`}
                  style={fs.body}
                  dir="ltr"
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div>
              <p className="hr-eyebrow text-slate-400 dark:text-slate-500 mb-2" style={fs.eyebrow}>
                أيام العمل
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, day) => {
                  const selected = schedule.workDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSchedule({
                          ...schedule,
                          workDays: selected
                            ? schedule.workDays.filter((d) => d !== day)
                            : [...schedule.workDays, day].sort(),
                        })
                      }
                      style={fs.meta}
                      className={`px-4 py-2 rounded-xl font-medium
                                  transition-[box-shadow,color,background-color] duration-300 ${
                                    selected
                                      ? "text-primary dark:text-teal-400 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.28)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.28)]"
                                      : "text-slate-400 dark:text-slate-500 shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.16)] hover:shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.24)]"
                                  }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={submitSchedule}
              disabled={busy === "schedule"}
              className={`${ctaClass} w-full`}
              style={fs.body}
            >
              {busy === "schedule" && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ أوقات الدوام
            </button>
          </HrCard>
        </div>
      </section>

      {/* ── Bento: policy rationale (5) beside the allow list (7) ─────────── */}
      <section className="grid grid-cols-12 gap-4 hr-reveal">
        <div className="col-span-12 lg:col-span-5">
          <HrCard className="p-6 h-full space-y-6">
            <SectionHead icon={Wifi} title="التحقق من الشبكة" hint="طبقة ثانية فوق الموقع" />

            <HrCard sunk className="p-4 space-y-2">
              <p
                className="text-slate-500 dark:text-slate-400 leading-relaxed"
                style={fs.meta}
              >
                تحديد الموقع في المتصفح قابل للتزوير عبر أدوات المطوّر. عنوان الشبكة أصعب بكثير في
                التزوير.
              </p>
              <p
                className="text-slate-500 dark:text-slate-400 leading-relaxed"
                style={fs.meta}
              >
                يتحقق الشرط فقط عند الاتصال بواي فاي المقر؛ على بيانات الجوال لن يطابق العنوان.
              </p>
            </HrCard>

            <div className="space-y-2">
              {IP_MODES.map((option) => {
                const selected = ipMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setIpMode(option.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl text-right
                                transition-[box-shadow,background-color] duration-300 ${
                                  selected
                                    ? "bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.28)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.28)]"
                                    : "shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.14)] hover:shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.24)]"
                                }`}
                  >
                    <span className="hr-icon-lead hr-icon-lead--h3">
                      <span
                        className={`w-4 h-4 rounded-full transition-colors duration-300 ${
                          selected
                            ? "bg-primary dark:bg-teal-500 shadow-[0_0_0_3px_rgb(15_118_110_/_.16)]"
                            : "shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.36)]"
                        }`}
                      />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block font-semibold ${
                          selected
                            ? "text-primary dark:text-teal-400"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                        style={fs.h3}
                      >
                        {option.label}
                      </span>
                      <span
                        className="block text-slate-400 dark:text-slate-500 mt-2"
                        style={fs.meta}
                      >
                        {option.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </HrCard>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <HrCard className="p-6 h-full flex flex-col gap-6">
            <SectionHead
              title="عناوين الشبكة المسموحة"
              hint="عنوان مفرد أو نطاق CIDR"
              action={<Chip tone={ipRanges.length > 0 ? "primary" : "neutral"}>{ipRanges.length}</Chip>}
            />

            {ipMode === "BLOCK" && (
              <Banner tone="warn" icon={AlertTriangle}>
                في وضع المنع لن يتمكن أي موظف من التسجيل خارج شبكة الجمعية — بما في ذلك المهام
                الخارجية والفروع التي لا تمر عبر نفس الاتصال. أضِف كل عناوين الجمعية أولاً.
              </Banner>
            )}

            <div className="flex gap-2">
              <input
                value={ipDraft}
                onChange={(e) => setIpDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const value = ipDraft.trim();
                  if (value && !ipRanges.includes(value)) setIpRanges([...ipRanges, value]);
                  setIpDraft("");
                }}
                className={`${inputClass} font-mono tabular-nums`}
                style={fs.body}
                dir="ltr"
                placeholder="212.118.5.0/24"
              />
              <button
                onClick={() => {
                  const value = ipDraft.trim();
                  if (value && !ipRanges.includes(value)) setIpRanges([...ipRanges, value]);
                  setIpDraft("");
                }}
                className={`${ghostClass} shrink-0`}
                style={fs.body}
              >
                إضافة
              </button>
            </div>

            {currentIp && !ipRanges.includes(currentIp) && (
              <button
                onClick={() => setIpRanges([...ipRanges, currentIp])}
                className="self-start text-primary dark:text-teal-400 hover:underline underline-offset-4 rounded-lg transition-colors duration-300"
                style={fs.meta}
              >
                إضافة عنواني الحالي (<span dir="ltr" className="font-mono">{currentIp}</span>)
              </button>
            )}

            <div className="flex-1">
              {ipRanges.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500" style={fs.meta}>
                  القائمة فارغة — طبقة الشبكة غير مفعّلة عملياً.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {ipRanges.map((range) => (
                    <li
                      key={range}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl
                                 text-slate-600 dark:text-slate-300
                                 shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.16)]
                                 dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.16)]"
                      style={fs.meta}
                    >
                      <span dir="ltr" className="font-mono tabular-nums">
                        {range}
                      </span>
                      <button
                        onClick={() => setIpRanges(ipRanges.filter((r) => r !== range))}
                        aria-label={`إزالة ${range}`}
                        className="text-slate-400 hover:text-rose-500 transition-colors duration-300 rounded-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={submitIpPolicy}
              disabled={busy === "ip"}
              className={`${ctaClass} self-start`}
              style={fs.body}
            >
              {busy === "ip" && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ إعدادات الشبكة
            </button>
          </HrCard>
        </div>
      </section>
    </div>
  );
}
