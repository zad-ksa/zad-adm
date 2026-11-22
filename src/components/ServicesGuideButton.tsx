"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import Accordion from "@/components/console/Accordion";
import { EmptyState } from "@/components/console/layout";
import { btn } from "@/components/console/ui";
import ServiceStages from "@/components/ServiceStages";
import { groupStages, type ServiceStage } from "@/lib/serviceStages";

type TimelineSection = {
  title: string;
  stages: ServiceStage[];
};

/**
 * «دليل الخدمات»: كلُّ خدمةٍ ومراحلُها وخطواتُها في نافذةٍ واحدة.
 *
 * **وهو غيرُ الصفحة**: الصفحةُ تقول أين بلغت كلُّ خدمةٍ الآن، وهذا يقول
 * ما هي الخدمة — مراحلُها وخطواتُها كما وُضعت.
 *
 * **ولا تقدّمَ فيه ولا حال**: لا شريطَ ولا شارةَ «جارية» ولا خطٌّ على ما
 * أُنجز. وهو مرجعٌ يُقرأ ليُعرف ما تشمله الخدمة، وجوابُ «أين نحن» في
 * الشاشة خلفَه — ولو قاله الاثنان لتكرّر الخبرُ واختلف.
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
                const { sequential, continuous } = groupStages(section.stages);
                return (
                  <Accordion
                    key={section.title}
                    open={shown === section.title}
                    onToggle={() => setShown(shown === section.title ? null : section.title)}
                    meta={
                      sequential.length > 0
                        ? `${sequential.length} مراحل`
                        : `${continuous.length} خدمات دائمة`
                    }
                    title={
                      <span className="text-title font-semibold text-slate-900 dark:text-slate-100">
                        {section.title}
                      </span>
                    }
                  >
                    <ServiceStages stages={section.stages} variant="reference" />
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
