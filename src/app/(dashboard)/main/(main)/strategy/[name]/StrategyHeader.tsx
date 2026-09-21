"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/console/layout";
import { charityCrumbs } from "@/lib/crumbs";

/**
 * ترويسة أقسام الاستراتيجية.
 *
 * الـlayout واحدٌ لستّ صفحات، فكان العنوان «الاستراتيجية» ثابتاً أينما كنت،
 * والمسار لا يقول أيّ صفحةٍ فتحت. هنا يُقرأ آخر جزءٍ من الرابط فيصير العنوان
 * والحلقة الأخيرة اسم الصفحة الحالية — بأسمائها في القائمة الجانبية نفسها.
 */
const SECTIONS: Record<string, { title: string; description: string }> = {
  "": {
    title: "استبيان الجاهزية",
    description: "نتائج استبيان الجاهزية للجمعية ومتوسط درجاتها.",
  },
  "vision-mission": {
    title: "استبيان الرؤية",
    description: "ردود استبيان الرؤية والرسالة والقيم وتحليلها.",
  },
  hexagonal: {
    title: "التحليل السداسي",
    description: "نقاط القوة والضعف والفرص والتهديدات كما رآها المشاركون.",
  },
  performance: {
    title: "مقياس الأداء",
    description: "مؤشرات الأداء الاستراتيجي للجمعية.",
  },
  report: {
    title: "التقرير الاستراتيجي",
    description: "تفاصيل الأداء الاستراتيجي في تقريرٍ واحد قابلٍ للطباعة.",
  },
  stages: {
    title: "مراحل الخطة",
    description: "المراحل الزمنية لخدمة التخطيط الاستراتيجي.",
  },
};

export default function StrategyHeader({ charityName }: { charityName: string }) {
  const pathname = usePathname();
  const base = `/main/strategy/${encodeURIComponent(charityName)}`;
  // الرابط قد يصل مُرمَّزاً أو لا — نقارن آخر جزءٍ بعد اسم الجمعية فقط.
  const tail = decodeURIComponent(pathname).split("/").slice(4).join("/");
  const section = SECTIONS[tail] ?? SECTIONS[""];
  const isIndex = !tail || !SECTIONS[tail];

  return (
    <PageHeader
      crumbs={charityCrumbs(
        charityName,
        // في الصفحة الأولى «الاستراتيجية» هي نفسها المفتوحة — فلا رابط إلى المكان ذاته.
        { label: "الاستراتيجية", href: isIndex ? undefined : base },
        { label: section.title }
      )}
      title={section.title}
      description={section.description}
    />
  );
}
