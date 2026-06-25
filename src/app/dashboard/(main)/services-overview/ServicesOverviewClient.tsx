"use client";

import { useState, useMemo } from "react";
import { Check, Calendar, Printer, ChevronDown, ChevronRight, Briefcase, LayoutGrid } from "lucide-react";

type Charity = {
  id: string;
  name: string;
  strategyTimelineName?: string | null;
  governanceTimelineName?: string | null;
  financeTimelineName?: string | null;
  strategyTimelineDept?: string | null;
  governanceTimelineDept?: string | null;
  financeTimelineDept?: string | null;
};

type Stage = {
  id: string;
  charityId: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
  isCurrent: boolean;
  isContinuous?: boolean;
};

type ServiceWithStages = {
  id: string;
  charityId: string;
  name: string;
  department?: string | null;
  stages: Stage[];
};

const DEPT_COLORS: Record<string, string> = {
  STRATEGY: "bg-blue-500",
  GOVERNANCE: "bg-purple-500",
  FINANCE: "bg-emerald-500",
  PROGRAMS: "bg-amber-500",
};

const DEPT_LIGHT: Record<string, string> = {
  STRATEGY: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50",
  GOVERNANCE: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50",
  FINANCE: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50",
  PROGRAMS: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-SA");
}

function StagesTimeline({ stages }: { stages: Stage[] }) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const sequential = sorted.filter(s => !s.isContinuous);
  const currentIdx = sequential.findIndex(s => s.isCurrent);

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">لا توجد مراحل مسجلة</p>
    );
  }

  return (
    <div className="space-y-1.5 mt-3">
      {sorted.map((stage, idx) => {
        const isCompleted = currentIdx !== -1 ? idx < currentIdx : false;
        const isCurrent = stage.isCurrent;
        return (
          <div key={stage.id} className={`flex items-start gap-2.5 p-2 rounded-lg text-xs ${
            isCurrent ? "bg-primary/8 dark:bg-primary/15" : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 border ${
              isCurrent
                ? "border-primary bg-white dark:bg-slate-800 text-primary"
                : isCompleted
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-300 dark:border-slate-600 text-slate-400"
            }`}>
              {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold leading-tight ${isCurrent ? "text-primary" : "text-slate-700 dark:text-slate-300"}`}>
                {stage.name}
                {isCurrent && <span className="mr-1.5 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">الحالية</span>}
              </div>
              {stage.description && (
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px] leading-snug">{stage.description}</p>
              )}
              {(stage.startDate || stage.endDate) && (
                <div className="flex items-center gap-1 mt-0.5 text-slate-400 dark:text-slate-500">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span dir="ltr">{formatDate(stage.startDate)}{stage.startDate && stage.endDate ? " — " : ""}{formatDate(stage.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CharityServiceCard({
  charity,
  stages,
  dept,
  timelineName,
}: {
  charity: Charity;
  stages: Stage[];
  dept: string;
  timelineName: string;
}) {
  const [open, setOpen] = useState(true);
  const currentStage = stages.find(s => s.isCurrent);
  const completedCount = stages.filter((s, idx) => {
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const currentIdx = sorted.findIndex(s2 => s2.isCurrent);
    return currentIdx !== -1 && sorted.indexOf(s) < currentIdx;
  }).length;
  const pct = stages.length > 0 ? Math.round(((completedCount + (currentStage ? 0.5 : 0)) / stages.length) * 100) : 0;

  return (
    <div className={`rounded-xl border ${DEPT_LIGHT[dept] || "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"} overflow-hidden`}>
      <button
        className="w-full flex items-center justify-between gap-3 p-3 text-right"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${DEPT_COLORS[dept] || "bg-slate-400"}`} />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{charity.name}</span>
          {currentStage && (
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">— {currentStage.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-7">{pct}%</span>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-slate-200/50 dark:border-slate-700/50">
          <StagesTimeline stages={stages} />
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  charity,
}: {
  service: ServiceWithStages;
  charity: Charity;
}) {
  const [open, setOpen] = useState(true);
  const dept = service.department || "PROGRAMS";

  return (
    <div className={`rounded-xl border ${DEPT_LIGHT[dept] || "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"} overflow-hidden`}>
      <button
        className="w-full flex items-center justify-between gap-3 p-3 text-right"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${DEPT_COLORS[dept] || "bg-slate-400"}`} />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{charity.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">— {service.name}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-slate-200/50 dark:border-slate-700/50">
          <StagesTimeline stages={service.stages} />
        </div>
      )}
    </div>
  );
}

function handlePrint(
  deptKey: string,
  deptLabel: string,
  charities: Charity[],
  stagesData: Record<string, any[]>,
) {
  const isGeneric = deptKey.startsWith("SVC:");
  const svcId = isGeneric ? deptKey.replace("SVC:", "") : null;

  let html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="utf-8"/>
<title>خطة ${deptLabel}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #1e293b; direction: rtl; }
  h1 { font-size: 18pt; font-weight: bold; border-bottom: 3px solid #0ea5e9; padding-bottom: 8px; margin-bottom: 20px; }
  .charity-block { margin-bottom: 28px; page-break-inside: avoid; }
  .charity-name { font-size: 14pt; font-weight: bold; margin-bottom: 10px; color: #0f172a; background: #f1f5f9; padding: 6px 10px; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #0ea5e9; color: white; padding: 6px 8px; text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .current-badge { background: #0ea5e9; color: white; font-size: 8pt; padding: 1px 6px; border-radius: 10px; }
  .done-badge { background: #10b981; color: white; font-size: 8pt; padding: 1px 6px; border-radius: 10px; }
  .no-stages { color: #94a3b8; font-style: italic; padding: 4px 0; }
  .print-date { text-align: left; font-size: 9pt; color: #64748b; margin-bottom: 16px; }
  @media print { .no-print { display: none; } }
</style></head><body>
<h1>${deptLabel}</h1>
<p class="print-date">تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}</p>`;

  for (const charity of charities) {
    let stages: Stage[] = [];
    if (!isGeneric) {
      const allStages: Stage[] = stagesData[deptKey] || [];
      stages = allStages.filter(s => s.charityId === charity.id).sort((a, b) => a.order - b.order);
    } else {
      const allSvcs: ServiceWithStages[] = stagesData["SERVICES"] || [];
      const svc = allSvcs.find(s => s.id === svcId && s.charityId === charity.id);
      stages = svc?.stages || [];
    }

    if (stages.length === 0) continue;

    const currentIdx = stages.findIndex(s => s.isCurrent);

    html += `<div class="charity-block">
<div class="charity-name">${charity.name}</div>
<table>
<thead><tr><th>#</th><th>اسم المرحلة</th><th>الوصف</th><th>الفترة الزمنية</th><th>الحالة</th></tr></thead>
<tbody>`;

    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      const isCompleted = currentIdx !== -1 && i < currentIdx;
      const isCurrent = s.isCurrent;
      const dates = [s.startDate ? formatDate(s.startDate) : "", s.endDate ? formatDate(s.endDate) : ""].filter(Boolean).join(" — ");
      const badge = isCurrent ? `<span class="current-badge">الحالية</span>` : isCompleted ? `<span class="done-badge">مكتملة</span>` : "—";
      html += `<tr>
<td style="text-align:center;font-weight:bold">${i + 1}</td>
<td style="font-weight:${isCurrent ? "bold" : "normal"}">${s.name}</td>
<td style="color:#475569">${s.description || "—"}</td>
<td dir="ltr" style="font-size:9pt;color:#475569">${dates || "—"}</td>
<td>${badge}</td>
</tr>`;
    }

    html += `</tbody></table></div>`;
  }

  html += `</body></html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

export default function ServicesOverviewClient({
  charities,
  stagesData,
  isAdmin,
  deptLabels,
}: {
  charities: Charity[];
  stagesData: Record<string, any[]>;
  isAdmin: boolean;
  deptLabels: Record<string, string>;
}) {
  const builtinDepts = ["STRATEGY", "GOVERNANCE", "FINANCE"].filter(d =>
    d in stagesData
  );

  // Unique generic services grouped by (name, department)
  const allServices: ServiceWithStages[] = stagesData["SERVICES"] || [];
  const uniqueServiceKeys = useMemo(() => {
    const seen = new Map<string, { name: string; dept: string | null; id: string }>();
    for (const svc of allServices) {
      const key = `${svc.name}__${svc.department || ""}`;
      if (!seen.has(key)) seen.set(key, { name: svc.name, dept: svc.department ?? null, id: svc.id });
    }
    return Array.from(seen.values());
  }, [allServices]);

  // Tabs
  const tabs = [
    ...builtinDepts.map(d => ({ key: d, label: deptLabels[d] || d })),
    ...uniqueServiceKeys.map(s => ({ key: `SVC:${s.id}`, label: s.name, dept: s.dept })),
  ];

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "");

  const isGenericTab = activeTab.startsWith("SVC:");
  const genericSvcId = isGenericTab ? activeTab.replace("SVC:", "") : null;

  // Find the "canonical" service entry for this tab (to get the correct name)
  const genericSvcInfo = genericSvcId
    ? uniqueServiceKeys.find(s => s.id === genericSvcId)
    : null;

  const activeLabel = tabs.find(t => t.key === activeTab)?.label || "";

  const charitiesWithData = useMemo(() => {
    if (!isGenericTab) {
      return charities.filter(c => {
        const stages: Stage[] = stagesData[activeTab] || [];
        return stages.some(s => s.charityId === c.id);
      });
    } else {
      return charities.filter(c =>
        allServices.some(svc => {
          const matchKey = genericSvcInfo ? svc.name === genericSvcInfo.name : svc.id === genericSvcId;
          return matchKey && svc.charityId === c.id;
        })
      );
    }
  }, [activeTab, charities, stagesData, allServices, isGenericTab, genericSvcId, genericSvcInfo]);

  function getTimelineName(charity: Charity, dept: string): string {
    if (dept === "STRATEGY") return charity.strategyTimelineName || deptLabels["STRATEGY"];
    if (dept === "GOVERNANCE") return charity.governanceTimelineName || deptLabels["GOVERNANCE"];
    if (dept === "FINANCE") return charity.financeTimelineName || deptLabels["FINANCE"];
    return deptLabels[dept] || dept;
  }

  function getServicesForCharity(charity: Charity): ServiceWithStages[] {
    if (!genericSvcInfo) return [];
    return allServices.filter(svc => svc.charityId === charity.id && svc.name === genericSvcInfo.name);
  }

  const totalCharities = charitiesWithData.length;
  const allStages: Stage[] = !isGenericTab ? (stagesData[activeTab] || []) : [];
  const doneCharities = charitiesWithData.filter(c => {
    if (isGenericTab) {
      const svcs = getServicesForCharity(c);
      return svcs.some(svc => svc.stages.some(s => s.isCurrent));
    }
    const stages = allStages.filter(s => s.charityId === c.id);
    return stages.some(s => s.isCurrent);
  }).length;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">عرض الخدمات عبر الجمعيات</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">اختر قسماً لمشاهدة حالته في جميع الجمعيات دفعة واحدة</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 scrollbar-none">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats + print button */}
          <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                إجمالي الجمعيات: <strong className="text-slate-800 dark:text-slate-200">{totalCharities}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                لديها مراحل نشطة: <strong className="text-emerald-600 dark:text-emerald-400">{doneCharities}</strong>
              </span>
            </div>
            <button
              onClick={() => handlePrint(activeTab, activeLabel, charities, stagesData)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              طباعة / PDF
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {charitiesWithData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>لا توجد جمعيات لديها بيانات في هذا القسم</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {charitiesWithData.map(charity => {
                  if (isGenericTab) {
                    const svcs = getServicesForCharity(charity);
                    return svcs.map(svc => (
                      <ServiceCard key={svc.id} service={svc} charity={charity} />
                    ));
                  }
                  const stages = (stagesData[activeTab] || []).filter((s: Stage) => s.charityId === charity.id);
                  return (
                    <CharityServiceCard
                      key={charity.id}
                      charity={charity}
                      stages={stages}
                      dept={activeTab}
                      timelineName={getTimelineName(charity, activeTab)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tabs.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          لا توجد خدمات متاحة لحسابك حالياً
        </div>
      )}
    </div>
  );
}
