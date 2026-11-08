"use client";

import { useState } from "react";
import { ListTree, Loader2, Pencil } from "lucide-react";
import Select, { type SelectVariant } from "@/components/console/Select";
import { MONO, btn, cx, field } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { listPlanInitiatives } from "@/app/actions/charity";

/** مبادرةُ خطةٍ كما يُعيدها `listPlanInitiatives`. */
type PlanInitiative = {
  id: string;
  number: number;
  name: string;
  objectiveCode: string | null;
  perspective: string;
  planLabel: string;
};

/**
 * حقلُ اسمِ مشروعِ المنحة: يُكتب باليد، أو يُجلب من الخطة التشغيلية.
 *
 * **ومكوّنٌ واحدٌ لكلّ موضعٍ يرفع منحة**: لوحةُ `GrantSheet` (صفحةُ الجهة
 * وجدولُ المنح) ونموذجُ صفحةِ منح الجمعية. ولو كُتب المنطقُ في كلٍّ منهما
 * لافترقا عند أوّلِ تعديل — كما افترقت نماذجُ الرفع الثلاثةُ من قبل.
 *
 * **والمجلوبُ لا يُعدَّل.** اسمُ المبادرة في المنحة هو اسمُها في الخطة بحرفه:
 * تعديلُ حرفٍ فيه يفصل المنحةَ عن مبادرتها في كلّ قراءةٍ لاحقة — في تقريرٍ
 * يجمع منحَ مبادرةٍ أو في بحثٍ عنها. ومن أراد اسماً آخرَ كتبه يدوياً من جديد،
 * فيكون كاتبَه لا مُحرِّفَ اسمٍ مجلوب.
 *
 * **ويُنشأ من جديدٍ بتبديل الجمعية** — `key={charityId}` عند المُنادي: المبادراتُ
 * خطةُ جمعيةٍ بعينها، فلو بقيت مختارةً بعد التبديل رُفعت منحةٌ لجمعيةٍ باسم
 * مبادرةٍ من خطة غيرها، وهو خطأٌ لا يُرى في الجدول بعد الرفع.
 */
export default function InitiativeNameField({
  charityId,
  value,
  onChange,
  variant = "console",
  required = true,
}: {
  /** الجمعيةُ التي تُقرأ خطّتُها. فارغةٌ: لم تُختر بعد. */
  charityId: string;
  value: string;
  onChange: (name: string) => void;
  variant?: SelectVariant;
  required?: boolean;
}) {
  const [plan, setPlan] = useState<PlanInitiative[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickedId, setPickedId] = useState("");
  /** فُتحت القائمةُ ولم يُختر منها بعد. */
  const [picking, setPicking] = useState(false);

  const picked = plan?.find((i) => i.id === pickedId) ?? null;

  const openPlan = () => {
    if (!charityId) {
      notify("error", "اختر الجمعية أولاً — المبادرات من خطّتها.");
      return;
    }
    if (plan) {
      setPicking(true);
      return;
    }
    setLoading(true);
    void (async () => {
      const res = await listPlanInitiatives(charityId);
      setLoading(false);
      if (!res.success) {
        notify("error", res.message || "تعذّر جلب مبادرات الخطة");
        return;
      }
      if (res.initiatives.length === 0) {
        // سببٌ لا فراغ: الخطةُ قد لا تكون مرفوعةً بعد، أو لا مبادراتٍ فيها في
        // هذين المنظورين.
        notify("error", "لا مبادرات في خطة هذه الجمعية تحت «المستفيدون» و«العمليات الداخلية».");
        return;
      }
      setPlan(res.initiatives);
      setPicking(true);
    })();
  };

  /** عودةٌ إلى الكتابة باليد — تُفرِّغ المجلوبَ ولا تُبقيه قابلاً للتعديل. */
  const writeByHand = () => {
    setPickedId("");
    setPicking(false);
    onChange("");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body font-medium text-slate-700 dark:text-slate-300">اسم المشروع</span>

        {picked ? (
          <button type="button" onClick={writeByHand} className={cx(btn.ghost, "text-meta")}>
            <Pencil className="size-3.5" />
            اكتب الاسم يدوياً
          </button>
        ) : (
          <button type="button" onClick={openPlan} disabled={loading} className={cx(btn.ghost, "text-meta")}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ListTree className="size-3.5" />}
            {picking ? "اختر مبادرةً من القائمة" : "جلب المبادرة من الخطة التشغيلية"}
          </button>
        )}
      </div>

      {picked ? (
        <>
          <p className="rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-body text-slate-800 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-slate-100">
            {picked.name}
          </p>
          <p className="text-meta text-slate-500 dark:text-slate-400">
            مبادرةٌ رقم <span className={MONO}>{picked.number}</span> في «{picked.planLabel}» — {picked.perspective}
            {picked.objectiveCode ? ` · هدف ${picked.objectiveCode}` : ""}
          </p>
        </>
      ) : picking && plan ? (
        <>
          <Select
            variant={variant}
            value={pickedId}
            onSelect={(id) => {
              const hit = plan.find((i) => i.id === id);
              if (!hit) return;
              setPickedId(id);
              onChange(hit.name);
              setPicking(false);
            }}
            placeholder="اختر المبادرة…"
            options={plan.map((i) => ({
              value: i.id,
              label: i.name,
              hint: `${i.perspective}${i.objectiveCode ? ` · ${i.objectiveCode}` : ""}`,
              count: i.number,
            }))}
            className="w-full [&>button]:w-full [&>button]:justify-between"
          />
          <button type="button" onClick={writeByHand} className={cx(btn.ghost, "text-meta")}>
            بل أكتبه يدوياً
          </button>
        </>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className={field} />
      )}
    </div>
  );
}
