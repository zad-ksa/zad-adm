import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, ShieldAlert, ArrowLeft, Layers, LayoutTemplate } from "lucide-react";
import { hasPermission } from "@/lib/permissions";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role || "";
  const perms = session.permissions || [];
  const can = (p: string) => hasPermission(role, perms, p);

  if (
    !can("manage_charities") &&
    !can("manage_employees") &&
    !can("manage_charity_settings") &&
    !can("manage_landing")
  ) {
    redirect("/main");
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary" />
          لوحة التحكم
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">إدارة النظام والجمعيات وحسابات المستخدمين.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Charity Settings */}
        {can("manage_charity_settings") && (
          <Link href="/main/charity-settings" className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all overflow-hidden relative">
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">إعدادات الجمعيات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">إعداد القوائم والأهداف المرتبطة بملفات الجمعيات.</p>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span>الدخول للإعدادات</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Charity Accounts Management */}
        {can("manage_charity_accounts") && (
          <Link href="/main/charity-accounts" className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all overflow-hidden relative">
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">إدارة حسابات الجمعيات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">إنشاء حسابات دخول مخصصة لممثلي الجمعيات وتحديد الصلاحيات المتاحة لهم.</p>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <span>الدخول للإدارة</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Charities Management */}
        {can("manage_charities") && (
          <Link href="/main/admin/manage-charities" className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all overflow-hidden relative">
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            <div className="w-12 h-12 bg-primary/5 dark:bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">إدارة الجمعيات المتعاقدة</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">إضافة جمعيات جديدة، وتعديل أو حذف بيانات الجمعيات الحالية.</p>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span>الدخول للإدارة</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Employees Management */}
        {can("manage_employees") && (
          <Link href="/main/employees" className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all overflow-hidden relative">
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">إدارة الموظفين</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">إدارة حسابات موظفي زاد التنموية، وتحديد أدوارهم وصلاحياتهم داخل النظام.</p>
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
              <span>الدخول للإدارة</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Services Management */}
        {(can("manage_charities") || can("manage_charity_settings")) && (
          <Link href="/main/manage-services" className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all overflow-hidden relative">
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">إدارة الخدمات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">إدارة المخططات الزمنية والخدمات الإضافية المرتبطة بجميع الجمعيات.</p>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <span>الدخول للإدارة</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Landing Page Control */}
        {can("manage_landing") && (
          <Link href="/main/landing-settings" className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all overflow-hidden relative">
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">التحكم في الواجهة الرئيسية</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">تعديل نصوص وخلفيات وألوان وتأثيرات كل فقرة في الصفحة الرئيسية العامة للموقع.</p>
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <span>الدخول للتحكم</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

      </div>
    </div>
  );
}
