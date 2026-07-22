import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Briefcase } from "lucide-react";
import StrategicStagesManager from "@/app/(dashboard)/main/(main)/strategy/[name]/StrategicStagesManager";
import GovernanceStagesManager from "@/app/(dashboard)/main/(main)/governance/[name]/GovernanceStagesManager";
import FinanceStagesManager from "@/app/(dashboard)/main/(main)/finance/[name]/FinanceStagesManager";
import GenericStagesManager from "@/components/GenericStagesManager";
import CharityClientTimeline from "@/components/CharityClientTimeline";
import ServicesManagerClient from "@/components/ServicesManagerClient";
import ServicesPrintButton from "@/components/ServicesPrintButton";
import ServicesGuideButton from "@/components/ServicesGuideButton";
import { ServiceAccordionProvider } from "@/components/ServiceAccordionContext";
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

  const session = await getSession();
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session?.role || "");

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

  let strategicStages: any[] = [];
  let governanceStages: any[] = [];
  let financeStages: any[] = [];
  
  if (isAdmin || session?.role === "STRATEGY") {
    strategicStages = strategicService?.stages || [];
  }
  if (isAdmin || session?.role === "GOVERNANCE") {
    governanceStages = governanceService?.stages || [];
  }
  if (isAdmin || session?.role === "FINANCE") {
    financeStages = financeService?.stages || [];
  }

  const customServices = allServices.filter(s => !["STRATEGY", "GOVERNANCE", "FINANCE"].includes(s.department || ""));

  const timelineNames = await getTimelineConfigs();
  const strategyName = timelineNames["STRATEGY"] || "المخطط الزمني للتخطيط الاستراتيجي";
  const governanceName = timelineNames["GOVERNANCE"] || "المخطط الزمني للحوكمة";
  const financeName = timelineNames["FINANCE"] || "المخطط الزمني للمالية";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 w-40 h-40 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center text-primary shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              المخططات والمراحل الزمنية
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              متابعة المراحل الزمنية لجمعية <span className="font-bold text-slate-700 dark:text-slate-300">{decodedName}</span> لمختلف الأقسام.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
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

      <ServicesManagerClient 
        charityId={charity.id} 
        initialServices={customServices} 
        isAdmin={isAdmin}
        strategyTimelineName={strategyName}
        governanceTimelineName={governanceName}
        financeTimelineName={financeName}
      />

      <ServiceAccordionProvider>
        {(isAdmin || session?.role === (charity.strategyTimelineDept || "STRATEGY")) && (
          <StrategicStagesManager 
            charityId={charity.id} 
            initialStages={strategicStages}
            timelineName={strategyName}
            timelineDept={charity.strategyTimelineDept || "STRATEGY"}
          />
        )}
        {(isAdmin || session?.role === (charity.governanceTimelineDept || "GOVERNANCE")) && (
          <GovernanceStagesManager
            charityId={charity.id}
            initialStages={governanceStages}
            timelineName={governanceName}
            timelineDept={charity.governanceTimelineDept || "GOVERNANCE"}
          />
        )}
        {(isAdmin || session?.role === (charity.financeTimelineDept || "FINANCE")) && (
          <FinanceStagesManager
            charityId={charity.id}
            initialStages={financeStages}
            timelineName={financeName}
            timelineDept={charity.financeTimelineDept || "FINANCE"}
          />
        )}
        
        {customServices.map(service => (
          (isAdmin || session?.role === service.department) && (
             <GenericStagesManager 
               key={service.id}
               service={service}
             />
          )
        ))}
      </ServiceAccordionProvider>
    </div>
  );
}
