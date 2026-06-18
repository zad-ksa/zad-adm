export default function FinanceLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-slate-200/80 rounded-xl shrink-0"></div>
        <div className="h-7 w-48 bg-slate-200 rounded-md"></div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 bg-slate-200/80 rounded-xl"></div>
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-8 w-32 bg-slate-200 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-6 w-40 bg-slate-200 rounded-md"></div>
        <div className="h-12 w-48 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 space-y-4">
          {/* Table Headers */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
          </div>
          {/* Table Rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
              <div className="h-5 w-32 bg-slate-200 rounded-md"></div>
              <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-28 bg-slate-200 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
