import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureStagesForCharity } from "@/app/actions/strategy";
import type { Metadata } from "next";
import { CalendarIcon, LicenseIcon, Rocket, ClipboardList, Building2, Sparkles, Check, Clock, Award } from "@/components/Icons";
import { Scale, Coins } from "lucide-react";
import EditProfileButton from "./EditProfileButton";
import CreateCharityAccountModal from "./CreateCharityAccountModal";
import { getSession } from "@/lib/auth";


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
  const session = await getSession();
  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session?.role || "");
  
  await ensureStagesForCharity(charity.id);

  const [completedTasks, latestNews, upcomingMeetings, strategicStages, governanceStages, financeStages] = await Promise.all([
    prisma.task.findMany({
      where: { charityName: decodedName, isCompleted: true },
      orderBy: { completedAt: 'desc' },
      take: 5,
    }),
    prisma.news.findMany({
      where: { charityName: decodedName },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.meeting.findMany({
      where: { charityId: charity.id, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.strategicStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' }
    }),
    prisma.governanceStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' }
    }),
    prisma.financeStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' }
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
        {/* Decorative subtle background element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors">
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

            <div className="flex items-center gap-3">
              {isAdmin && (
                <CreateCharityAccountModal charityId={charity.id} charityName={charity.name} />
              )}
              <EditProfileButton charity={charity} />
            </div>
          </div>


        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">


        {/* Latest Completed Tasks */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Check className="w-6 h-6 text-emerald-500" />
            اخر المهام المنجزة
          </h3>
          {completedTasks.length > 0 ? (
            <div className="space-y-4">
              {completedTasks.map((task: any) => (
                <div key={task.id} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{task.title}</div>
                    {task.completedAt && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(task.completedAt).toLocaleDateString('ar-SA')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-8 text-slate-500 dark:text-slate-400">لا توجد مهام منجزة بعد</div>
          )}
        </div>



        {/* Grants */}
        {!!charity.grants && charity.grants > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              المنح الحاصلة عليها الجمعية
            </h3>
            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
               <div>
                 <div className="text-sm font-bold text-amber-600 dark:text-amber-500 mb-1">إجمالي المنح</div>
                 <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                   {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(charity.grants || 0)}
                 </div>
               </div>
               <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-500">
                 <Award className="w-8 h-8" />
               </div>
            </div>
          </div>
        )}

        {/* Upcoming Meetings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-purple-500" />
            المواعيد
          </h3>
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-4">
              {upcomingMeetings.map((meeting: any) => (
                <div key={meeting.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{meeting.title}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                         {new Date(meeting.date).toLocaleDateString('ar-SA')} - {new Date(meeting.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">لا توجد اجتماعات قادمة</div>
          )}
        </div>
      </div>
    </div>
  );
}
