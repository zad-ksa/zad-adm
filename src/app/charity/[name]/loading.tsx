export default function CharityLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Overview Card Skeleton */}
      <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-200/80 rounded-2xl shrink-0"></div>
            <div className="space-y-2.5">
              <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
              <div className="h-4 w-32 bg-slate-200/80 rounded-md"></div>
            </div>
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <div className="h-4 w-20 bg-slate-200 rounded-md"></div>
              <div className="h-6 w-32 bg-slate-200 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder Card Skeleton */}
      <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-200/80 rounded-2xl mb-6"></div>
        <div className="h-6 w-48 bg-slate-200 rounded-md mb-3"></div>
        <div className="h-4 w-96 max-w-full bg-slate-200/80 rounded-md"></div>
      </div>
    </div>
  );
}
