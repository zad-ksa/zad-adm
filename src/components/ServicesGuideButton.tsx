"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import Accordion from "@/components/console/Accordion";
import { EmptyState } from "@/components/console/layout";
import { Badge, btn } from "@/components/console/ui";
import ServiceStages from "@/components/ServiceStages";
import {
  SERVICE_STATE_LABEL,
  groupStages,
  serviceProgress,
  serviceStateOf,
  type ServiceStage,
} from "@/lib/serviceStages";

type TimelineSection = {
  title: string;
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
 * «دليل الخدمات»: كلُّ خدمةٍ ومراحلُها وخطواتُها في نافذةٍ واحدة.
 *
 * **وهو غيرُ الصفحة**: الصفحةُ تقول أين بلغت كلُّ خدمةٍ الآن، وهذا مرجعٌ
 * يُفتح ليُقرأ كاملاً — المراحلُ كلُّها لا الحاليّةُ وحدَها.
 *
 * **والخدمةُ تُطوى**: تسعُ خدماتٍ في كلٍّ منها سبعُ مراحلَ وفي كلِّ مرحلةٍ
 * خطواتُها، فنافذةٌ تعرضها مفتوحةً لا تُقرأ. وأولاها مفتوحةٌ كي لا تُفتح
 * النافذةُ على عناوينَ مغلقةٍ كلِّها.
 *
 * **ويُقرأ عند زادٍ وعند الجمعية**: هي نافذةٌ واحدةٌ لشاشتين — صفحةُ خدمات
 * الجمعية في البوّابة، وصفحةُ الخدمات عند موظّف زاد.
 */
export default function ServicesGuideButton({ sections }: { sections: TimelineSection[] }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<string | null>(null);

  const filled = sections.filter((s) => s.stages.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShown(filled[0]?.title ?? null);
          setOpen(true);
        }}
        className={btn.secondary}
      >
        <BookOpen className="size-4" />
        دليل الخدمات
      </button>

      {open && (
        <Dialog
          size="2xl"
          icon={<BookOpen className="size-5" />}
          title="دليل الخدمات"
          description="مراحل كل خدمة وخطواتها كاملة."
          onClose={() => setOpen(false)}
          closeOnBackdrop
        >
          {filled.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="size-4" />}
              title="لا خدمات مسجلة"
              description="لم تسند لهذه الجمعية خدمات ذات مراحل بعد."
            />
          ) : (
            <div className="space-y-2.5">
              {filled.map((section) => {
                const state = serviceStateOf(section);
                const { total } = serviceProgress(section.stages);
                const { continuous } = groupStages(section.stages);
                return (
                  <Accordion
                    key={section.title}
                    open={shown === section.title}
                    onToggle={() => setShown(shown === section.title ? null : section.title)}
                    meta={total > 0 ? `${total} مراحل` : `${continuous.length} دائمة`}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-title font-semibold text-slate-900 dark:text-slate-100">
                          {section.title}
                        </span>
                        <Badge tone={STATE_TONE[state]}>{SERVICE_STATE_LABEL[state]}</Badge>
                      </span>
                    }
                  >
                    <ServiceStages stages={section.stages} />
                  </Accordion>
                );
              })}
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
