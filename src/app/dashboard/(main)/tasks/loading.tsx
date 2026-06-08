export default function TasksLoading() {
  return (
    <main className="flex-1 min-w-0 py-8 animate-pulse" dir="rtl">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="h-9 w-48 bg-slate-200 rounded-lg mb-3"></div>
          <div className="h-4.5 w-80 bg-slate-200/80 rounded-md"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Kanban Board Skeleton */}
      <div className="flex items-start gap-6 overflow-x-auto pb-4">
        {[...Array(4)].map((_, colIdx) => (
          <div key={colIdx} className="w-80 shrink-0 bg-slate-50 rounded-2xl flex flex-col h-[calc(100vh-16rem)] border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
              <div className="h-5 w-24 bg-slate-200 rounded-md"></div>
              <div className="h-5 w-8 bg-slate-200 rounded-md"></div>
            </div>
            
            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
              {[...Array(3)].map((_, cardIdx) => (
                <div key={cardIdx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="h-5 w-16 bg-slate-200 rounded-md"></div>
                    <div className="h-4 w-4 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="h-4 w-full bg-slate-200 rounded-md"></div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded-md"></div>
                  <div className="pt-3 flex justify-between items-center border-t border-slate-50 mt-3">
                    <div className="h-4 w-20 bg-slate-200 rounded-md"></div>
                    <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
