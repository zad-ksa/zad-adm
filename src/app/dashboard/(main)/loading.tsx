export default function DashboardLoading() {
  return (
    <main className="flex-1 min-w-0 py-8 animate-pulse" dir="rtl">
      {/* Title & Subtitle Skeleton */}
      <div className="mb-8">
        <div className="h-9 w-48 bg-slate-200 rounded-lg mb-3"></div>
        <div className="h-4.5 w-80 bg-slate-200/80 rounded-md"></div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100/80 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-200/80 rounded-xl shrink-0"></div>
            <div className="space-y-2.5 flex-1">
              <div className="h-4 w-28 bg-slate-200 rounded-md"></div>
              <div className="h-7 w-12 bg-slate-200 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="h-6 w-56 bg-slate-200 rounded-md"></div>
        </div>
        <div className="p-6 space-y-4">
          {/* Table Headers */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-20 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-20 bg-slate-200 rounded-md"></div>
          </div>
          {/* Table Rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="h-5 w-44 bg-slate-200 rounded-md"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
