import { unstable_cache } from "next/cache";
import { PageHeader, theadRowClass, thClass, tbodyClass, tdClass, tableFrameClass } from "@/components/console/layout";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CopyLinkButton from "@/components/CopyLinkButton";
import type { Metadata } from "next";
import { getCharities, bootstrapCharities } from "@/app/actions/charity";
import ApproveCharityButton from "@/app/(dashboard)/main/ApproveCharityButton";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { cx } from "@/components/console/ui";



const getCachedSurveysData = async () => {
    const [charities, responses, hexagonalResponses] = await Promise.all([
      prisma.charity.findMany({ 
        select: { id: true, name: true, createdAt: true, establishmentDate: true, licenseNumber: true },
        orderBy: { createdAt: "desc" } 
      }),
      prisma.surveyResponse.findMany({ 
        select: { id: true, charityName: true, establishmentDate: true, licenseNumber: true, createdAt: true, scorePercentage: true },
        orderBy: { createdAt: "desc" } 
      }),
      prisma.hexagonalResponse.findMany({ 
        select: { id: true, charityName: true, createdAt: true },
        orderBy: { createdAt: "desc" } 
      })
    ]);

    const registeredNames = new Set(charities.map(c => c.name.trim().toLowerCase()));
    
    const pendingResponses = responses.filter(r => !registeredNames.has(r.charityName.trim().toLowerCase()));
    const pendingHexs = hexagonalResponses.filter(h => !registeredNames.has(h.charityName.trim().toLowerCase()));

    const pendingCharitiesMap = new Map<string, {
      name: string;
      readinessCount: number;
      hexagonalCount: number;
      establishmentDate?: string;
      licenseNumber?: string;
      latestDate: string;
    }>();

    pendingResponses.forEach(r => {
      const name = r.charityName.trim();
      const key = name.toLowerCase();
      if (!pendingCharitiesMap.has(key)) {
        pendingCharitiesMap.set(key, {
          name,
          readinessCount: 0,
          hexagonalCount: 0,
          establishmentDate: r.establishmentDate || undefined,
          licenseNumber: r.licenseNumber || undefined,
          latestDate: new Date(r.createdAt).toISOString(),
        });
      }
      const item = pendingCharitiesMap.get(key)!;
      item.readinessCount++;
      if (r.establishmentDate && !item.establishmentDate) item.establishmentDate = r.establishmentDate;
      if (r.licenseNumber && !item.licenseNumber) item.licenseNumber = r.licenseNumber;
      if (new Date(r.createdAt) > new Date(item.latestDate)) {
        item.latestDate = new Date(r.createdAt).toISOString();
      }
    });

    pendingHexs.forEach(h => {
      const name = h.charityName.trim();
      const key = name.toLowerCase();
      if (!pendingCharitiesMap.has(key)) {
        pendingCharitiesMap.set(key, {
          name,
          readinessCount: 0,
          hexagonalCount: 0,
          latestDate: new Date(h.createdAt).toISOString(),
        });
      }
      const item = pendingCharitiesMap.get(key)!;
      item.hexagonalCount++;
      if (new Date(h.createdAt) > new Date(item.latestDate)) {
        item.latestDate = new Date(h.createdAt).toISOString();
      }
    });

    const pendingCharitiesList = Array.from(pendingCharitiesMap.values());
    pendingCharitiesList.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

    const charityStats = charities.map(charity => {
      const charityResponses = responses.filter(r => r.charityName.trim() === charity.name.trim());
      const charityHexs = hexagonalResponses.filter(h => h.charityName.trim() === charity.name.trim());

      let averagePercentage = 0;
      if (charityResponses.length > 0) {
        const total = charityResponses.reduce((acc, curr) => acc + curr.scorePercentage, 0);
        averagePercentage = Math.round(total / charityResponses.length);
      }

      const dates = [
        ...charityResponses.map(r => new Date(r.createdAt)),
        ...charityHexs.map(h => new Date(h.createdAt))
      ];
      
      const latestDate = dates.length > 0 
        ? new Date(Math.max(...dates.map(d => d.getTime())))
        : new Date(charity.createdAt);

      return {
        id: charity.id,
        name: charity.name,
        establishmentDate: charity.establishmentDate,
        licenseNumber: charity.licenseNumber,
        readinessCount: charityResponses.length,
        hexagonalCount: charityHexs.length,
        averagePercentage,
        latestDate: latestDate.toISOString()
      };
    });

    charityStats.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

    return { pendingCharitiesList, charityStats };
  };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الاستبيانات | زاد التنموية",
  description: "الاستبيانات المعبأة في زاد التنموية",
};

export default async function SurveysDashboard() {
  // التفعيل يُنشئ جمعية عبر addCharity، وحارسها manage_charities؛ فبدونها زرٌّ يُرفض دائماً.
  const session = await getSession();
  const canManageCharities = !!session && hasPermission(session.role, session.permissions || [], "manage_charities");
  const c = await getCharities();
  if (c.length === 0) {
    await bootstrapCharities();
  }

  const { pendingCharitiesList, charityStats } = await getCachedSurveysData();

  return (
    <main className="flex-1 min-w-0 py-8">
      <div className="mb-8">
        <PageHeader
          title="الاستبيانات المعبأة"
          description="قائمة بالجمعيات وإحصائيات استبيانات الجاهزية والتحليل السداسي"
          actions={
            <>
              <CopyLinkButton />
              <CopyLinkButton path="/hexagonal" label="رابط التحليل السداسي" />
            </>
          }
        />
      </div>

      {pendingCharitiesList.length > 0 && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center text-amber-700 dark:text-amber-400 text-section font-semibold border border-amber-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-section font-semibold text-amber-900">استبيانات معلقة من جمعيات غير مسجلة</h2>
                <p className="text-caption text-amber-600 mt-0.5">هناك استبيانات مرسلة من جمعيات غير مضافة لقائمة الجمعيات المتعاقد معها. يمكنك تفعيلها لإدراجها تلقائياً.</p>
              </div>
            </div>
          </div>
          <div className={tableFrameClass}>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse whitespace-nowrap text-caption">
                <thead>
                  <tr className={theadRowClass}>
                    <th className={cx(thClass, "text-right")}>اسم الجمعية المعلقة</th>
                    <th className={cx(thClass, "text-center")}>مقياس الجاهزية</th>
                    <th className={cx(thClass, "text-center")}>التحليل السداسي</th>
                    <th className={thClass}>تاريخ التأسيس</th>
                    <th className={thClass}>رقم الترخيص</th>
                    <th className={thClass}>آخر نشاط</th>
                    <th className={cx(thClass, "text-center")}>الإجراء</th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {pendingCharitiesList.map((pending) => (
                    <tr key={pending.name} className="hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                      <td className={cx(tdClass, "font-semibold text-slate-800 dark:text-slate-100 text-caption")}>{pending.name}</td>
                      <td className={cx(tdClass, "text-center font-semibold")}>
                        {pending.readinessCount > 0 ? (
                          <span className="inline-block bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
                            {pending.readinessCount} استبيان
                          </span>
                        ) : (
                          <span className="text-slate-400 text-caption">-</span>
                        )}
                      </td>
                      <td className={cx(tdClass, "text-center font-semibold")}>
                        {pending.hexagonalCount > 0 ? (
                          <span className="inline-block bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
                            {pending.hexagonalCount} استبيان
                          </span>
                        ) : (
                          <span className="text-slate-400 text-caption">-</span>
                        )}
                      </td>
                      <td className={cx(tdClass, "text-slate-600 dark:text-slate-300")}>{pending.establishmentDate || "-"}</td>
                      <td className={cx(tdClass, "text-slate-600 dark:text-slate-300")}>{pending.licenseNumber || "-"}</td>
                      <td className={cx(tdClass, "text-slate-500 dark:text-slate-400")}>
                        {new Date(pending.latestDate).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className={cx(tdClass, "text-center flex justify-center items-center")}>
                        {canManageCharities ? (
                          <ApproveCharityButton
                            name={pending.name}
                            establishmentDate={pending.establishmentDate}
                            licenseNumber={pending.licenseNumber}
                          />
                        ) : (
                          <span className="text-slate-400 text-caption">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className={tableFrameClass}>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse whitespace-nowrap">
            <thead>
              <tr className={theadRowClass}>
                <th className={thClass}>اسم الجمعية</th>
                <th className={cx(thClass, "text-center")}>الاستبيانات</th>
                <th className={cx(thClass, "text-center")}>التحليل السداسي</th>
                <th className={thClass}>تاريخ التأسيس</th>
                <th className={thClass}>رقم التصريح</th>
                <th className={thClass}>آخر نشاط</th>
                <th className={cx(thClass, "text-center")}>متوسط الجاهزية</th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {charityStats.map((charity) => (
                <tr key={charity.id} className="hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className={cx(tdClass, "font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors")}>
                    <Link href={`/charity/${encodeURIComponent(charity.name)}`} className="block">
                      {charity.name}
                    </Link>
                  </td>
                  <td className={cx(tdClass, "text-center font-semibold")}>
                    {charity.readinessCount > 0 ? (
                      <span className="inline-block bg-primary/5 text-primary px-4 py-1.5 rounded-lg text-caption font-semibold border border-primary/10">
                        {charity.readinessCount}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-caption">-</span>
                    )}
                  </td>
                  <td className={cx(tdClass, "text-center font-semibold")}>
                    {charity.hexagonalCount > 0 ? (
                      <span className="inline-block bg-secondary/10 text-[#c29300] px-4 py-1.5 rounded-lg text-caption font-semibold border border-secondary/20">
                        {charity.hexagonalCount}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-caption">-</span>
                    )}
                  </td>
                  <td className={cx(tdClass, "text-slate-600 dark:text-slate-300 font-medium")}>{charity.establishmentDate || "-"}</td>
                  <td className={cx(tdClass, "text-slate-600 dark:text-slate-300 font-medium")}>{charity.licenseNumber || "-"}</td>
                  <td className={cx(tdClass, "text-slate-500 dark:text-slate-400 text-caption font-medium")}>
                    {new Date(charity.latestDate).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className={cx(tdClass, "text-center")}>
                    {charity.readinessCount > 0 ? (
                      <div className="flex items-center justify-center">
                        <div className={`px-5 py-2 rounded-xl text-caption font-semibold flex items-center justify-center min-w-[4rem]
                          ${
                            charity.averagePercentage >= 85 ? "bg-[#00b050]/10 text-[#00b050]" :
                            charity.averagePercentage >= 70 ? "bg-[#ffc000]/10 text-[#c29300]" :
                            "bg-[#ff0000]/10 text-[#ff0000]"
                          }
                        `}>
                          {charity.averagePercentage}%
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-caption font-medium bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg">لا يوجد مقياس</span>
                    )}
                  </td>
                </tr>
              ))}
              {charityStats.length === 0 && (
                <tr>
                  <td colSpan={7} className={cx(tdClass, "text-center text-slate-500 dark:text-slate-400")}>
                    <div className="w-16 h-16 mx-auto bg-slate-50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-section font-semibold text-slate-700 dark:text-slate-200 mb-2">لا توجد استبيانات</h3>
                    <p className="font-medium text-slate-500 dark:text-slate-400">لم يتم إرسال أي استبيانات حتى الآن.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
