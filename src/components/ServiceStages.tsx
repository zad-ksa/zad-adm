"use client";

import { Check, Layers } from "lucide-react";
import { Badge, cx } from "@/components/console/ui";
import { EmptyState } from "@/components/console/layout";
import {
  currentStage,
  groupStages,
  isComingSoon,
  serviceProgress,
  sortedSteps,
  type ServiceStage,
} from "@/lib/serviceStages";

/**
 * مراحلُ خدمةٍ واحدةٍ كاملةً — مسارُها المتتابع وخدماتُها الدائمة.
 *
 * **وهي واحدةٌ لموضعين**: «دليل الخدمات» يعرض كلَّ خدمةٍ بهذا الشكل، وبطاقةُ
 * الخدمة تفتحه لخدمتها. وكانا شكلين مكتوبين مرّتين يختلفان في الألوان
 * والمقاسات وفي ترتيب المراحل نفسِه.
 *
 * **واللونُ حالٌ لا زينة**: الهويّةُ للمرحلة الجارية، والرماديُّ لما تمّ،
 * والكهرمانيُّ لما لم يُبدأ بعد — ولا تدرّجَ خلف البطاقة ولا نبضةَ خضراء.
 */
export default function ServiceStages({ stages }: { stages: ServiceStage[] }) {
  const { sequential, continuous } = groupStages(stages);
  const here = currentStage(stages);
  const { at, total, percent, done } = serviceProgress(stages);

  if (sequential.length === 0 && continuous.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="size-4" />}
        title="لا مراحل مسجلة لهذه الخدمة"
        description="تضاف المراحل من فريق زاد."
      />
    );
  }

  return (
    <div className="space-y-5">
      {sequential.length > 0 && (
        <section className="space-y-3">
          {/* شريطُ التقدّم أوّلاً: «أين نحن» يُقرأ بلمحةٍ قبل قراءة المراحل. */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-body font-medium text-slate-900 dark:text-slate-100">
                {here ? here.name : "—"}
              </p>
              <p className="shrink-0 text-meta tabular-nums text-slate-500 dark:text-slate-400">
                المرحلة {at} من {total} · أنجز {done}
              </p>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 dark:bg-teal-400"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <ol className="space-y-2">
            {sequential.map((stage, idx) => {
              const isHere = here?.id === stage.id && !stage.isDone;
              const passed = stage.isDone || (here ? idx < sequential.indexOf(here) : false);
              const soon = isComingSoon(stage);
              const steps = sortedSteps(stage);

              return (
                <li
                  key={stage.id}
                  className={cx(
                    "rounded-xl border p-4",
                    isHere
                      ? "border-primary/30 bg-primary/[0.03] dark:border-teal-400/25 dark:bg-teal-400/[0.04]"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  )}
                >
                  <div className="flex flex-wrap items-start gap-2.5">
                    <span
                      aria-hidden
                      className={cx(
                        "mt-px flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold tabular-nums",
                        passed
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : isHere
                            ? "bg-primary text-white dark:bg-teal-400 dark:text-slate-900"
                            : "border border-slate-200 text-slate-400 dark:border-slate-700"
                      )}
                    >
                      {passed ? <Check className="size-3.5" /> : idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h4 className="flex flex-wrap items-center gap-2 text-title font-semibold text-slate-900 dark:text-slate-100">
                        {stage.name}
                        {isHere && !soon && <Badge tone="brand">الحالية</Badge>}
                        {soon && <Badge tone="warn">قريبا</Badge>}
                        {passed && <Badge tone="good">أنجزت</Badge>}
                      </h4>
                      {stage.description && (
                        <p className="mt-1 text-body leading-6 text-slate-500 dark:text-slate-400">
                          {stage.description}
                        </p>
                      )}

                      {steps.length > 0 && (
                        <ul className="mt-2.5 space-y-1.5">
                          {steps.map((step) => {
                            const stepDone = step.isDone || passed;
                            return (
                              <li
                                key={step.id}
                                className="flex items-start gap-2 text-body leading-6 text-slate-600 dark:text-slate-300"
                              >
                                {stepDone ? (
                                  <Check aria-hidden className="mt-1 size-3.5 shrink-0 text-slate-400" />
                                ) : (
                                  <span
                                    aria-hidden
                                    className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600"
                                  />
                                )}
                                <span className={cx(stepDone && "text-slate-400 dark:text-slate-500")}>
                                  {step.name}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {continuous.length > 0 && (
        <section className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h4 className="text-caption font-semibold text-slate-500 dark:text-slate-400">
            خدمات دائمة
          </h4>
          {/* ولا ترتيبَ لها ولا تقدّم: تعمل أو لا تعمل — فشارةُ حالٍ تكفي. */}
          <ul className="flex flex-wrap gap-1.5">
            {continuous.map((stage) => (
              <li key={stage.id}>
                <Badge tone={stage.isActive ? "good" : "neutral"}>{stage.name}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
