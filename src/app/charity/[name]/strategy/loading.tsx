export default function StrategyLoading() {
  return (
    <div className="space-y-12 animate-pulse" dir="rtl">
      {/* Survey Link Manager Skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200/80 rounded-xl shrink-0"></div>
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-32 bg-slate-200/80 rounded-md"></div>
          </div>
        </div>
        <div className="h-10 w-full sm:w-40 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Readiness Results Skeleton */}
      <div>
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 bg-slate-200/80 rounded-xl shrink-0"></div>
          <div className="h-7 w-64 bg-slate-200 rounded-md"></div>
        </div>

        {/* Results Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 rounded-full"></div>
                  <div className="h-5 w-40 bg-slate-200 rounded-md"></div>
                </div>
                <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
                      <div className="h-4 w-8 bg-slate-200 rounded-md"></div>
                    </div>
                    <div className="h-2 w-full bg-slate-200/80 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
