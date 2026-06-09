import { unstable_cache } from "next/cache";
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

const getCachedCharity = async (charityName: string) => {
    let charityData = await prisma.charity.findUnique({
      where: { name: charityName },
    });

    if (!charityData) {
      const latestResponse = await prisma.surveyResponse.findFirst({
        where: { charityName: { equals: charityName, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });

      charityData = await prisma.charity.create({
        data: {
          name: charityName,
          establishmentDate: latestResponse?.establishmentDate || null,
          licenseNumber: latestResponse?.licenseNumber || null,
        },
      });
    }
    return charityData;
  };

export default async function CharityOverview({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await getCachedCharity(decodedName);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100 dark:border-slate-700 transition-colors">
            <div className="flex items-center gap-4">
              {charity.logoUrl ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-inner bg-white dark:bg-slate-900 flex items-center justify-center transition-colors">
                  <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain p-1" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner transition-colors">
                  <ClipboardList className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1 tracking-tight transition-colors">{charity.name}</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">الملف التعريفي للجمعية</p>
              </div>
            </div>

            <EditProfileButton charity={charity} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors">اسم الجمعية</div>
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{charity.name}</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors">مجال العمل</div>
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">
                {(charity as any).domain || <span className="text-slate-300 dark:text-slate-600 font-medium text-sm transition-colors">غير متوفر</span>}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors">تاريخ التأسيس</div>
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">
                {charity.establishmentDate || <span className="text-slate-300 dark:text-slate-600 font-medium text-sm transition-colors">غير متوفر</span>}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors">رقم التصريح</div>
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">
                {charity.licenseNumber || <span className="text-slate-300 dark:text-slate-600 font-medium text-sm transition-colors">غير متوفر</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        {/* Subtle patterned background for empty state */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>

        <div className="relative text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/5 dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/10 shadow-sm transition-colors">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight transition-colors">المزيد من البيانات قريباً</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed transition-colors">
            يتم العمل حالياً على استكمال ربط ملف الجمعية بالبيانات المالية والإدارية الشاملة لتوفير رؤية متكاملة.
          </p>
        </div>
      </div>
    </div>
  );
}
