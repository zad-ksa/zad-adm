import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";
import { getCharities } from "@/app/actions/charity";
import AddCharityButton from "./AddCharityButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الجمعيات | زاد التنموية",
  description: "الجمعيات المتعاقد معها والمستهدفة",
};

export default async function CharitiesDashboard() {
  const charities = await getCharities();

  return (
    <main className="flex-1 min-w-0 py-8">
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">إدارة الجمعيات</h1>
          <p className="text-slate-600">قائمة بالجمعيات المتعاقد معها والجمعيات المستهدفة</p>
        </div>
        <AddCharityButton />
      </div>

      {/* Contracted Charities Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full"></div>
              الجمعيات المتعاقد معها
            </h2>
            <p className="text-sm text-slate-500 mt-1">الجمعيات التي تم التعاقد معها وبدء العمل معها</p>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-xl font-bold">
            {charities.length} جمعية
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm tracking-wide">
                <th className="p-5 font-bold uppercase">اسم الجمعية</th>
                <th className="p-5 font-bold uppercase">مجال العمل</th>
                <th className="p-5 font-bold uppercase">تاريخ التأسيس</th>
                <th className="p-5 font-bold uppercase">رقم التصريح</th>
                <th className="p-5 font-bold uppercase">تاريخ الإضافة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {charities.map((charity) => (
                <tr key={charity.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 font-bold text-slate-800">
                    <Link href={`/dashboard/charity/${encodeURIComponent(charity.name)}`} className="hover:text-primary transition-colors">
                      {charity.name}
                    </Link>
                  </td>
                  <td className="p-5 text-slate-600 text-sm font-semibold">
                    {charity.domain || <span className="text-slate-300 font-medium">غير محدد</span>}
                  </td>
                  <td className="p-5 text-slate-600 font-medium">{charity.establishmentDate || "-"}</td>
                  <td className="p-5 text-slate-600 font-medium">{charity.licenseNumber || "-"}</td>
                  <td className="p-5 text-slate-500 text-sm font-medium">
                    {new Date(charity.createdAt).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {charities.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500">
                    <p className="font-medium">لا توجد جمعيات مضافة حالياً.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Charities Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm opacity-75">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-2 h-6 bg-slate-300 rounded-full"></div>
            الجمعيات المستهدفة
          </h2>
          <p className="text-sm text-slate-500 mt-1">قائمة بالجمعيات المستهدف التعاقد معها مستقبلاً (سيتم إضافة بياناتها قريباً)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm tracking-wide">
                <th className="p-5 font-bold uppercase">اسم الجمعية</th>
                <th className="p-5 font-bold uppercase">المدينة / المنطقة</th>
                <th className="p-5 font-bold uppercase">مجال العمل</th>
                <th className="p-5 font-bold uppercase">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr>
                <td colSpan={4} className="p-16 text-center text-slate-400">
                  <div className="w-16 h-16 mx-auto bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-medium">سيتم إضافة بيانات الجمعيات المستهدفة قريباً</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
