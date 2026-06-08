export default function CharitiesLoading() {
  return (
    <main className="flex-1 min-w-0 py-8 animate-pulse" dir="rtl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="h-9 w-48 bg-slate-200 rounded-lg mb-3"></div>
          <div className="h-4.5 w-80 bg-slate-200/80 rounded-md"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <div className="h-6 w-56 bg-slate-200 rounded-md"></div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-16 bg-slate-200 rounded-md"></div>
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200/80 rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-slate-200 rounded-md"></div>
                  <div className="h-4 w-24 bg-slate-200/80 rounded-md"></div>
                </div>
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded-md"></div>
              <div className="h-6 w-24 bg-slate-200 rounded-md"></div>
              <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
