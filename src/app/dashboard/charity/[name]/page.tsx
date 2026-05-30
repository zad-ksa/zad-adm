import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | الملف التعريفي`,
  };
}

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-400">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="22" x2="15" y2="16" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M8 6h2v2H8V6zm0 4h2v2H8v-2zm8-4h2v2h-2V6zm0 4h2v2h-2v-2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-400">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const LicenseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-400">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const RocketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
    <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5" />
    <path d="M14 2c1.8 0 3 1.2 3 3 0 .2 0 .4-.1.6l-3.3 3.3c-.6.6-1.5.6-2.1 0L9.4 6.8c-.6-.6-.6-1.5 0-2.1L12.7 1.4c.2-.2.4-.4.6-.4h.7z" className="fill-primary/5" />
    <path d="M9 12c0-.6.4-1 1-1h1.5l1.5-3 3-1.5V11c0 .6-.4 1-1 1H7.5l-1.5 3-3 1.5V11z" />
    <path d="M12 15l-3-3" />
    <path d="M9 21v-4" />
    <path d="M14 17v4" />
  </svg>
);

export default async function CharityOverview({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Here we can fetch basic charity info. For now we will display a simple overview
  // Since we don't have a dedicated Charity model yet, we'll fetch from survey responses to get some metadata.
  const allResponses = await prisma.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const responses = allResponses.filter(
    (res) => res.charityName.trim().toLowerCase() === decodedName.trim().toLowerCase()
  );

  const latestReadiness = responses.length > 0 ? responses[0] : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-3xl border border-primary/20 shadow-inner">
              {decodedName.substring(0, 1)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-1 tracking-tight">{decodedName}</h1>
              <p className="text-slate-500 font-medium">الملف التعريفي للجمعية</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <BuildingIcon />
                <div className="text-sm font-bold text-slate-500">اسم الجمعية</div>
              </div>
              <div className="text-xl font-bold text-slate-800">{decodedName}</div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon />
                <div className="text-sm font-bold text-slate-500">تاريخ التأسيس</div>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {latestReadiness?.establishmentDate || <span className="text-slate-300 font-medium text-sm">غير متوفر</span>}
              </div>
            </div>

            <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <LicenseIcon />
                <div className="text-sm font-bold text-slate-500">رقم التصريح</div>
              </div>
              <div className="text-xl font-bold text-slate-800">
                {latestReadiness?.licenseNumber || <span className="text-slate-300 font-medium text-sm">غير متوفر</span>}
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
            <RocketIcon />
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
