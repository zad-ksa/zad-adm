import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import SurveyLinkManager from "@/components/SurveyLinkManager";
import StrategyPermissionToggle from "@/components/StrategyPermissionToggle";
import VisionMissionResultsClient from "./VisionMissionResultsClient";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - الرؤية والرسالة والأثر | زاد التنموية`,
  };
}

export default async function VisionMissionDashboardPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const session = await getSession();
  const isStrategyTeam = session?.role === "STRATEGY";
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER"].includes(session?.role || "");

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
  });

  if (!charity) {
    return <div className="p-8 text-center text-red-500 font-bold">الجمعية غير موجودة</div>;
  }

  // Fetch all responses for this charity
  const responses = await prisma.visionMissionResponse.findMany({
    where: { charityId: charity.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Settings / Link Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        <div className="lg:col-span-2">
          <SurveyLinkManager charityName={decodedName} surveyType="VISION_MISSION" />
        </div>
        <div>
          {charity && (
            <StrategyPermissionToggle
              charityName={decodedName}
              type="vision-mission"
              initialState={charity.isVisionMissionVisible}
              label="إظهار النتائج للجمعية"
              description="تفعيل هذا الخيار سيسمح لممثلي الجمعية بالاطلاع على تقرير الرؤية والرسالة والأثر في لوحة التحكم الخاصة بهم."
            />
          )}
        </div>
      </div>

      {/* Results Client Component */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm transition-colors">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              نتائج استبيان الرؤية والرسالة والأثر
            </h2>
            <p className="text-xs text-slate-500 mt-1">تجميع وتحليل مرئيات المشاركين حول صياغة التوجه الاستراتيجي للجمعية</p>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Sparkles className="w-12 h-12 text-slate-350 dark:text-slate-600 mx-auto mb-4 animate-pulse" />
            <p className="font-bold text-lg text-slate-700 dark:text-slate-300">لم يقم أي مشارك بتعبئة الاستبيان بعد</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">يمكنك مشاركة الرابط أعلاه مع الموظفين وأعضاء مجلس الإدارة لجمع مشاركاتهم وتطلعاتهم.</p>
          </div>
        ) : (
          <VisionMissionResultsClient responses={responses} />
        )}
      </div>

    </div>
  );
}
