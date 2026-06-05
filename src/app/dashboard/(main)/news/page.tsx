import { prisma } from "@/lib/db";
import { getCharities } from "@/app/actions/charity";
import type { Metadata } from "next";
import NewsFilterClient from "./NewsFilterClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آخر الأخبار والإنجازات | زاد التنموية",
  description: "عرض وتصفية آخر أخبار وإنجازات الجمعيات المتعاقد معها",
};

export default async function NewsDashboard() {
  const charities = await getCharities();
  const performanceMetrics = await prisma.performanceMetric.findMany();

  // Helper to parse values to number
  const parseValueToNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const str = String(val).trim();
    if (!str) return 0;
    if (str.endsWith("%")) {
      const num = parseFloat(str.replace("%", ""));
      return isNaN(num) ? 0 : num;
    }
    const num = parseFloat(str.replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  // Fetch news from the database
  const dbNewsItems = await prisma.news.findMany({
    orderBy: { createdAt: "desc" },
  });

  const formattedDbNews = dbNewsItems.map((news) => {
    const charity = charities.find((c) => c.name.trim().toLowerCase() === news.charityName.trim().toLowerCase());
    return {
      id: news.id,
      charityId: charity?.id || "unknown",
      charityName: news.charityName,
      title: news.title,
      category: news.category,
      description: news.description || "",
      rawDate: news.createdAt.toISOString(),
      date: new Date(news.createdAt).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    };
  });

  // Compile news items dynamically
  const mockNewsItems = charities.map((charity, index) => {
    const newsTemplates = [
      {
        title: "إطلاق الخطة الاستراتيجية الخمسية الجديدة",
        category: "الاستراتيجية",
        description: "أنهت الجمعية بنجاح إطلاق خطتها الاستراتيجية الخمسية المحدثة بالتعاون الفني مع شركة زاد التنموية، للتحول نحو الأثر المستدام.",
        dateOffset: 2, // 2 days ago
      },
      {
        title: "تجاوز المستهدف الربعي لأعداد المستفيدين",
        category: "الإعلامية",
        description: "أعلنت الجمعية اليوم عن تجاوز المستهدفات الربعية لبرامجها التنموية والمبادرات الشبابية المنفذة بنسبة فاقت التوقعات.",
        dateOffset: 4, // 4 days ago
      },
      {
        title: "توقيع اتفاقية منح ودعم تنموي جديدة",
        category: "تنمية الموارد",
        description: "وقّعت الجمعية اتفاقية تمويلية جديدة لبرامج التدريب والتأهيل التخصصي، مما يضمن استمرارية خدماتها للفترات القادمة.",
        dateOffset: 6, // 6 days ago
      },
      {
        title: "اعتماد معايير الحوكمة والشفافية بنسبة 95%",
        category: "الاستراتيجية",
        description: "حققت الجمعية تقييماً متقدماً في تطبيق أدلة وسياسات الحوكمة والعمل المؤسسي المعتمدة، مما يعزز الموثوقية لدى المانحين.",
        dateOffset: 9, // 9 days ago
      },
      {
        title: "بدء تحليل مقاييس الأداء للمشاريع المشتركة",
        category: "التقنية",
        description: "انطلقت ورشة عمل مكثفة لتحليل ومراجعة مؤشرات أداء المشاريع التنموية بالشراكة مع مستشاري زاد لرصد الأثر الفعلي.",
        dateOffset: 12, // 12 days ago
      }
    ];

    const template = newsTemplates[index % newsTemplates.length];
    const date = new Date();
    date.setDate(date.getDate() - template.dateOffset - (Math.floor(index / newsTemplates.length) * 5));
    
    return {
      id: `${charity.id}-news`,
      charityId: charity.id,
      charityName: charity.name,
      title: template.title,
      category: template.category,
      description: template.description,
      rawDate: date.toISOString(), // for sorting/filtering
      date: date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    };
  });

  const newsItems = [...formattedDbNews, ...mockNewsItems].sort(
    (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
  );

  return (
    <NewsFilterClient charities={charities} initialNewsItems={newsItems} />
  );
}
