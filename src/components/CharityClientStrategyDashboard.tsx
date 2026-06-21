"use client";

import Link from "next/link";
import CharityClientTimeline from "./CharityClientTimeline";

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const MetricIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 3v18h18" />
    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function CharityClientStrategyDashboard({ 
  charityName, 
  data 
}: { 
  charityName: string, 
  data: any 
}) {
  if (!data || !data.charity) return null;

  const { charity, nextMeeting, activeTasks } = data;
  const { strategicStages, isPerformanceEditable, isReadinessVisible } = charity;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Next Meeting Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 text-primary mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarIcon />
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">الاجتماع الاستراتيجي القادم</h3>
            </div>
            
            {nextMeeting ? (
              <div className="mt-4">
                <p className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-2">{nextMeeting.title}</p>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <ClockIcon />
                  <span>
                    {new Intl.DateTimeFormat('ar-SA', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }).format(new Date(nextMeeting.date))}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500">
                <CalendarIcon />
                <p className="mt-2 font-medium">لا توجد اجتماعات مجدولة حالياً</p>
              </div>
            )}
          </div>
        </div>

        {/* Action / Notifications Card */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
           {isPerformanceEditable && (
             <Link href={`/charity/${encodeURIComponent(charityName)}/strategy/performance`}
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl p-6 shadow-md transition-all hover:shadow-lg flex flex-col justify-between group">
               <div className="flex items-center justify-between mb-4">
                 <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                   <MetricIcon />
                 </div>
                 <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">متاح للتعديل</div>
               </div>
               <div>
                 <h3 className="font-bold text-xl mb-1">مقياس الأداء</h3>
                 <p className="text-indigo-100 text-sm flex items-center justify-between">
                    قم بتحديث بيانات الأداء والمؤشرات
                    <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                 </p>
               </div>
             </Link>
           )}
           
           {!isPerformanceEditable && (
             <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-between">
               <div className="flex items-center justify-between mb-4">
                 <div className="p-3 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl">
                   <MetricIcon />
                 </div>
                 <div className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold">للعرض فقط</div>
               </div>
               <div>
                 <h3 className="font-bold text-xl mb-1 text-slate-800 dark:text-slate-200">مقياس الأداء</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm">التعديل مغلق حالياً من قبل فريق الاستراتيجية</p>
               </div>
             </div>
           )}

           <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
             <div className="flex items-center justify-between mb-4">
               <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                 <CheckCircleIcon />
               </div>
               <div className="text-2xl font-black">{activeTasks?.length || 0}</div>
             </div>
             <div>
               <h3 className="font-bold text-xl mb-1">المهام الجارية</h3>
               <p className="text-emerald-100 text-sm">لفريق الاستراتيجية</p>
             </div>
           </div>
        </div>
      </div>

      {/* Strategic Stages Timeline */}
      <CharityClientTimeline title={charity.strategyTimelineName || "المخطط الزمني للتخطيط الاستراتيجي"} stages={strategicStages} />

      {/* Active Tasks List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">المهام الجاري العمل عليها من قبل فريق الاستراتيجية</h3>
        
        {activeTasks && activeTasks.length > 0 ? (
          <div className="space-y-4">
            {activeTasks.map((task: any) => (
              <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-emerald-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{task.title}</h4>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block">قيد التنفيذ</span>
                  </div>
                </div>
                {task.assignedTo && (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center overflow-hidden">
                      {task.assignedTo.avatarUrl ? (
                         <img src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} className="w-full h-full object-cover" />
                      ) : (
                         <UserIcon />
                      )}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{task.assignedTo.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <CheckCircleIcon />
            <p className="mt-2 font-medium">لا توجد مهام جارية حالياً</p>
          </div>
        )}
      </div>

    </div>
  );
}
