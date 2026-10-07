"use client";

import { useState } from "react";
import { Save, RotateCcw, Pencil, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { btn, field, Field, Note, Badge, SectionHeader } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import {
  updateProjectBuilderConfig,
  upsertProjectBuilderCharityProfile,
  deleteProjectBuilderCharityProfile,
} from "@/app/actions/projectBuilder";
import {
  DEFAULT_PROJECT_BUILDER_SYSTEM_PROMPT,
  PROJECT_BUILDER_PROMPT_TOKENS,
  type ProjectBuilderConfig,
} from "@/lib/projectBuilder";

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

const EMPTY_FORM: Record<keyof CharityProfileFields, string> = {
  vision: "",
  mission: "",
  strategicGoals: "",
  field: "",
  city: "",
};

// ── البرومبت العام ────────────────────────────────────────────────────────────
function PromptEditor({ initialConfig }: { initialConfig: ProjectBuilderConfig }) {
  const [saved, setSaved] = useState(initialConfig.systemPromptTemplate);
  const [template, setTemplate] = useState(initialConfig.systemPromptTemplate);
  const [saving, setSaving] = useState(false);
  const dirty = template !== saved;

  const handleSave = async () => {
    setSaving(true);
    const res = await updateProjectBuilderConfig({ systemPromptTemplate: template });
    setSaving(false);
    if (res.success) {
      setSaved(template);
      notify("ok", "حُفظ البرومبت العام.");
    } else {
      notify("error", res.error || "تعذّر الحفظ");
    }
  };

  const handleReset = () => setTemplate(DEFAULT_PROJECT_BUILDER_SYSTEM_PROMPT);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <SectionHeader
        title="البرومبت العام"
        description="النصّ الذي يُرسَل للذكاء الاصطناعي عند إنشاء كل وثيقة. لا يراه ولا يستطيع التأثير فيه أحدٌ غيرك."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={20}
          dir="rtl"
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

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleSave} disabled={!dirty || saving} className={btn.primary}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ
        </button>
        <button type="button" onClick={handleReset} className={btn.secondary}>
          <RotateCcw className="size-4" /> استعادة الافتراضي
        </button>
        {dirty && <span className="text-caption text-amber-600 dark:text-amber-400">تغييرات غير محفوظة</span>}
      </div>
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

// ── قائمة الجمعيات ────────────────────────────────────────────────────────────
export default function ProjectBuilderSettingsClient({
  initialConfig,
  initialCharities,
}: {
  initialConfig: ProjectBuilderConfig;
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
      <PromptEditor initialConfig={initialConfig} />

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
