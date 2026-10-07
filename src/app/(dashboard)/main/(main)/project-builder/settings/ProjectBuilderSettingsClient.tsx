"use client";

import { useEffect, useState } from "react";
import { Save, History, Eye, RotateCcw, Pencil, Trash2, CheckCircle2, Circle, Loader2, Plus, X } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { btn, field, Field, Note, Badge, SectionHeader } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import {
  saveProjectBuilderPrompt,
  getProjectBuilderPromptVersionContent,
  restoreProjectBuilderPromptVersion,
  updateProjectBuilderOptions,
  upsertProjectBuilderCharityProfile,
  deleteProjectBuilderCharityProfile,
} from "@/app/actions/projectBuilder";
import { PROJECT_BUILDER_PROMPT_TOKENS, type ProjectBuilderExclusion, type ProjectBuilderOptions } from "@/lib/projectBuilder";

// انظر الملاحظة في ProjectBuilderClient.tsx: h-9 الثابت في `field` لا يصلح
// لمربع نص متعدد الأسطر، واستبداله صراحةً أضمن من الاعتماد على ترتيب الأصناف.
const textareaField = field.replace("h-9", "min-h-20 py-2");

type CharityProfileFields = {
  vision: string | null;
  mission: string | null;
  strategicGoals: string | null;
  field: string | null;
  city: string | null;
};
type CharityRow = { id: string; name: string; projectBuilderProfile: CharityProfileFields | null };
type PromptVersionSummary = {
  id: string;
  createdAt: Date | string;
  createdByName: string | null;
  note: string | null;
  length: number;
};

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

// ── البرومبت العام، بتاريخ إصداراته ──────────────────────────────────────────
function PromptEditor({ initialVersions }: { initialVersions: PromptVersionSummary[] }) {
  const [versions, setVersions] = useState(initialVersions);
  const current = versions[0] ?? null;
  const [template, setTemplate] = useState("");
  const [savedTemplate, setSavedTemplate] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<{ summary: PromptVersionSummary; content: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // يُحمَّل النص الكامل للإصدار الحالي حين يتغيّر — عند الفتح، وبعد كل حفظ
  // أو استعادة يُحدَّث loadedId فيُسكت الشرط فلا يُعاد الجلب بلا داعٍ.
  useEffect(() => {
    if (current && current.id !== loadedId) {
      getProjectBuilderPromptVersionContent(current.id).then((res) => {
        if (res.success) {
          setTemplate(res.template);
          setSavedTemplate(res.template);
          setLoadedId(current.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const dirty = template !== savedTemplate;
  const isNew = versions.length === 0;

  const handleSave = async () => {
    if (!template.trim()) {
      notify("error", "البرومبت لا يمكن أن يكون فارغاً");
      return;
    }
    setSaving(true);
    const res = await saveProjectBuilderPrompt(template, note);
    setSaving(false);
    if (res.success && res.version) {
      const added: PromptVersionSummary = {
        id: res.version.id,
        createdAt: res.version.createdAt,
        createdByName: res.version.createdByName,
        note: res.version.note,
        length: template.trim().length,
      };
      setVersions((prev) => [added, ...prev]);
      setLoadedId(added.id);
      setSavedTemplate(template);
      setNote("");
      notify("ok", "حُفظ إصدار جديد من البرومبت.");
    } else {
      notify("error", res.error || "تعذّر الحفظ");
    }
  };

  const handleView = async (v: PromptVersionSummary) => {
    const res = await getProjectBuilderPromptVersionContent(v.id);
    if (res.success) setViewing({ summary: v, content: res.template });
    else notify("error", res.error || "تعذّر تحميل هذا الإصدار");
  };

  const handleRestore = async (v: PromptVersionSummary) => {
    if (!(await confirmAction({ title: `استعادة إصدار ${fmtDate(v.createdAt)}؟`, message: "يُضاف إصداراً جديداً بنفس هذا المحتوى — لا يُحذف أي إصدار." }))) return;
    setBusyId(v.id);
    const res = await restoreProjectBuilderPromptVersion(v.id);
    setBusyId(null);
    if (res.success && res.version) {
      const content = await getProjectBuilderPromptVersionContent(res.version.id);
      setVersions((prev) => [
        { id: res.version!.id, createdAt: res.version!.createdAt, createdByName: res.version!.createdByName, note: res.version!.note, length: v.length },
        ...prev,
      ]);
      if (content.success) {
        setTemplate(content.template);
        setSavedTemplate(content.template);
        setLoadedId(res.version.id);
      }
      setViewing(null);
      notify("ok", "استُعيد الإصدار.");
    } else {
      notify("error", res.error || "تعذّرت الاستعادة");
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <SectionHeader
        title="البرومبت العام"
        description="النصّ الذي يُرسَل للذكاء الاصطناعي عند إنشاء كل وثيقة. لا يراه ولا يستطيع التأثير فيه أحدٌ غيرك، ولكل حفظ إصدارٌ محفوظ في سجل أسفله."
      />

      {isNew && (
        <Note tone="warn">لا يوجد برومبت محفوظ بعد — الأداة لن تعمل حتى تكتب واحداً وتحفظه هنا.</Note>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={20}
          dir="rtl"
          placeholder="اكتب البرومبت العام هنا…"
          className={`${textareaField} resize-y font-mono text-[12.5px] leading-6`}
        />
        <div className="space-y-3">
          <Note tone="brand">استعمل هذه الرموز داخل النص — تُستبدَل تلقائياً عند التوليد.</Note>
          <ul className="space-y-1.5 rounded-lg border border-slate-200 p-2.5 text-caption dark:border-slate-800">
            {PROJECT_BUILDER_PROMPT_TOKENS.map((t) => (
              <li key={t.token} className="flex flex-col">
                <code className="text-primary dark:text-teal-300">{t.token}</code>
                <span className="text-slate-500 dark:text-slate-400">{t.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Field id="pb-prompt-note" label="ملاحظة على هذا الحفظ" hint="اختياري — يظهر في السجل أسفله">
        <input id="pb-prompt-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: أضفت فقرة الاستدامة" className={field} />
      </Field>

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleSave} disabled={saving || !template.trim()} className={btn.primary}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ كإصدار جديد
        </button>
        {dirty && !isNew && <span className="text-caption text-amber-600 dark:text-amber-400">تغييرات غير محفوظة</span>}
      </div>

      {versions.length > 0 && (
        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="flex items-center gap-1.5 text-body font-medium text-slate-700 dark:text-slate-300">
            <History className="size-4" /> سجل الإصدارات ({versions.length})
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {versions.map((v, i) => (
              <li key={v.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                {i === 0 && <Badge tone="brand">الحالي</Badge>}
                <div className="min-w-0 flex-1">
                  <p className="text-body text-slate-700 dark:text-slate-300">
                    {fmtDate(v.createdAt)} — {v.createdByName || "غير معروف"}
                  </p>
                  {v.note && <p className="text-caption text-slate-500">{v.note}</p>}
                </div>
                <button type="button" onClick={() => handleView(v)} className={btn.icon} title="عرض">
                  <Eye className="size-4" />
                </button>
                {i !== 0 && (
                  <button type="button" onClick={() => handleRestore(v)} disabled={busyId === v.id} className={btn.icon} title="استعادة هذا الإصدار">
                    {busyId === v.id ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {viewing && (
        <Dialog
          open
          onClose={() => setViewing(null)}
          title={`إصدار ${fmtDate(viewing.summary.createdAt)}`}
          description={viewing.summary.createdByName ? `بواسطة ${viewing.summary.createdByName}` : undefined}
          size="lg"
          footer={
            <>
              <button type="button" onClick={() => setViewing(null)} className={btn.secondary}>
                إغلاق
              </button>
              {viewing.summary.id !== current?.id && (
                <button type="button" onClick={() => handleRestore(viewing.summary)} className={btn.primary}>
                  <RotateCcw className="size-4" /> استعادة هذا الإصدار
                </button>
              )}
            </>
          }
        >
          <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-6 text-slate-700 dark:text-slate-300">
            {viewing.content}
          </pre>
        </Dialog>
      )}
    </section>
  );
}

// ── قيود المحتوى ومحاور الوثيقة المعيارية ───────────────────────────────────
function OptionsEditor({ initialOptions }: { initialOptions: ProjectBuilderOptions }) {
  const [exclusions, setExclusions] = useState<ProjectBuilderExclusion[]>(initialOptions.exclusions);
  const [sections, setSections] = useState<string[]>(initialOptions.sections);
  const [newExclusion, setNewExclusion] = useState({ label: "", promptText: "" });
  const [newSection, setNewSection] = useState("");
  const [saving, setSaving] = useState(false);

  const addExclusion = () => {
    if (!newExclusion.label.trim() || !newExclusion.promptText.trim()) return;
    setExclusions((prev) => [
      ...prev,
      { key: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: newExclusion.label.trim(), promptText: newExclusion.promptText.trim() },
    ]);
    setNewExclusion({ label: "", promptText: "" });
  };

  const addSection = () => {
    if (!newSection.trim()) return;
    setSections((prev) => [...prev, newSection.trim()]);
    setNewSection("");
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateProjectBuilderOptions({ exclusions, sections });
    setSaving(false);
    if (res.success) notify("ok", "حُفظت القيود والمحاور.");
    else notify("error", res.error || "تعذّر الحفظ");
  };

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <SectionHeader
        title="قيود المحتوى ومحاور الوثيقة المعيارية"
        description="قيود المحتوى تظهر كخيارات اختيارية عند إنشاء كل وثيقة. محاور الوثيقة المعيارية تُستعمل في مقارنة أي نصّ يُلصق للتحليل."
      />

      <div>
        <p className="mb-2 text-body font-medium text-slate-700 dark:text-slate-300">قيود المحتوى ({exclusions.length})</p>
        {exclusions.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {exclusions.map((ex) => (
              <li key={ex.key} className="flex items-start gap-2 rounded-md border border-slate-100 px-3 py-2 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-slate-800 dark:text-slate-200">{ex.label}</p>
                  <p className="text-caption text-slate-500">{ex.promptText}</p>
                </div>
                <button type="button" onClick={() => setExclusions((prev) => prev.filter((e) => e.key !== ex.key))} className={btn.iconDanger} title="حذف">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700 sm:grid-cols-[1fr_1.4fr_auto]">
          <input
            value={newExclusion.label}
            onChange={(e) => setNewExclusion((p) => ({ ...p, label: e.target.value }))}
            placeholder="مثال: عدم ذكر دورات تدريبية"
            className={field}
          />
          <input
            value={newExclusion.promptText}
            onChange={(e) => setNewExclusion((p) => ({ ...p, promptText: e.target.value }))}
            placeholder="النص الذي يُرسَل للذكاء الاصطناعي عند تفعيله"
            className={field}
          />
          <button type="button" onClick={addExclusion} disabled={!newExclusion.label.trim() || !newExclusion.promptText.trim()} className={btn.secondary}>
            <Plus className="size-4" /> إضافة
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="mb-2 text-body font-medium text-slate-700 dark:text-slate-300">محاور الوثيقة المعيارية ({sections.length})</p>
        {sections.length > 0 && (
          <ol className="mb-3 space-y-1.5">
            {sections.map((s, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border border-slate-100 px-3 py-1.5 dark:border-slate-800">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {i + 1}
                </span>
                <span className="flex-1 text-body text-slate-700 dark:text-slate-300">{s}</span>
                <button type="button" onClick={() => setSections((prev) => prev.filter((_, idx) => idx !== i))} className={btn.icon} title="حذف">
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="flex gap-2">
          <input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSection();
              }
            }}
            placeholder="مثال: خطة الاستدامة"
            className={`${field} flex-1`}
          />
          <button type="button" onClick={addSection} disabled={!newSection.trim()} className={btn.secondary}>
            <Plus className="size-4" /> إضافة
          </button>
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className={btn.primary}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ
      </button>
    </section>
  );
}

// ── نافذة تعديل ملفّ جمعية ────────────────────────────────────────────────────
function CharityProfileDialog({
  charity,
  onClose,
  onSaved,
}: {
  charity: CharityRow;
  onClose: () => void;
  onSaved: (profile: CharityProfileFields | null) => void;
}) {
  const [form, setForm] = useState<Record<keyof CharityProfileFields, string>>({
    vision: charity.projectBuilderProfile?.vision || "",
    mission: charity.projectBuilderProfile?.mission || "",
    strategicGoals: charity.projectBuilderProfile?.strategicGoals || "",
    field: charity.projectBuilderProfile?.field || "",
    city: charity.projectBuilderProfile?.city || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof CharityProfileFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await upsertProjectBuilderCharityProfile(charity.id, form);
    setSaving(false);
    if (res.success) {
      notify("ok", `حُفظت معلومات «${charity.name}».`);
      onSaved(res.profile || null);
      onClose();
    } else {
      notify("error", res.error || "تعذّر الحفظ");
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`معلومات «${charity.name}» الثابتة`}
      description="تُعبّأ تلقائياً في الأداة عند اختيار هذه الجمعية، ولا يعدّلها أحدٌ غيرك."
      size="lg"
      busy={saving}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={btn.secondary}>
            إلغاء
          </button>
          <button type="submit" disabled={saving} className={btn.primary}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field id="cp-vision" label="الرؤية">
          <textarea id="cp-vision" value={form.vision} onChange={set("vision")} rows={2} className={`${textareaField} resize-y`} />
        </Field>
        <Field id="cp-mission" label="الرسالة">
          <textarea id="cp-mission" value={form.mission} onChange={set("mission")} rows={2} className={`${textareaField} resize-y`} />
        </Field>
        <Field id="cp-goals" label="الأهداف الاستراتيجية" hint="اختياري">
          <textarea id="cp-goals" value={form.strategicGoals} onChange={set("strategicGoals")} rows={2} className={`${textareaField} resize-y`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cp-field" label="مجال عمل الجمعية">
            <input id="cp-field" value={form.field} onChange={set("field")} placeholder="مثال: تعليمية، صحية، إنسانية…" className={field} />
          </Field>
          <Field id="cp-city" label="المنطقة / المدينة">
            <input id="cp-city" value={form.city} onChange={set("city")} placeholder="مثال: الرياض" className={field} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

// ── المكوّن الرئيسي ────────────────────────────────────────────────────────────
export default function ProjectBuilderSettingsClient({
  initialVersions,
  initialOptions,
  initialCharities,
}: {
  initialVersions: PromptVersionSummary[];
  initialOptions: ProjectBuilderOptions;
  initialCharities: CharityRow[];
}) {
  const [charities, setCharities] = useState(initialCharities);
  const [editing, setEditing] = useState<CharityRow | null>(null);

  const handleClear = async (charity: CharityRow) => {
    if (!charity.projectBuilderProfile) return;
    if (!(await confirmAction({ title: `مسح معلومات «${charity.name}»؟`, tone: "danger" }))) return;
    const res = await deleteProjectBuilderCharityProfile(charity.id);
    if (res.success) {
      setCharities((prev) => prev.map((c) => (c.id === charity.id ? { ...c, projectBuilderProfile: null } : c)));
      notify("ok", "مُسحت المعلومات.");
    } else {
      notify("error", res.error || "تعذّر المسح");
    }
  };

  const ready = charities.filter((c) => c.projectBuilderProfile).length;

  return (
    <div className="space-y-6">
      <PromptEditor initialVersions={initialVersions} />
      <OptionsEditor initialOptions={initialOptions} />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <SectionHeader
          title="بيانات الجمعيات الثابتة"
          description="رؤية كل جمعية ورسالتها ومجال عملها — تُملأ تلقائياً في الأداة عند اختيار الجمعية."
          action={
            <span className="text-caption text-slate-500">
              {ready}/{charities.length} مُعدّة
            </span>
          }
        />

        {charities.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-body text-slate-500 dark:border-slate-700">
            لا توجد جمعيات بعد.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {charities.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                {c.projectBuilderProfile ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="size-4 shrink-0 text-slate-300 dark:text-slate-700" />
                )}
                <span className="flex-1 truncate text-body text-slate-800 dark:text-slate-200">{c.name}</span>
                {!c.projectBuilderProfile && <Badge tone="warn">بلا معلومات</Badge>}
                <button type="button" onClick={() => setEditing(c)} className={btn.icon} title="تعديل">
                  <Pencil className="size-4" />
                </button>
                {c.projectBuilderProfile && (
                  <button type="button" onClick={() => handleClear(c)} className={btn.iconDanger} title="مسح">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <CharityProfileDialog
          charity={editing}
          onClose={() => setEditing(null)}
          onSaved={(profile) =>
            setCharities((prev) => prev.map((c) => (c.id === editing.id ? { ...c, projectBuilderProfile: profile } : c)))
          }
        />
      )}
    </div>
  );
}
