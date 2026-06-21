import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Briefcase } from "lucide-react";
import StrategicStagesManager from "../strategy/StrategicStagesManager";
import GovernanceStagesManager from "../governance/GovernanceStagesManager";
import FinanceStagesManager from "../finance/FinanceStagesManager";
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
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER"].includes(session?.role || "");

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
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 text-center py-8">
          <div className="w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-6 shadow-sm">
            <Briefcase className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
            المخططات والمراحل الزمنية
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed text-lg">
            متابعة المخططات والمراحل الزمنية الخاصة بجمعية <span className="font-bold text-slate-700 dark:text-slate-300">{decodedName}</span> للخطط الاستراتيجية، الحوكمة، والمالية.
          </p>
        </div>
      </div>

      {isCharityClient ? (
        <div className="space-y-8">
          <CharityClientTimeline title={charity.strategyTimelineName || "المخطط الزمني للتخطيط الاستراتيجي"} stages={strategicStages} />
          <CharityClientTimeline title={charity.governanceTimelineName || "المخطط الزمني للحوكمة"} stages={governanceStages} />
          <CharityClientTimeline title={charity.financeTimelineName || "المخطط الزمني للمالية"} stages={financeStages} />
          {/* Dynamic services for charity client */}
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
          
          {(isAdmin || additionalServices.length > 0) && (
            <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-700">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  مخططات زمنية إضافية مخصصة
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  يمكنك إضافة مخططات زمنية إضافية للجمعية من هنا وربطها بالأقسام.
                </p>
              </div>
              <ServicesManagerClient 
                charityId={charity.id} 
                initialServices={additionalServices} 
                isAdmin={isAdmin}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
