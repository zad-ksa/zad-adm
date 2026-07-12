export default function ProgramsLoading() {
  return (
    <div className="space-y-6 animate-pulse" dir="rtl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200/80 rounded-xl shrink-0"></div>
          <div className="h-7 w-48 bg-slate-200 rounded-md"></div>
        </div>
        <div className="h-10 w-full sm:w-32 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 bg-slate-200/80 rounded-xl"></div>
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-8 w-16 bg-slate-200 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* List items skeleton */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-40 bg-slate-200 rounded-md"></div>
                  <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                </div>
                <div className="h-4 w-full max-w-md bg-slate-200/80 rounded-md"></div>
              </div>
              <div className="flex flex-wrap gap-4 md:justify-end">
                <div className="h-8 w-24 bg-slate-200 rounded-lg"></div>
                <div className="h-8 w-24 bg-slate-200 rounded-lg"></div>
                <div className="h-8 w-24 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
              <div className="h-8 w-20 bg-slate-200 rounded-lg"></div>
              <div className="h-8 w-20 bg-slate-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
