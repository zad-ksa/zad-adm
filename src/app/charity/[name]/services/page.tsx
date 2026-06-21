import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Briefcase } from "lucide-react";
import StrategicStagesManager from "../strategy/StrategicStagesManager";
import GovernanceStagesManager from "../governance/GovernanceStagesManager";
import FinanceStagesManager from "../finance/FinanceStagesManager";
import GenericStagesManager from "@/components/GenericStagesManager";
import CharityClientTimeline from "@/components/CharityClientTimeline";
import ServicesManagerClient from "@/components/ServicesManagerClient";

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
  const isCharityClient = session?.role === "CHARITY_CLIENT";
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session?.role || "");

  let strategicStages: any[] = [];
  let governanceStages: any[] = [];
  let financeStages: any[] = [];
  
  if (isAdmin || session?.role === "STRATEGY" || isCharityClient) {
    strategicStages = await prisma.strategicStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' }
    });
  }
  if (isAdmin || session?.role === "GOVERNANCE" || isCharityClient) {
    governanceStages = await prisma.governanceStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' }
    });
  }
  if (isAdmin || session?.role === "FINANCE" || isCharityClient) {
    financeStages = await prisma.financeStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' }
    });
  }

  const additionalServices = await prisma.service.findMany({
    where: { charityId: charity.id },
    include: {
      stages: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 text-center py-8">
          <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-6 shadow-sm">
            <Briefcase className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
            المخططات والمراحل الزمنية
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed text-lg">
            متابعة المخططات والمراحل الزمنية الخاصة بجمعية <span className="font-bold text-slate-700 dark:text-slate-300">{decodedName}</span> لمختلف الأقسام وإدارتها من مكان واحد.
          </p>
        </div>
      </div>

      {!isCharityClient && (
        <ServicesManagerClient 
          charityId={charity.id} 
          initialServices={additionalServices} 
          isAdmin={isAdmin}
        />
      )}

      {isCharityClient ? (
        <div className="space-y-8">
          <CharityClientTimeline title={charity.strategyTimelineName || "المخطط الزمني للتخطيط الاستراتيجي"} stages={strategicStages} />
          <CharityClientTimeline title={charity.governanceTimelineName || "المخطط الزمني للحوكمة"} stages={governanceStages} />
          <CharityClientTimeline title={charity.financeTimelineName || "المخطط الزمني للمالية"} stages={financeStages} />
          {additionalServices.map(service => (
            <CharityClientTimeline key={service.id} title={service.name} stages={service.stages} />
          ))}
        </div>
      ) : (
        <>
          {(isAdmin || session?.role === (charity.strategyTimelineDept || "STRATEGY")) && (
            <StrategicStagesManager 
              charityId={charity.id} 
              initialStages={strategicStages}
              timelineName={charity.strategyTimelineName || "المخطط الزمني للتخطيط الاستراتيجي"}
              timelineDept={charity.strategyTimelineDept || "STRATEGY"}
            />
          )}
          {(isAdmin || session?.role === (charity.governanceTimelineDept || "GOVERNANCE")) && (
            <GovernanceStagesManager 
              charityId={charity.id} 
              initialStages={governanceStages} 
              timelineName={charity.governanceTimelineName || "المخطط الزمني للحوكمة"}
              timelineDept={charity.governanceTimelineDept || "GOVERNANCE"}
            />
          )}
          {(isAdmin || session?.role === (charity.financeTimelineDept || "FINANCE")) && (
            <FinanceStagesManager 
              charityId={charity.id} 
              initialStages={financeStages} 
              timelineName={charity.financeTimelineName || "المخطط الزمني للمالية"}
              timelineDept={charity.financeTimelineDept || "FINANCE"}
            />
          )}
          
          {additionalServices.map(service => (
            (isAdmin || session?.role === service.department) && (
               <GenericStagesManager 
                 key={service.id}
                 service={service}
               />
            )
          ))}
        </>
      )}
    </div>
  );
}
