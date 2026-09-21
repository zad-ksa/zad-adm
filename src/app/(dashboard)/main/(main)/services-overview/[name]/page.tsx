import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getEmployeeServiceNames } from "@/app/actions/serviceAccess";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/console/layout";
import { charityCrumbs } from "@/lib/crumbs";
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
      <PageHeader
        crumbs={charityCrumbs(decodedName)}
        icon={<Briefcase className="w-6 h-6" />}
        title={decodedName}
        description="المخططات والمراحل الزمنية للجمعية في مختلف الأقسام."
        actions={
          <ServicesGuideButton
            sections={allServices.map(svc => ({ title: svc.name, stages: svc.stages }))}
          />
        }
      />

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
