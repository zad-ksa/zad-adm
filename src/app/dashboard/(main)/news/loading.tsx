export default function NewsLoading() {
  return (
    <main className="flex-1 min-w-0 py-8 animate-pulse" dir="rtl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="h-9 w-48 bg-slate-200 rounded-lg mb-3"></div>
          <div className="h-4.5 w-80 bg-slate-200/80 rounded-md"></div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        <div className="w-full xl:w-72 shrink-0 space-y-6 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="h-6 w-32 bg-slate-200 rounded-md mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-10 w-full bg-slate-200 rounded-xl"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-10 w-full bg-slate-200 rounded-xl"></div>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`group ${i > 0 ? "pt-5" : ""} ${i < 4 ? "pb-5" : ""}`}>
                <div className="flex gap-2 mb-3">
                  <div className="h-5 w-20 bg-slate-200 rounded-md"></div>
                  <div className="h-5 w-16 bg-slate-200 rounded-md"></div>
                </div>
                <div className="h-5 w-64 bg-slate-200 rounded-md mb-3"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 w-full max-w-2xl bg-slate-200/80 rounded-md"></div>
                  <div className="h-4 w-3/4 max-w-xl bg-slate-200/80 rounded-md"></div>
                </div>
                <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
