import { prisma } from "@/lib/db";
import { LayoutList, Calendar, CheckCircleIcon } from "lucide-react";

export default async function DepartmentServicesTimeline({
  charityId,
  department,
}: {
  charityId: string;
  department: string;
}) {
  const services = await prisma.service.findMany({
    where: {
      charityId,
      department
    },
    include: {
      stages: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (services.length === 0) {
    return null; // Don't render anything if no services belong to this department
  }

  return (
    <div className="space-y-6 mt-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
          <LayoutList className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          الخدمات المرتبطة بالقسم
        </h2>
      </div>

      <div className="grid gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-6">{service.name}</h3>
            
            {service.stages.length === 0 ? (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p>لا توجد مراحل محددة في الخط الزمني لهذه الخدمة</p>
              </div>
            ) : (
              <div className="relative">
                {/* Horizontal line for desktop */}
                <div className="hidden md:block absolute top-[28px] left-0 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-4 relative z-10 overflow-x-auto custom-scrollbar pb-4">
                  {service.stages.map((stage, index) => {
                    // We use isCurrent instead of date checking
                    const currentIndex = service.stages.findIndex(s => s.isCurrent);
                    const isCurrent = stage.isCurrent;
                    const isPast = currentIndex !== -1 ? index < currentIndex : true;

                    return (
                      <div key={stage.id} className="flex flex-row md:flex-col items-start md:items-center gap-4 md:w-64 shrink-0 group">
                        {/* Vertical line for mobile */}
                        <div className="md:hidden absolute right-[31px] top-12 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700 -z-10"></div>
                        
                        <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-lg bg-white dark:bg-slate-800 shrink-0 transition-all duration-300
                          ${isCurrent ? 'border-primary text-primary scale-110 shadow-lg shadow-primary/20' : 
                            isPast ? 'border-primary text-white bg-primary' : 
                            'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500'}`}
                        >
                          {isPast ? <CheckCircleIcon className="w-6 h-6" /> : (index + 1)}
                        </div>
                        
                        <div className={`flex-1 text-right md:text-center p-4 rounded-xl transition-all w-full
                          ${isCurrent ? 'bg-primary/5 border border-primary/20' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50'}`}
                        >
                          <h4 className={`font-bold mb-2 ${isCurrent ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{stage.name}</h4>
                          
                          {(stage.startDate || stage.endDate) && (
                            <div className="flex items-center md:justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full">
                              <Calendar className="w-3.5 h-3.5" />
                              <span dir="ltr">
                                {stage.startDate ? new Intl.DateTimeFormat('ar-SA').format(new Date(stage.startDate)) : '—'}
                              </span>
                              <span>إلى</span>
                              <span dir="ltr">
                                {stage.endDate ? new Intl.DateTimeFormat('ar-SA').format(new Date(stage.endDate)) : '—'}
                              </span>
                            </div>
                          )}
                          
                          {stage.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                              {stage.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
