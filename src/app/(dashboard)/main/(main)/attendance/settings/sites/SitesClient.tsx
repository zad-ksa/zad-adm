"use client";

import { useState } from "react";
import {
  Check,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Radar,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { saveZadWorkSite, deleteZadWorkSite } from "@/app/actions/zadAttendance";
import { readPosition } from "@/lib/readPosition";
// Display only. Nothing computed here is ever sent to the server — a check-in
// is measured server-side from raw coordinates, which is what keeps the
// geofence meaningful. This is a setup aid: "am I standing inside it?"
//
// It calls the very functions the server calls, deliberately. A preview that
// applied a stricter rule than the real check would report "outside" for people
// the system would actually let in, which is worse than showing nothing.
import { ACCURACY_RETRY_THRESHOLD_M, evaluateGeofence, haversineMeters } from "@/lib/geo";
import { BTN, CARD, Feedback, GHOST, INPUT, useSettingsAction } from "../shared";

type Site = { id: string; name: string; latitude: number; longitude: number; radiusMeters: number };

/** Presets that match how offices are actually shaped. */
const PRESETS = [
  { m: 50, label: "مبنى صغير" },
  { m: 100, label: "مبنى" },
  { m: 150, label: "مبنى وموقف" },
  { m: 300, label: "مجمّع" },
  { m: 500, label: "حرم واسع" },
];

/** A GPS fix is only as good as its accuracy circle; say so plainly. */
const accuracyTone = (m: number) =>
  m <= 20
    ? { label: "دقة ممتازة", cls: "text-emerald-600 dark:text-emerald-400" }
    : m <= 50
      ? { label: "دقة جيدة", cls: "text-emerald-600 dark:text-emerald-400" }
      : m <= 200
        ? { label: "دقة متوسطة", cls: "text-amber-600 dark:text-amber-400" }
        : { label: "دقة ضعيفة", cls: "text-rose-600 dark:text-rose-400" };

const coord = (n: number) => n.toFixed(6);
const metres = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} كم` : `${Math.round(m)} م`);

const emptyForm = { id: "", name: "", latitude: "", longitude: "", radiusMeters: "150" };

/**
 * The radius against the fix that produced it, to scale.
 *
 * A radius of 50m entered from a fix accurate to ±80m is a geofence that will
 * refuse people standing in the lobby. Two numbers side by side do not say
 * that; two circles do.
 */
function ScaleView({ radius, accuracy }: { radius: number; accuracy: number | null }) {
  const outer = 58;
  const inner = accuracy ? Math.min(outer, (accuracy / radius) * outer) : 0;
  const tight = accuracy !== null && accuracy > radius * 0.6;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="w-[120px] h-[120px] shrink-0">
        <circle cx="70" cy="70" r={outer} className="fill-primary/10 stroke-primary" strokeWidth="1.5" />
        {accuracy !== null && inner > 0 && (
          <circle
            cx="70"
            cy="70"
            r={inner}
            className={tight ? "fill-amber-500/20 stroke-amber-500" : "fill-slate-400/20 stroke-slate-400"}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        <circle cx="70" cy="70" r="3" className="fill-primary" />
      </svg>

      <div className="text-[11px] space-y-1.5 min-w-0">
        <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-primary/30 border border-primary" />
          النطاق المقبول · <span className="tabular-nums font-bold">{metres(radius)}</span>
        </p>
        {accuracy !== null && (
          <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400" />
            دقة القراءة · <span className="tabular-nums font-bold">±{metres(accuracy)}</span>
          </p>
        )}
        {tight && (
          <p className="text-amber-600 dark:text-amber-400 leading-relaxed">
            دقة القراءة قريبة من حجم النطاق — وسّع النطاق أو أعد القراءة في الخارج، وإلا رُفض
            موظفون واقفون داخل المبنى.
          </p>
        )}
      </div>
    </div>
  );
}

export default function SitesClient({ sites }: { sites: Site[] }) {
  const { busy, error, notice, run } = useSettingsAction();

  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [fixAccuracy, setFixAccuracy] = useState<number | null>(null);

  // One reading, reused to measure every site — the setup check.
  const [here, setHere] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [checking, setChecking] = useState(false);

  const radius = Math.min(5000, Math.max(20, Number(form.radiusMeters) || 0));

  const startNew = () => {
    setForm(emptyForm);
    setFixAccuracy(null);
    setGeoError(null);
    setOpen(true);
  };

  const startEdit = (s: Site) => {
    setForm({
      id: s.id,
      name: s.name,
      latitude: String(s.latitude),
      longitude: String(s.longitude),
      radiusMeters: String(s.radiusMeters),
    });
    setFixAccuracy(null);
    setGeoError(null);
    setOpen(true);
  };

  /** The one-button path: stand at the door, press, done. */
  const locate = async () => {
    setLocating(true);
    setGeoError(null);
    try {
      const p = await readPosition();
      setForm((f) => ({
        ...f,
        latitude: coord(p.latitude),
        longitude: coord(p.longitude),
      }));
      setFixAccuracy(p.accuracy);
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : "تعذّر تحديد الموقع");
    } finally {
      setLocating(false);
    }
  };

  const checkHere = async () => {
    setChecking(true);
    setGeoError(null);
    try {
      const p = await readPosition();
      setHere({ lat: p.latitude, lng: p.longitude, accuracy: p.accuracy });
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : "تعذّر تحديد الموقع");
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    const okDone = await run(
      () =>
        saveZadWorkSite({
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radiusMeters: radius,
        }),
      form.id ? "حُفظ الموقع" : "أُضيف الموقع"
    );
    if (okDone) {
      setForm(emptyForm);
      setOpen(false);
      setFixAccuracy(null);
    }
  };

  const ready = form.name.trim() && form.latitude && form.longitude;

  return (
    <div className="space-y-4" dir="rtl">
      <Feedback error={error} notice={notice} />

      {geoError && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-3 text-[13px] leading-relaxed">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[13px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          المواقع المعتمدة
          <span className="text-slate-400 font-bold tabular-nums">{sites.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          {sites.length > 0 && (
            <button className={GHOST} disabled={checking} onClick={checkHere}>
              {checking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radar className="w-3.5 h-3.5" />
              )}
              افحص من موقعي
            </button>
          )}
          {!open && (
            <button className={BTN} onClick={startNew}>
              <Plus className="w-3.5 h-3.5" /> موقع جديد
            </button>
          )}
        </div>
      </div>

      {here && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          قراءة من موقعك الحالي بدقة ±{metres(here.accuracy)} — المسافات أدناه محسوبة منها للفحص
          فقط، والتحضير الفعلي يُقاس على الخادم بالقاعدة نفسها.
          {here.accuracy > ACCURACY_RETRY_THRESHOLD_M && (
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              {" "}
              الدقة أضعف من حدّ القبول (±{ACCURACY_RETRY_THRESHOLD_M} م)، وتحضير بهذه القراءة كان
              سيُطلب إعادته.
            </span>
          )}
        </p>
      )}

      {/* ── النموذج ───────────────────────────────────────────────────── */}
      {open && (
        <div className="rounded-2xl border border-primary/30 dark:border-teal-500/30 bg-primary/[0.03] dark:bg-teal-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-black text-slate-900 dark:text-slate-100">
              {form.id ? "تعديل الموقع" : "موقع جديد"}
            </p>
            <button
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            className={INPUT}
            placeholder="اسم الموقع — مثل: المقر الرئيسي"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* The one-button path first, typing second. */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="w-full h-11 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
            >
              {locating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحديد موقعك…
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4" /> استخدم موقعي الحالي
                </>
              )}
            </button>
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              قف عند مدخل المقر واضغط الزر. القراءة من داخل مبنى خرساني تكون أضعف دقة — إن ظهرت
              الدقة ضعيفة فأعدها من الخارج.
            </p>

            {fixAccuracy !== null && (
              <p className={`mt-2 text-[12px] font-bold ${accuracyTone(fixAccuracy).cls}`}>
                {accuracyTone(fixAccuracy).label} · ±{metres(fixAccuracy)}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              <label className="text-[11px] text-slate-500 dark:text-slate-400">
                خط العرض
                <input
                  className={`${INPUT} mt-1`}
                  dir="ltr"
                  placeholder="24.774265"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />
              </label>
              <label className="text-[11px] text-slate-500 dark:text-slate-400">
                خط الطول
                <input
                  className={`${INPUT} mt-1`}
                  dir="ltr"
                  placeholder="46.738586"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              أو انسخهما من خرائط جوجل: انقر على الموقع بزر يمين واختر الرقمين.
            </p>
          </div>

          {/* Radius */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                نطاق القبول
              </p>
              <span className="text-[13px] font-black text-primary tabular-nums">
                {metres(radius)}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.m}
                  type="button"
                  onClick={() => setForm({ ...form, radiusMeters: String(p.m) })}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                    radius === p.m
                      ? "bg-primary text-white"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {p.m} م
                  <span className="mr-1 font-normal opacity-70">{p.label}</span>
                </button>
              ))}
            </div>

            <input
              type="range"
              min={20}
              max={1000}
              step={10}
              value={Math.min(1000, radius)}
              onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
              className="w-full accent-primary"
            />

            <ScaleView radius={radius} accuracy={fixAccuracy} />
          </div>

          <div className="flex items-center gap-2">
            <button className={BTN} disabled={busy || !ready} onClick={submit}>
              <Check className="w-3.5 h-3.5" /> {form.id ? "حفظ التعديل" : "إضافة الموقع"}
            </button>
            <button className={GHOST} disabled={busy} onClick={() => setOpen(false)}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ── المواقع ───────────────────────────────────────────────────── */}
      {sites.length === 0 ? (
        <div className={`${CARD} text-center py-10`}>
          <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="mt-3 text-[13px] font-bold text-slate-700 dark:text-slate-200">
            لا مواقع بعد
          </p>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            بدون موقع واحد على الأقل لا يستطيع أحد تسجيل حضوره إلا من سُمح له بالعمل عن بُعد.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {sites.map((s) => {
            const distance = here
              ? haversineMeters(here.lat, here.lng, s.latitude, s.longitude)
              : null;
            // The server's own rule, tolerance and all.
            const inside =
              here !== null &&
              distance !== null &&
              evaluateGeofence(distance, s.radiusMeters, here.accuracy).withinRange;

            return (
              <div key={s.id} className={`${CARD} group/site`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-slate-900 dark:text-slate-100 truncate">
                      {s.name}
                    </p>
                    <p
                      className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums"
                      dir="ltr"
                    >
                      {coord(s.latitude)}, {coord(s.longitude)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/site:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                      title="تعديل"
                      disabled={busy}
                      onClick={() => startEdit(s)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors inline-flex items-center justify-center"
                      title="تعطيل الموقع"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `تعطيل «${s.name}»؟ لن يُقبل تحضير من نطاقه بعد ذلك. السجلات السابقة تبقى كما هي.`
                          )
                        ) {
                          run(() => deleteZadWorkSite(s.id), "عُطّل الموقع");
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-300 tabular-nums">
                    <Radar className="w-3 h-3" /> نطاق {metres(s.radiusMeters)}
                  </span>

                  {distance !== null && (
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg tabular-nums ${
                        inside
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <Navigation className="w-3 h-3" />
                      {inside ? "داخل النطاق" : "خارج النطاق"} · {metres(distance)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
