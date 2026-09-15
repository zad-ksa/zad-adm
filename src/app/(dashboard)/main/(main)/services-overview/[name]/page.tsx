import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getEmployeeServiceNames } from "@/app/actions/serviceAccess";
import { Briefcase } from "lucide-react";
import GenericStagesManager from "@/components/GenericStagesManager";
import CharityClientTimeline from "@/components/CharityClientTimeline";
import ServicesManagerClient from "@/components/ServicesManagerClient";
import ServicesGuideButton from "@/components/ServicesGuideButton";
import { ServiceAccordionProvider } from "@/components/ServiceAccordionContext";

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

  // مسار الجمعية لا بوابة عليه: كل من سجّل الدخول يصل الصفحة. فالمنح هنا
  // صريحٌ لا ضمني — عكس «عرض الخدمات» حيث غياب المنح يعني بلا تقييد في
  // العرض، لأن ذاك التبويب محجوبٌ بصلاحية وبنطاق الجمعيات المسنَدة.
  //
  // وكان هنا isAdmin = مدير النظام || manage_services، يفتح مُدير المراحل
  // واللوحة لكل خدمات الجمعية. حُذف ذلك «الوصول لجميع الخدمات» للجميع ومنهم
  // مدير النظام: مراحل الخدمة وتعميمها يتبعان منحها وحده، وإضافة خدمةٍ جديدة
  // لـmanage_services.
  const grantedNames = session?.id ? (await getEmployeeServiceNames(session.id)) ?? [] : [];
  // «إدارة الخدمات»: إضافة خدمة، وتعديل اسمها، وحذفها من هذه الجمعية.
  const canManageServices = hasPermission(session?.role || "", session?.permissions || [], "manage_services");

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

  // ما يعدّل مراحله الموظف ويعمّمها: خدمات هذه الجمعية الممنوحة له.
  const grantedServices = allServices.filter((svc) => grantedNames.includes(svc.name));

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

            <ServicesGuideButton
              sections={allServices.map(svc => ({ title: svc.name, stages: svc.stages }))}
            />
          </div>
        </div>
      </div>

      <ServicesManagerClient
        charityId={charity.id}
        unifiableServices={grantedServices}
        canAddService={canManageServices}
      />

      <ServiceAccordionProvider>
        {grantedServices.map(service => (
          <GenericStagesManager
            key={service.id}
            service={service}
            canManageService={canManageServices}
          />
        ))}
      </ServiceAccordionProvider>
    </div>
  );
}
