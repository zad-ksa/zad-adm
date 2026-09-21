import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/console/layout";
import { NavCard } from "@/components/console/ui";
import { redirect } from "next/navigation";
import { ShieldCheck, Building2, Users, ShieldAlert, Layers, LayoutTemplate } from "lucide-react";
import { hasPermission } from "@/lib/permissions";

/**
 * مداخل لوحة التحكم.
 *
 * كانت ست بطاقاتٍ بستة ألوان (زمرّدي، ولون الهوية، وبنفسجي، وتركوازي،
 * وكهرماني، ووردي) ودوائر تتضاعف وأيقوناتٍ تميل عند المرور — ألوانٌ لا تقول
 * شيئاً عن حالة. صارت بطاقة انتقالٍ واحدة من العُدّة بلون الهوية.
 */
const ENTRIES = [
  {
    permission: "manage_charity_accounts",
    href: "/main/charity-accounts",
    title: "حسابات الجمعيات",
    description: "إنشاء حسابات دخول مخصصة لممثلي الجمعيات وتحديد الصلاحيات المتاحة لهم.",
    icon: ShieldAlert,
  },
  {
    permission: "manage_charities",
    href: "/main/admin/manage-charities",
    title: "إدارة الجمعيات المتعاقدة",
    description: "إضافة جمعيات جديدة، وتعديل أو حذف بيانات الجمعيات الحالية.",
    icon: Building2,
  },
  {
    permission: "manage_employees",
    href: "/main/employees",
    title: "الموظفون",
    description: "إدارة حسابات موظفي زاد التنموية، وتحديد أدوارهم وصلاحياتهم داخل النظام.",
    icon: Users,
  },
  {
    permission: "manage_permissions",
    href: "/main/admin/permissions",
    title: "الصلاحيات",
    description: "استعراض كل صلاحية ومن يملكها، وإنشاء مجموعات صلاحيات باسم واحد.",
    icon: ShieldCheck,
  },
  {
    permission: "manage_services",
    href: "/main/manage-services",
    title: "إدارة الخدمات",
    description: "إدارة المخططات الزمنية والخدمات الإضافية المرتبطة بجميع الجمعيات.",
    icon: Layers,
  },
  {
    permission: "manage_landing",
    href: "/main/landing-settings",
    title: "التحكم في الواجهة الرئيسية",
    description: "تعديل نصوص وخلفيات وألوان وتأثيرات كل فقرة في الصفحة الرئيسية العامة للموقع.",
    icon: LayoutTemplate,
  },
] as const;

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role || "";
  const perms = session.permissions || [];
  const can = (p: string) => hasPermission(role, perms, p);

  // Every permission with a card below must appear here, or its holder is
  // sent away from the page that carries their own entry point.
  const visible = ENTRIES.filter((e) => can(e.permission));
  if (visible.length === 0) redirect("/main");

  return (
    <div className="space-y-6 animate-fade-in pb-10" dir="rtl">
      <PageHeader
        icon={<ShieldAlert className="w-6 h-6" />}
        title="لوحة التحكم"
        description="إدارة النظام والجمعيات وحسابات المستخدمين."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ href, title, description, icon: Icon }) => (
          <NavCard key={href} href={href} title={title} description={description} icon={<Icon className="size-5" />} />
        ))}
      </div>
    </div>
  );
}
