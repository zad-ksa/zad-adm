import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Briefcase } from "lucide-react";
import ServicesTimelineViewer from "@/components/ServicesTimelineViewer";
import ServicesPrintButton from "@/components/ServicesPrintButton";
import ServicesGuideButton from "@/components/ServicesGuideButton";
import { getTimelineConfigs } from "@/app/actions/settings";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | الخدمات`,
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
  });

  if (!charity) {
    return <div>الجمعية غير موجودة</div>;
  }

  const allServices = await prisma.service.findMany({
    where: { charityId: charity.id },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: { steps: { orderBy: { order: 'asc' } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const strategicService = allServices.find(s => s.department === "STRATEGY");
  const governanceService = allServices.find(s => s.department === "GOVERNANCE");
  const financeService = allServices.find(s => s.department === "FINANCE");

  const strategicStages = strategicService?.stages || [];
  const governanceStages = governanceService?.stages || [];
  const financeStages = financeService?.stages || [];

  const customServices = allServices.filter(s => !["STRATEGY", "GOVERNANCE", "FINANCE"].includes(s.department || ""));

  const timelineNames = await getTimelineConfigs();
  const strategyName = timelineNames["STRATEGY"] || "المخطط الزمني للتخطيط الاستراتيجي";
  const governanceName = timelineNames["GOVERNANCE"] || "المخطط الزمني للحوكمة";
  const financeName = timelineNames["FINANCE"] || "المخطط الزمني للمالية";

  const formattedServices = [
    ...(strategicService ? [{ ...strategicService, name: strategyName }] : []),
    ...(governanceService ? [{ ...governanceService, name: governanceName }] : []),
    ...(financeService ? [{ ...financeService, name: financeName }] : []),
    ...customServices
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-transparent border-b border-slate-200 dark:border-slate-800 pb-6 mb-8 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-primary dark:text-primary tracking-tight" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
                المخططات والمراحل الزمنية
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                متابعة المراحل الزمنية لجمعية <span className="font-semibold text-slate-700 dark:text-slate-300">{decodedName}</span> لمختلف الأقسام.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <ServicesPrintButton
              charityName={decodedName}
              sections={[
                ...(strategicStages.length > 0 ? [{ title: strategyName, stages: strategicStages }] : []),
                ...(governanceStages.length > 0 ? [{ title: governanceName, stages: governanceStages }] : []),
                ...(financeStages.length > 0 ? [{ title: financeName, stages: financeStages }] : []),
                ...customServices.map(svc => ({ title: svc.name, stages: svc.stages })),
              ]}
            />
            <ServicesGuideButton
              sections={[
                ...(strategicStages.length > 0 ? [{ title: strategyName, stages: strategicStages }] : []),
                ...(governanceStages.length > 0 ? [{ title: governanceName, stages: governanceStages }] : []),
                ...(financeStages.length > 0 ? [{ title: financeName, stages: financeStages }] : []),
                ...customServices.map(svc => ({ title: svc.name, stages: svc.stages })),
              ]}
            />
          </div>
        </div>
      </div>

      <div>
        <ServicesTimelineViewer 
          services={formattedServices}
          charityName={decodedName}
        />
      </div>
    </div>
  );
}
