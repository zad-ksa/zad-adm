"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Search,
  Eye,
  FileDown,
  RefreshCw,
  ArrowRight,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  ShieldAlert,
} from "lucide-react";
import Select from "@/components/console/Select";
import { Dialog } from "@/components/console/Dialog";
import { btn, field, Field, Note, OptionRow, Spinner } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import {
  getProjectBuilderCharities,
  getProjectBuilderCharityProfile,
  getProjectBuilderPreferences,
} from "@/app/actions/projectBuilder";
import type { ProjectBuilderPreference } from "@/lib/projectBuilder";
import { exportProjectDocx } from "@/lib/exportProjectDocx";

// `field` يثبّت ارتفاع سطر واحد (h-9) — لا يصلح لمربع نص متعدد الأسطر، وتركيب
// صنف h-auto بعده لا يضمن الغلبة لأن ترتيب أصناف Tailwind في الورقة المولَّدة
// ليس بالضرورة ترتيب النص. فيُستبدل h-9 صراحةً بارتفاعٍ أدنى يتمدّد.
const textareaField = field.replace("h-9", "min-h-20 py-2");

type CharityOption = { id: string; name: string };
type CharityProfile = {
  vision: string | null;
  mission: string | null;
  strategicGoals: string | null;
  field: string | null;
  city: string | null;
} | null;
type HistoryMsg = { role: "user" | "assistant"; content: string };
type AnalysisResult = {
  matching?: { section: string; summary: string }[];
  extra?: { item: string; detail: string }[];
  missing?: { section: string; suggestion: string }[];
};

// ── تنبيه ثابت يظهر قبل كل استعمال ──────────────────────────────────────────
function DisclaimerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="قبل أن تبدأ" icon={<ShieldAlert className="size-4.5" />} size="md">
      <div className="space-y-3 text-body leading-6 text-slate-700 dark:text-slate-300">
        <p>استعمال هذه الأداة مقتصر على أعضاء فريق زاد فقط.</p>
        <p>
          ما تنتجه الأداة مسودة أولى بمساعدة الذكاء الاصطناعي، ولا تغني عن مراجعة النص وتدقيقه والتأكد من صحة
          كل معلومة فيه قبل اعتماده أو إرساله.
        </p>
        <p>إن واجهت ما يحتاج تعديلاً أو تصحيحاً أو إضافة في الأداة، تواصل مع فريق مبرمجي زاد.</p>
      </div>
      <button type="button" onClick={onClose} className={`${btn.primary} mt-5 w-full`}>
        فهمت، متابعة
      </button>
    </Dialog>
  );
}

// ── توجيهات خاصة: قائمة قابلة للإضافة والحذف، مشتركة بين التبويبين ──────────
function DirectivesEditor({ directives, setDirectives }: { directives: string[]; setDirectives: (d: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    if (input.trim()) {
      setDirectives([...directives, input.trim()]);
      setInput("");
    }
  };
  return (
    <div className="space-y-2.5">
      <p className="text-meta text-slate-500 dark:text-slate-400">
        أضف توجيهات خاصة بنداً تلو الآخر — لها الأولوية في حال تعارضت مع الإعدادات الأساسية.
      </p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="مثال: عدد المستفيدين 500 طالبة بالضبط"
          className={`${field} flex-1`}
        />
        <button type="button" onClick={add} disabled={!input.trim()} className={btn.secondary}>
          <Plus className="size-4" /> إضافة
        </button>
      </div>
      {directives.length > 0 && (
        <ul className="space-y-1.5">
          {directives.map((d, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-secondary/25 bg-secondary/[0.06] px-3 py-1.5 dark:border-amber-400/20 dark:bg-amber-400/10"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white dark:bg-amber-500">
                {i + 1}
              </span>
              <span className="flex-1 text-body leading-5 text-slate-700 dark:text-slate-300">{d}</span>
              <button
                type="button"
                onClick={() => setDirectives(directives.filter((_, idx) => idx !== i))}
                className={btn.icon}
                title="حذف"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── إنشاء جديد ────────────────────────────────────────────────────────────────
function CreateTab({
  charities,
  preferenceOptions,
  onPreview,
}: {
  charities: CharityOption[];
  preferenceOptions: ProjectBuilderPreference[];
  onPreview: (content: string, fileName: string, history: HistoryMsg[]) => void;
}) {
  const [charityId, setCharityId] = useState("");
  const [profile, setProfile] = useState<CharityProfile>(null);
  const [profileState, setProfileState] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");
  const [programName, setProgramName] = useState("");
  const [programIdea, setProgramIdea] = useState("");
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [budget, setBudget] = useState({ include: true, total: "", reserve: false });
  const [directives, setDirectives] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!charityId) {
      setProfile(null);
      setProfileState("idle");
      return;
    }
    let cancelled = false;
    setProfileState("loading");
    getProjectBuilderCharityProfile(charityId).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        setProfileState("error");
        return;
      }
      if (!res.profile) {
        setProfile(null);
        setProfileState("missing");
        return;
      }
      setProfile(res.profile);
      setProfileState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [charityId]);

  const charityOptions = charities.map((c) => ({ value: c.id, label: c.name }));
  const activePreferenceCount = Object.keys(preferences).filter((k) => preferences[k]).length;
  const ready = charityId && profileState === "ready" && programName.trim() && programIdea.trim();

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/project-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charityId,
          programName: programName.trim(),
          programIdea: programIdea.trim(),
          preferences: Object.keys(preferences).filter((k) => preferences[k]),
          budget,
          directives,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "تعذّر توليد الوثيقة");
      onPreview(data.content, programName.trim(), data.history || []);
    } catch (e: any) {
      setError(e.message || "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Field id="pb-charity" label="الجمعية">
        <Select
          options={charityOptions}
          value={charityId || undefined}
          onSelect={setCharityId}
          placeholder="اختر الجمعية…"
          emptyLabel="لا توجد جمعيات"
          className="w-full"
        />
      </Field>

      {charityId && profileState === "loading" && (
        <div className="flex items-center gap-2 text-body text-slate-500">
          <Spinner size={14} /> يُحمَّل ملفّ الجمعية…
        </div>
      )}

      {charityId && profileState === "missing" && (
        <Note tone="warn">
          لم تُضَف المعلومات الثابتة لهذه الجمعية بعد (الرؤية والرسالة ومجال العمل). تواصل مع من يملك صلاحية
          التحكم بالأداة لإضافتها قبل إنشاء وثيقة لها.
        </Note>
      )}

      {charityId && profileState === "error" && <Note tone="warn">تعذّر تحميل ملفّ هذه الجمعية. حاول مرة أخرى.</Note>}

      {profileState === "ready" && profile && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2">
          {[
            ["الرؤية", profile.vision],
            ["الرسالة", profile.mission],
            ["الأهداف الاستراتيجية", profile.strategicGoals],
            ["مجال العمل", profile.field],
            ["المنطقة / المدينة", profile.city],
          ].map(([label, value]) => (
            <div key={label as string} className="space-y-0.5">
              <p className="text-caption font-semibold text-slate-400">{label}</p>
              <p className="text-body text-slate-700 dark:text-slate-300">{value || "—"}</p>
            </div>
          ))}
          <p className="sm:col-span-2 flex items-center gap-1.5 text-caption text-slate-400">
            <Info className="size-3.5 shrink-0" /> معلومات ثابتة لهذه الجمعية، لا تُعدَّل من هنا.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pb-name" label="اسم المبادرة / البرنامج">
          <input
            id="pb-name"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="مثال: برنامج عُدّة"
            className={field}
          />
        </Field>
      </div>
      <Field id="pb-idea" label="فكرة المبادرة / البرنامج">
        <textarea
          id="pb-idea"
          value={programIdea}
          onChange={(e) => setProgramIdea(e.target.value)}
          placeholder="وصف تفصيلي لفكرة البرنامج: ماذا يقدّم، لمن، وكيف…"
          rows={4}
          className={`${textareaField} resize-y`}
        />
      </Field>

      {preferenceOptions.length > 0 && (
        <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-body font-medium text-slate-700 dark:text-slate-300">
            <span>تفضيلات المحتوى{activePreferenceCount > 0 ? ` (${activePreferenceCount})` : ""}</span>
            <ArrowRight className="size-4 text-slate-400 transition-transform group-open:-rotate-90" />
          </summary>
          <div className="space-y-1 border-t border-slate-200 px-2 py-2 dark:border-slate-800">
            {preferenceOptions.map((ex) => (
              <OptionRow
                key={ex.key}
                label={ex.label}
                checked={!!preferences[ex.key]}
                onToggle={() => setPreferences((p) => ({ ...p, [ex.key]: !p[ex.key] }))}
              />
            ))}
          </div>
        </details>
      )}

      <details className="group rounded-xl border border-slate-200 dark:border-slate-800" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-body font-medium text-slate-700 dark:text-slate-300">
          <span>الميزانية</span>
          <ArrowRight className="size-4 text-slate-400 transition-transform group-open:-rotate-90" />
        </summary>
        <div className="space-y-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <OptionRow
            label="تضمين محور الميزانية التقديرية"
            note="إذا لم يُفعَّل، تُحذف الميزانية بالكامل"
            checked={budget.include}
            onToggle={() => setBudget((p) => ({ ...p, include: !p.include }))}
          />
          {budget.include && (
            <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <Field id="pb-budget-total" label="إجمالي الميزانية (اختياري)" hint="بالريال السعودي">
                <input
                  id="pb-budget-total"
                  value={budget.total}
                  onChange={(e) => setBudget((p) => ({ ...p, total: e.target.value.replace(/[^\d,]/g, "") }))}
                  placeholder="مثال: 400,000"
                  dir="ltr"
                  className={`${field} text-right`}
                />
              </Field>
              <OptionRow
                label="إضافة بند «مبلغ احتياطي»"
                checked={budget.reserve}
                onToggle={() => setBudget((p) => ({ ...p, reserve: !p.reserve }))}
              />
            </div>
          )}
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-body font-medium text-slate-700 dark:text-slate-300">
          <span>توجيهات خاصة{directives.length > 0 ? ` (${directives.length})` : ""}</span>
          <ArrowRight className="size-4 text-slate-400 transition-transform group-open:-rotate-90" />
        </summary>
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <DirectivesEditor directives={directives} setDirectives={setDirectives} />
        </div>
      </details>

      {error && <Note tone="warn">{error}</Note>}

      <button type="button" onClick={handleSubmit} disabled={!ready || submitting} className={`${btn.primary} w-full`}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> جارٍ الصياغة…
          </>
        ) : (
          <>
            <Eye className="size-4" /> معاينة الوثيقة
          </>
        )}
      </button>
    </div>
  );
}

// ── تحليل نصّ ملصوق ──────────────────────────────────────────────────────────
function AnalyzeTab({ onDone }: { onDone: (content: string, fileName: string, history: HistoryMsg[]) => void }) {
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [removeExtra, setRemoveExtra] = useState<Record<number, boolean>>({});
  const [addMissing, setAddMissing] = useState<Record<number, boolean>>({});
  const [directives, setDirectives] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const handleAnalyze = async () => {
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/project-builder/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "تعذّر التحليل");
      setResult(data.result);
      setRemoveExtra({});
      setAddMissing({});
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء التحليل");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRestructure = async () => {
    if (!result) return;
    setGenerating(true);
    setError("");
    const removals = (result.extra || []).filter((_, i) => removeExtra[i]).map((e) => e.item);
    const additions = (result.missing || []).filter((_, i) => addMissing[i]).map((m) => `${m.section}: ${m.suggestion}`);
    try {
      const res = await fetch("/api/project-builder/restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, removals, additions, directives }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "تعذّرت إعادة البناء");
      onDone(data.content, "وثيقة معاد بناؤها", data.history || []);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء إعادة البناء");
    } finally {
      setGenerating(false);
    }
  };

  const tr = Object.values(removeExtra).filter(Boolean).length;
  const ta = Object.values(addMissing).filter(Boolean).length;
  const hasActions = tr > 0 || ta > 0 || directives.length > 0;

  return (
    <div className="space-y-5">
      {!result ? (
        <>
          <Field
            id="pb-paste"
            label="نصّ الوثيقة"
            hint={`الصق النص المراد تحليله ومقارنته بالهيكل المعياري (حتى 20,000 حرف) — ${text.length.toLocaleString("ar")} حرف الآن.`}
          >
            <textarea
              id="pb-paste"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="الصق هنا نصّ الوثيقة الحالية…"
              rows={10}
              className={`${textareaField} resize-y`}
            />
          </Field>
          {error && <Note tone="warn">{error}</Note>}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!text.trim() || analyzing}
            className={`${btn.primary} w-full`}
          >
            {analyzing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> جارٍ التحليل…
              </>
            ) : (
              <>
                <Search className="size-4" /> تحليل النص
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {result.matching && result.matching.length > 0 && (
            <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-body font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> متطابق ({result.matching.length})
              </summary>
              <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
                {result.matching.map((m, i) => (
                  <div key={i} className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                    <p className="text-body font-semibold text-emerald-700 dark:text-emerald-400">{m.section}</p>
                    <p className="text-meta text-slate-600 dark:text-slate-400">{m.summary}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {result.extra && result.extra.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="flex items-center gap-2 px-4 py-3 text-body font-medium text-rose-700 dark:text-rose-400">
                <XCircle className="size-4" /> زائد ({result.extra.length})
              </p>
              <p className="px-4 text-meta text-slate-500">حدّد العناصر التي تريد إزالتها</p>
              <div className="space-y-1 p-2">
                {result.extra.map((e, i) => (
                  <OptionRow
                    key={i}
                    label={e.item}
                    note={e.detail}
                    checked={!!removeExtra[i]}
                    onToggle={() => setRemoveExtra((p) => ({ ...p, [i]: !p[i] }))}
                  />
                ))}
              </div>
            </div>
          )}

          {result.missing && result.missing.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="flex items-center gap-2 px-4 py-3 text-body font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-4" /> ناقص ({result.missing.length})
              </p>
              <p className="px-4 text-meta text-slate-500">حدّد المحاور التي تريد إضافتها</p>
              <div className="space-y-1 p-2">
                {result.missing.map((m, i) => (
                  <OptionRow
                    key={i}
                    label={m.section}
                    note={m.suggestion}
                    checked={!!addMissing[i]}
                    onToggle={() => setAddMissing((p) => ({ ...p, [i]: !p[i] }))}
                  />
                ))}
              </div>
            </div>
          )}

          <details className="group rounded-xl border border-slate-200 dark:border-slate-800">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-body font-medium text-slate-700 dark:text-slate-300">
              <span>توجيهات خاصة{directives.length > 0 ? ` (${directives.length})` : ""}</span>
              <ArrowRight className="size-4 text-slate-400 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <DirectivesEditor directives={directives} setDirectives={setDirectives} />
            </div>
          </details>

          {error && <Note tone="warn">{error}</Note>}

          <div className="flex gap-2">
            <button type="button" onClick={handleRestructure} disabled={!hasActions || generating} className={`${btn.primary} flex-1`}>
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> جارٍ إعادة البناء…
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" /> إعادة بناء الوثيقة
                </>
              )}
            </button>
            <button type="button" onClick={() => setResult(null)} className={btn.secondary}>
              نصّ آخر
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── معاينة الوثيقة الناتجة ───────────────────────────────────────────────────
function PreviewPane({
  content,
  fileName,
  history,
  onBack,
  onRevised,
}: {
  content: string;
  fileName: string;
  history: HistoryMsg[];
  onBack: () => void;
  onRevised: (content: string, history: HistoryMsg[]) => void;
}) {
  const [editReq, setEditReq] = useState("");
  const [revising, setRevising] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleRevise = async () => {
    if (!editReq.trim()) return;
    setRevising(true);
    try {
      const res = await fetch("/api/project-builder/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: editReq.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "تعذّر التعديل");
      onRevised(data.content, data.history || history);
      setEditReq("");
    } catch (e: any) {
      notify("error", e.message || "حدث خطأ أثناء التعديل");
    } finally {
      setRevising(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportProjectDocx(content, fileName || "وثيقة المبادرة");
    } catch {
      notify("error", "تعذّر إنشاء ملف الوورد.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={btn.secondary}>
          <ArrowRight className="size-4" /> رجوع
        </button>
        <button type="button" onClick={handleExport} disabled={exporting} className={`${btn.primary} ms-auto`}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          حوّلها وورد
        </button>
      </div>

      <div className="max-h-[520px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5 text-body leading-7 whitespace-pre-wrap dark:border-slate-800 dark:bg-slate-950">
        {content}
      </div>

      <div className="flex items-start gap-2">
        <textarea
          value={editReq}
          onChange={(e) => setEditReq(e.target.value)}
          placeholder="اكتب ملاحظة تعديل…"
          rows={2}
          className={`${textareaField} flex-1 resize-y`}
        />
        <button type="button" onClick={handleRevise} disabled={!editReq.trim() || revising} className={`${btn.primary} h-[46px]`}>
          {revising ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} تعديل
        </button>
      </div>
    </div>
  );
}

// ── المكوّن الرئيسي ────────────────────────────────────────────────────────────
export default function ProjectBuilderClient() {
  // "كل مرة قبل بدأ الاستعمال": بلا تخزين محلي، فيظهر من جديد عند كل زيارة.
  const [disclaimerOpen, setDisclaimerOpen] = useState(true);
  const [tab, setTab] = useState<"create" | "analyze">("create");
  const [view, setView] = useState<"form" | "preview">("form");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [history, setHistory] = useState<HistoryMsg[]>([]);
  const [charities, setCharities] = useState<CharityOption[]>([]);
  const [charitiesError, setCharitiesError] = useState("");
  const [preferenceOptions, setPreferenceOptions] = useState<ProjectBuilderPreference[]>([]);

  useEffect(() => {
    getProjectBuilderCharities().then((res) => {
      if (res.success) setCharities(res.charities);
      else setCharitiesError(res.error || "تعذّر تحميل قائمة الجمعيات");
    });
    getProjectBuilderPreferences().then((res) => {
      if (res.success) setPreferenceOptions(res.preferences);
    });
  }, []);

  const openPreview = (c: string, name: string, h: HistoryMsg[]) => {
    setContent(c);
    setFileName(name);
    setHistory(h);
    setView("preview");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <DisclaimerDialog open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {view === "form" && (
          <>
            <div className="mb-5 inline-flex gap-0.5 overflow-hidden rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
              {([
                { id: "create" as const, label: "إنشاء جديد", icon: Sparkles },
                { id: "analyze" as const, label: "تحليل نصّ ملصوق", icon: Search },
              ]).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body font-medium transition-colors ${
                    tab === t.id
                      ? "bg-primary text-white"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <t.icon className="size-4" /> {t.label}
                </button>
              ))}
            </div>

            {charitiesError && <Note tone="warn">{charitiesError}</Note>}

            {tab === "create" ? (
              <CreateTab charities={charities} preferenceOptions={preferenceOptions} onPreview={openPreview} />
            ) : (
              <AnalyzeTab onDone={openPreview} />
            )}
          </>
        )}

        {view === "preview" && (
          <PreviewPane
            content={content}
            fileName={fileName}
            history={history}
            onBack={() => setView("form")}
            onRevised={(c, h) => {
              setContent(c);
              setHistory(h);
            }}
          />
        )}
      </div>
    </div>
  );
}
