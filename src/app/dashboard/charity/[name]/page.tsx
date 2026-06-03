import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import { CalendarIcon, LicenseIcon, Rocket, ClipboardList, Building2, Sparkles } from "@/components/Icons";
import EditProfileButton from "./EditProfileButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | الملف التعريفي`,
  };
}

export default async function CharityOverview({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // 1. Fetch charity record from Charity table or bootstrap it from survey responses
  let charity = await prisma.charity.findUnique({
    where: { name: decodedName },
  });

  if (!charity) {
    const latestResponse = await prisma.surveyResponse.findFirst({
      where: { charityName: { equals: decodedName, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });

    charity = await prisma.charity.create({
      data: {
        name: decodedName,
        establishmentDate: latestResponse?.establishmentDate || null,
        licenseNumber: latestResponse?.licenseNumber || null,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              {charity.logoUrl ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-white flex items-center justify-center">
                  <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain p-1" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <ClipboardList className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-1 tracking-tight">{charity.name}</h1>
                <p className="text-slate-500 font-medium">الملف التعريفي للجمعية</p>
              </div>
            </div>

            <EditProfileButton charity={charity} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                {/* {charity.logoUrl ? (
                  <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center bg-white border border-slate-200 shrink-0">
                    <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain p-0.5" />
                  </div>
                ) : (
                  <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                )} */}
                <div className="text-sm font-bold text-slate-500">اسم الجمعية</div>
              </div>
              <div className="text-xl font-bold text-slate-800">{charity.name}</div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="text-sm font-bold text-slate-500">مجال العمل</div>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {(charity as any).domain || <span className="text-slate-300 font-medium text-sm">غير متوفر</span>}
              </div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon />
                <div className="text-sm font-bold text-slate-500">تاريخ التأسيس</div>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {charity.establishmentDate || <span className="text-slate-300 font-medium text-sm">غير متوفر</span>}
              </div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <LicenseIcon />
                <div className="text-sm font-bold text-slate-500">رقم التصريح</div>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {charity.licenseNumber || <span className="text-slate-300 font-medium text-sm">غير متوفر</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm relative overflow-hidden">
        {/* Subtle patterned background for empty state */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>

        <div className="relative text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/10 shadow-sm">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3 tracking-tight">المزيد من البيانات قريباً</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            يتم العمل حالياً على استكمال ربط ملف الجمعية بالبيانات المالية والإدارية الشاملة لتوفير رؤية متكاملة.
          </p>
        </div>
      </div>
    </div>
  );
}
