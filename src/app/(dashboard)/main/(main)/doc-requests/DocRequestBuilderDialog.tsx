"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { Field, Note, OptionRow, Spinner, btn, cx, field } from "@/components/console/ui";
import DocRequestFields, {
  docFieldsFrom,
  type DocFieldValues,
} from "@/components/doc-requests/DocRequestFields";
import { notify } from "@/components/console/toastBus";
import {
  getProjectBuilderCharityProfile,
  getProjectBuilderPreferences,
} from "@/app/actions/projectBuilder";
import { saveDocRequestDocument } from "@/app/actions/docRequests";
import { writeDocument } from "@/lib/projectBuilderStream";
import type { ProjectBuilderPreference } from "@/lib/projectBuilder";
import { DocPreview } from "../project-builder/DocPreview";
import type { StaffDocRequest } from "./DocRequestsStaffClient";

/**
 * نافذةُ إنشاء الوثيقة من طلب جمعية.
 *
 * **وهي خياراتُ المنشئ نفسُها**: التفضيلاتُ والتوجيهاتُ والاحتياطيُّ وتجاوزُ
 * المدينة — ومدخلاتُ الطلب معبّأةٌ من الجمعية فلا تُكتب من جديد. ولو كانت
 * شاشةً ثانيةً لنُقل الطلبُ بيدٍ، وهو ما يُسقط حقلاً في كلِّ مرّة.
 *
 * **والخياراتُ تُحفظ مع المتن**: يُعاد بها الإنشاءُ، ويُفهم بها لمَ خرجت
 * الوثيقةُ هكذا بعد شهر.
 */
export default function DocRequestBuilderDialog({
  request,
  onClose,
  onSaved,
}: {
  request: StaffDocRequest;
  onClose: () => void;
  onSaved: () => void;
}) {
  /** ما أرسلته الجمعيةُ — يبقى للمقارنة ولاستعادته. */
  const original = docFieldsFrom({ ...request, kind: undefined });
  /** وما يكتب به الموظّفُ الآن: محرَّرُه المحفوظُ إن كان، وإلّا ما أرسلته. */
  const [values, setValues] = useState<DocFieldValues>(
    () => (request.builderOptions?.values as DocFieldValues | undefined) ?? original
  );
  const [prefs, setPrefs] = useState<ProjectBuilderPreference[]>([]);
  const [chosen, setChosen] = useState<Record<string, boolean>>(
    () => (request.builderOptions?.preferences as Record<string, boolean>) ?? {}
  );
  const [directives, setDirectives] = useState<string[]>(
    () => (request.builderOptions?.directives as string[]) ?? []
  );
  const [directiveInput, setDirectiveInput] = useState("");
  const [reserve, setReserve] = useState(
    () => (request.builderOptions?.reserve as boolean) ?? false
  );
  const [cityOverride, setCityOverride] = useState(
    () => (request.builderOptions?.cityOverride as string) ?? ""
  );
  const [profileMissing, setProfileMissing] = useState(false);
  const [live, setLive] = useState("");
  const [content, setContent] = useState(request.docContent ?? "");
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [list, profile] = await Promise.all([
        getProjectBuilderPreferences(),
        getProjectBuilderCharityProfile(request.charityId),
      ]);
      if (!alive) return;
      if (list.success) setPrefs(list.preferences);
      // وملفُّ الجمعية الثابتُ شرطُ الكتابة: الرؤيةُ والرسالةُ والمجال تدخل
      // في المتن، فبلا ملفٍّ لا وثيقة — ويُقال ذلك قبل الضغط لا بعده.
      setProfileMissing(!profile?.success || !profile?.profile);
    })();
    return () => {
      alive = false;
    };
  }, [request.charityId]);

  const generate = async () => {
    setError("");
    setLive("");
    setWriting(true);
    try {
      const doc = await writeDocument(
        "/api/project-builder/generate",
        {
          charityId: request.charityId,
          // والمكتوبُ الآن لا الصفُّ: الموظّفُ حرّر ما نقص قبل الضغط.
          programName: values.programName.trim(),
          programIdea: values.programIdea.trim(),
          cityOverride: cityOverride.trim(),
          beneficiariesCount: values.beneficiariesCount.trim(),
          programDuration: values.programDuration.trim(),
          targetCategory: values.targetCategory.trim(),
          startDate: values.startDate,
          endDate: values.endDate,
          preferences: Object.keys(chosen).filter((k) => chosen[k]),
          // والاحتياطيُّ قرارُ الموظّف وحدَه، وبقيّةُ الميزانية مما حُرّر.
          budget: {
            include: values.budgetInclude,
            total: values.budgetTotal.trim(),
            reserve,
          },
          directives: values.note.trim() ? [...directives, values.note.trim()] : directives,
        },
        setLive
      );
      setContent(doc.content);
      if (doc.truncated) notify("error", "الوثيقة مقطوعة — أعد الإنشاء أو اختصر التوجيهات.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنشاء الوثيقة");
    } finally {
      setWriting(false);
    }
  };

  const save = () =>
    startSave(async () => {
      const res = await saveDocRequestDocument(request.id, content, {
        // والمحرَّرُ يُحفظ ولا يُكتب على صفِّ الطلب: الطلبُ قولُ الجمعية كما
        // أرسلته، وهذا ما كُتبت به الوثيقةُ فعلاً — فيُقرأ الاثنان بعد شهر.
        values,
        preferences: chosen,
        directives,
        reserve,
        cityOverride: cityOverride.trim(),
      });
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      onSaved();
    });

  /** هل غُيّر شيءٌ عمّا أرسلته الجمعية؟ */
  const edited = JSON.stringify(values) !== JSON.stringify(original);

  const shown = writing ? live : content;

  return (
    <Dialog
      size="2xl"
      icon={<Sparkles className="size-5" />}
      title={request.programName || "إنشاء وثيقة المشروع"}
      description={`${request.charityName} — الخيارات تحفظ مع الوثيقة.`}
      onClose={onClose}
      busy={writing || saving}
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={generate}
            disabled={writing || saving || profileMissing}
            className={btn.secondary}
          >
            {writing ? <Spinner /> : <Sparkles className="size-4" />}
            {content ? "إعادة الإنشاء" : "إنشاء"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={writing || saving || !content.trim()}
            className={btn.primary}
          >
            {saving ? <Spinner tone="onPrimary" /> : <Save className="size-4" />}
            حفظ في الطلب
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {profileMissing && (
          <Note tone="warn">
            لا ملف ثابت لهذه الجمعية في منشئ الوثائق (الرؤية والرسالة والمجال). أضفه من إعدادات
            الأداة أولا.
          </Note>
        )}
        {error && <Note tone="danger">{error}</Note>}

        {/* مدخلاتُ الجمعية محرَّرةٌ هنا: ما أرسلته قد ينقص أو يُكتب على عجل،
            والموظّفُ أعلمُ بما يحتاجه المنشئ. والأصلُ يبقى في صفِّ الطلب ولا
            يُكتب عليه — ويُقرأ تحت كلِّ حقلٍ غُيّر. */}
        <section className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-caption font-semibold text-slate-500 dark:text-slate-400">
              مدخلات الطلب — حررها قبل الإنشاء
            </h3>
            {edited && (
              <button type="button" onClick={() => setValues(original)} className={btn.ghost}>
                <RotateCcw className="size-3.5" />
                استعادة ما أرسلته الجمعية
              </button>
            )}
          </div>

          <DocRequestFields
            values={values}
            onChange={setValues}
            idPrefix={`sdr-${request.id}`}
            original={original}
            disabled={writing || saving}
          />
        </section>

        {prefs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-body font-medium text-slate-700 dark:text-slate-300">
              تفضيلات المحتوى
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {prefs.map((pref) => (
                <OptionRow
                  key={pref.key}
                  label={pref.label}
                  checked={!!chosen[pref.key]}
                  onToggle={() => setChosen((prev) => ({ ...prev, [pref.key]: !prev[pref.key] }))}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="dr-city" label="تجاوز المدينة (اختياري)" hint="يترك فارغا لتؤخذ من ملف الجمعية.">
            <input
              id="dr-city"
              value={cityOverride}
              onChange={(e) => setCityOverride(e.target.value)}
              className={field}
            />
          </Field>

          {request.budgetInclude && (
            <div className="space-y-1.5">
              <p className="text-body font-medium text-slate-700 dark:text-slate-300">الاحتياطي</p>
              <OptionRow
                label="أضف بند احتياطي في الميزانية"
                checked={reserve}
                onToggle={() => setReserve((v) => !v)}
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-body font-medium text-slate-700 dark:text-slate-300">
            توجيهات خاصة (اختياري)
          </p>
          <div className="flex gap-2">
            <input
              value={directiveInput}
              onChange={(e) => setDirectiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (!directiveInput.trim()) return;
                setDirectives((prev) => [...prev, directiveInput.trim()]);
                setDirectiveInput("");
              }}
              placeholder="مثال: ركز على أثر المبادرة في التعليم"
              className={field}
            />
            <button
              type="button"
              onClick={() => {
                if (!directiveInput.trim()) return;
                setDirectives((prev) => [...prev, directiveInput.trim()]);
                setDirectiveInput("");
              }}
              className={btn.secondary}
            >
              <Plus className="size-4" />
              إضافة
            </button>
          </div>
          {directives.length > 0 && (
            <ul className="space-y-1">
              {directives.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-body dark:border-slate-800"
                >
                  <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">{d}</span>
                  <button
                    type="button"
                    onClick={() => setDirectives((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="حذف التوجيه"
                    className={btn.icon}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {shown && (
          <div className="space-y-1.5">
            <p className="text-body font-medium text-slate-700 dark:text-slate-300">
              {writing ? "تكتب الآن…" : "الوثيقة"}
            </p>
            <div className={cx("overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800")}>
              <DocPreview content={shown} charityId={request.charityId} live={writing} />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
