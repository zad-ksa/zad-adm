import type { Metadata } from "next";
import Header from "@/components/Header";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const isHexagonal = resolvedSearchParams.type === "hexagonal";
  return {
    title: isHexagonal ? "التحليل السداسي | زاد التنموية" : "استبيان الجاهزية | زاد التنموية",
  };
}

export default async function Results({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const isHexagonal = resolvedSearchParams.type === "hexagonal";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-50">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />

      <Header disableLink={true} title={isHexagonal ? "التحليل السداسي" : "استبيان الجاهزية"} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-12 flex flex-col items-center justify-center z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-2xl w-full rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">

          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary via-secondary to-primary" />

          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            {isHexagonal ? "تم إرسال التحليل بنجاح" : "تم إرسال التقييم بنجاح"}
          </h1>

          <p className="text-slate-600 text-lg leading-relaxed mb-10 max-w-md mx-auto">
            {isHexagonal ? (
              <>
                شكراً لوقتكم في تعبئة التحليل السداسي.
                <br />
                تم استلام بيانات جمعيتكم بنجاح، وسيقوم فريق المختصين في <strong>شركة زاد التنموية</strong> بمراجعة وتحليل الإجابات بدقة، وسيتم التواصل معكم قريباً لتحديد اجتماع لمناقشة النتائج.
              </>
            ) : (
              <>
                شكراً لوقتكم في تعبئة استبيان جاهزية التخطيط الاستراتيجي.
                <br />
                تم استلام بيانات جمعيتكم بنجاح، وسيقوم فريق المختصين في <strong>شركة زاد التنموية</strong> بمراجعة وتقييم الإجابات بدقة، وسيتم التواصل معكم قريباً لتحديد اجتماع لمناقشة النتائج.
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
