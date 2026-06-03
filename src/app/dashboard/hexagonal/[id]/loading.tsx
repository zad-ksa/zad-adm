export default function Loading() {
  return (
    <div className="w-full space-y-8 animate-pulse font-sans" dir="rtl">
      {/* Header Info Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 p-8 md:p-10 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-slate-150 rounded-2xl shrink-0"></div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-150 rounded-md w-28"></div>
              <div className="h-6 bg-slate-200 rounded-md w-48 sm:w-64"></div>
              <div className="h-3 bg-slate-150 rounded-md w-20"></div>
            </div>
          </div>
          <div className="w-full md:w-48 bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-2">
            <div className="h-3 bg-slate-150 rounded-md w-16"></div>
            <div className="h-4 bg-slate-200 rounded-md w-24"></div>
          </div>
        </div>
      </div>

      {/* Title section skeleton */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 bg-slate-150 rounded-xl"></div>
        <div className="h-6 bg-slate-200 rounded-md w-56"></div>
      </div>

      {/* Grid of 6 dimensions skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 space-y-5">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-slate-150 shrink-0"></div>
              <div className="h-5 bg-slate-200 rounded-md w-36"></div>
            </div>
            <div className="space-y-3">
              <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
              <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
              <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
