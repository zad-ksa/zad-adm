import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import Header from "@/components/Header";
import Link from "next/link";
import CopyLinkButton from "@/components/CopyLinkButton";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const responses = await prisma.surveyResponse.findMany({
    orderBy: {
      createdAt: "desc",
    },
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
              <span className="font-semibold text-slate-700">إجمالي التقييمات: </span>
              <span className="text-primary font-bold">{responses.length}</span>
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
                  <th className="p-4 font-semibold">اسم المفوض</th>
                  <th className="p-4 font-semibold">تاريخ التعبئة</th>
                  <th className="p-4 font-semibold">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {responses.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-primary hover:underline">
                      <Link href={`/dashboard/${res.id}`}>{res.charityName}</Link>
                    </td>
                    <td className="p-4 text-slate-600">{res.establishmentDate}</td>
                    <td className="p-4 text-slate-600">{res.licenseNumber}</td>
                    <td className="p-4 text-slate-600">
                      <div>{res.authorizedName}</div>
                      <div className="text-xs text-slate-400">{res.authorizedTitle}</div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      {new Date(res.createdAt).toLocaleDateString("ar-SA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center justify-center
                          ${
                            res.scorePercentage >= 80 ? "bg-green-100 text-green-700" :
                            res.scorePercentage >= 60 ? "bg-blue-100 text-blue-700" :
                            res.scorePercentage >= 40 ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          }
                        `}>
                          {res.scorePercentage}%
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {responses.length === 0 && (
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
