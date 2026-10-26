"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/console/layout";
import { charityCrumbs } from "@/lib/crumbs";
import type { Crumb } from "@/components/console/layout";

/**
 * ترويسة أقسام الاستراتيجية.
 *
 * الـlayout واحدٌ لكل صفحات القسم، فكان العنوان «الاستراتيجية» ثابتاً أينما
 * كنت. وهنا يُقرأ ما بعد اسم الجمعية من الرابط فيصير العنوان والحلقة الأخيرة
 * اسم الصفحة الحالية.
 *
 * وبعد أن صار القسم طبقتين (مربّعاتٌ ثم صفحات) صار المسار ثلاث حلقات: القسم،
 * فالمربّع، فالصفحة — وكلُّ أبٍ رابطٌ يُعاد إليه، كما في إدارة الموظفين
 * والصلاحيات.
 */
type Section = { title: string; description: string; parent?: string };

const SECTIONS: Record<string, Section> = {
  "": {
    title: "الاستراتيجية",
    description: "حالة الخطة الاستراتيجية للجمعية وأقسامها.",
  },

  analysis: {
    title: "التحليل الاستراتيجي",
    description: "جاهزية الجمعية للتخطيط، وتحليل بيئتها الداخلية والخارجية.",
  },
  "analysis/readiness": {
    title: "استبيان الجاهزية",
    description: "نتائج استبيان الجاهزية للجمعية ومتوسط درجاتها.",
    parent: "analysis",
  },
  "analysis/hexagonal": {
    title: "التحليل السداسي",
    description: "نقاط القوة والضعف والفرص والتهديدات كما رآها المشاركون.",
    parent: "analysis",
  },

  direction: {
    title: "بناء التوجه الاستراتيجي",
    description: "رؤية الجمعية ورسالتها وقيمها والأثر الذي تقصده.",
  },
  "direction/vision-mission": {
    title: "استبيان الرؤية",
    description: "ردود استبيان الرؤية والرسالة والأثر وتحليلها.",
    parent: "direction",
  },

  objectives: {
    title: "دليل الأهداف والمؤشرات",
    description: "الأبعاد والأهداف ومؤشرات الأداء ومتابعتها.",
  },
  "objectives/guide": {
    title: "الدليل",
    description: "الوثيقة المعتمدة: تعريف كل هدفٍ ومؤشرٍ ووحدته ومعادلته ودوريته.",
    parent: "objectives",
  },
  "objectives/tracking": {
    title: "متابعة الأداء",
    description: "مستهدفات الأرباع ومتحققها، وأداء الهدف والمحور والجمعية.",
    parent: "objectives",
  },
  "objectives/dashboard": {
    title: "لوحة المعلومات",
    description: "نتيجة الأداء العام وتوزيع حالات المؤشرات.",
    parent: "objectives",
  },

  operational: {
    title: "الخطة التشغيلية",
    description: "مبادرات الجمعية وخطواتها ومخطّطها الزمني وموازنتها.",
  },
  "operational/initiatives": {
    title: "كشاف المبادرات",
    description: "المبادرات ومدّتها ومديرها وموازنتها ونسبة إنجازها.",
    parent: "operational",
  },
  "operational/dashboard": {
    title: "لوحة معلومات المبادرات",
    description: "حالات المبادرات ومؤشرات الإدارات ونسب الصرف.",
    parent: "operational",
  },

  stages: {
    title: "مراحل الخطة",
    description: "المراحل الزمنية لخدمة التخطيط الاستراتيجي.",
  },
  report: {
    title: "التقرير الاستراتيجي",
    description: "تفاصيل الأداء الاستراتيجي في تقريرٍ واحد قابلٍ للطباعة.",
  },
};

export default function StrategyHeader({ charityName }: { charityName: string }) {
  const pathname = usePathname();
  const base = `/main/strategy/${encodeURIComponent(charityName)}`;
  // الرابط قد يصل مُرمَّزاً أو لا — نقارن ما بعد اسم الجمعية فقط.
  const tail = decodeURIComponent(pathname).split("/").slice(4).join("/");
  const key = tail in SECTIONS ? tail : "";
  const section = SECTIONS[key];

  const trail: Crumb[] = [
    // في الصفحة الجامعة «الاستراتيجية» هي المفتوحة — فلا رابط إلى المكان ذاته.
    { label: "الاستراتيجية", href: key === "" ? undefined : base },
  ];

  if (section.parent) {
    const parent = SECTIONS[section.parent];
    if (parent) trail.push({ label: parent.title, href: `${base}/${section.parent}` });
  }
  if (key !== "") trail.push({ label: section.title });

  return (
    <PageHeader
      crumbs={charityCrumbs(charityName, ...trail)}
      title={section.title}
      description={section.description}
    />
  );
}
