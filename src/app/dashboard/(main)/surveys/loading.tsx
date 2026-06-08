export default function SurveysLoading() {
  return (
    <main className="flex-1 min-w-0 py-8 animate-pulse" dir="rtl">
      <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <div className="h-9 w-56 bg-slate-200 rounded-lg mb-3"></div>
          <div className="h-4.5 w-96 bg-slate-200/80 rounded-md"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[...Array(7)].map((_, i) => (
                  <th key={i} className="p-5">
                    <div className="h-4 w-20 bg-slate-200 rounded-md mx-auto"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td className="p-5"><div className="h-5 w-40 bg-slate-200 rounded-md"></div></td>
                  <td className="p-5"><div className="h-6 w-12 bg-slate-200 rounded-md mx-auto"></div></td>
                  <td className="p-5"><div className="h-6 w-12 bg-slate-200 rounded-md mx-auto"></div></td>
                  <td className="p-5"><div className="h-4 w-24 bg-slate-200 rounded-md mx-auto"></div></td>
                  <td className="p-5"><div className="h-4 w-24 bg-slate-200 rounded-md mx-auto"></div></td>
                  <td className="p-5"><div className="h-4 w-24 bg-slate-200 rounded-md mx-auto"></div></td>
                  <td className="p-5"><div className="h-8 w-16 bg-slate-200 rounded-lg mx-auto"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
