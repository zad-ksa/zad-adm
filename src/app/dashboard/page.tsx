import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";
import CopyLinkButton from "@/components/CopyLinkButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const responses = await prisma.surveyResponse.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  // Group by charity name
  const groupedCharities: Record<string, typeof responses> = {};
  responses.forEach((res) => {
    const key = res.charityName.trim();
    if (!groupedCharities[key]) {
      groupedCharities[key] = [];
    }
    groupedCharities[key].push(res);
  });

  const charityList = Object.keys(groupedCharities).map((name) => {
    const subs = groupedCharities[name];
    const totalPercentage = subs.reduce((acc, curr) => acc + curr.scorePercentage, 0);
    const averagePercentage = Math.round(totalPercentage / subs.length);
    const latestSub = subs[0];

    return {
      name,
      submissionCount: subs.length,
      averagePercentage,
      licenseNumber: latestSub.licenseNumber,
      establishmentDate: latestSub.establishmentDate,
      latestDate: latestSub.createdAt,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">لوحة تحكم شركة زاد</h1>
            <p className="text-slate-600">قائمة بالجمعيات التي قامت بتعبئة استبيان الجاهزية</p>
          </div>
          <div className="flex items-center gap-4">
            <CopyLinkButton />
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
              <span className="font-semibold text-slate-700">إجمالي الجمعيات: </span>
              <span className="text-primary font-bold">{charityList.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">اسم الجمعية</th>
                  <th className="p-4 font-semibold">تاريخ التأسيس</th>
                  <th className="p-4 font-semibold">رقم التصريح</th>
                  <th className="p-4 font-semibold text-center">عدد المشاركين</th>
                  <th className="p-4 font-semibold">آخر مشاركة</th>
                  <th className="p-4 font-semibold">متوسط نسبة الجاهزية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charityList.map((charity) => (
                  <tr key={charity.name} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-primary hover:underline">
                      <Link href={`/dashboard/charity/${encodeURIComponent(charity.name)}`}>
                        {charity.name}
                      </Link>
                    </td>
                    <td className="p-4 text-slate-600">{charity.establishmentDate}</td>
                    <td className="p-4 text-slate-600">{charity.licenseNumber}</td>
                    <td className="p-4 text-slate-600 text-center font-bold">{charity.submissionCount}</td>
                    <td className="p-4 text-slate-600 text-sm">
                      {new Date(charity.latestDate).toLocaleDateString("ar-SA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center justify-center
                          ${
                            charity.averagePercentage >= 80 ? "bg-green-100 text-green-700" :
                            charity.averagePercentage >= 60 ? "bg-blue-100 text-blue-700" :
                            charity.averagePercentage >= 40 ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          }
                        `}>
                          {charity.averagePercentage}%
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {charityList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      لا يوجد أي تقييمات حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
