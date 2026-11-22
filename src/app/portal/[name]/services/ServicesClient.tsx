"use client";

import { useState } from "react";
import { Briefcase } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { EmptyState, StatStrip } from "@/components/console/layout";
import { Badge, EntityCard, cx } from "@/components/console/ui";
import ServiceStages from "@/components/ServiceStages";
import {
  SERVICE_STATE_LABEL,
  currentStage,
  currentStep,
  groupStages,
  isComingSoon,
  serviceProgress,
  serviceStateOf,
  type ServiceStage,
} from "@/lib/serviceStages";

export type PortalService = {
  id: string;
  name: string;
  /** علَمُ زادٍ على الخدمة نفسِها: أُسندت ولمّا تُبدأ. */
  isComingSoon?: boolean;
  stages: ServiceStage[];
};

const STATE_TONE = {
  RUNNING: "brand",
  DONE: "good",
  SOON: "warn",
  EMPTY: "neutral",
} as const;

/**
 * خدماتُ الجمعية: أين بلغت كلُّ واحدةٍ منها الآن.
 *
 * **والبطاقةُ جوابُ سؤالٍ واحد**: «ما الذي يجري في هذه الخدمة اليوم؟» —
 * مرحلتُها وخطوتُها وكم أنجزت من مسارها. وما وراء ذلك في «دليل الخدمات».
 *
 * **ونقرةُ البطاقة تفتح مراحلَها** بالشكل الذي يعرضها به الدليلُ نفسُه: كان
 * لها شكلان مكتوبان مرّتين، يختلفان في الألوان وفي ترتيب المراحل.
 */
export default function ServicesClient({ services }: { services: PortalService[] }) {
  const [opened, setOpened] = useState<PortalService | null>(null);

  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="size-4" />}
        title="لا خدمات متاحة"
        description="لم تسند لجمعيتك خدمات بعد، أو لا صلاحية لك في خدمة من خدماتها."
      />
    );
  }

  const stages = services.flatMap((s) => s.stages);
  const sequential = groupStages(stages).sequential.length;
  const doneStages = services.reduce((sum, s) => sum + serviceProgress(s.stages).done, 0);
  const activePermanent = groupStages(stages).continuous.filter((s) => s.isActive).length;

  return (
    <>
      <StatStrip
        items={[
          { label: "الخدمات", value: services.length },
          { label: "المراحل", value: sequential },
          // ولا نقطةَ خضراءُ على رقمٍ لا يقول حالاً: الأخضرُ هنا «أنجز».
          { label: "أنجز منها", value: doneStages, dot: doneStages > 0 ? "active" : "muted" },
          ...(activePermanent > 0
            ? [{ label: "خدمات دائمة نشطة", value: activePermanent, dot: "active" as const }]
            : []),
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const state = serviceStateOf(service);
          const here = currentStage(service.stages);
          const step = currentStep(service.stages);
          const { done, total, percent } = serviceProgress(service.stages);
          const permanent = groupStages(service.stages).continuous.filter((s) => s.isActive);

          return (
            <EntityCard
              key={service.id}
              onClick={() => setOpened(service)}
              media={<Briefcase className="size-4 text-primary dark:text-teal-300" />}
              title={service.name}
              badge={<Badge tone={STATE_TONE[state]}>{SERVICE_STATE_LABEL[state]}</Badge>}
              body={
                <span className="flex flex-col gap-2.5">
                  {here ? (
                    <>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-caption text-slate-400">المرحلة الحالية</span>
                        <span
                          className={cx(
                            "text-body font-medium",
                            isComingSoon(here)
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-800 dark:text-slate-200"
                          )}
                        >
                          {here.name}
                        </span>
                      </span>

                      {step && (
                        <span className="flex flex-col gap-0.5">
                          <span className="text-caption text-slate-400">الخطوة الحالية</span>
                          <span className="text-body text-slate-600 dark:text-slate-300">
                            {step.name}
                          </span>
                        </span>
                      )}

                      {total > 0 && (
                        <span className="block h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <span
                            className="block h-full rounded-full bg-primary dark:bg-teal-400"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                      )}
                    </>
                  ) : permanent.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {permanent.map((s) => (
                        <Badge key={s.id} tone="good">
                          {s.name}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    <span className="text-body text-slate-400">لا مراحل مسجلة بعد</span>
                  )}
                </span>
              }
              stats={total > 0 ? [{ label: "المراحل", value: `${done}/${total}` }] : undefined}
            />
          );
        })}
      </div>

      {opened && (
        <Dialog
          size="2xl"
          icon={<Briefcase className="size-5" />}
          title={opened.name}
          description="مراحل الخدمة وخطواتها."
          onClose={() => setOpened(null)}
          closeOnBackdrop
        >
          <ServiceStages stages={opened.stages} />
        </Dialog>
      )}
    </>
  );
}
