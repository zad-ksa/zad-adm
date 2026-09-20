"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { getMailApproverSettings, setMailApprovers } from "@/app/actions/mailApproval";
import BrandSelect from "@/components/ui/BrandSelect";

type EmployeeOption = { id: string; name: string; role: string };

/**
 * إعدادات البريد: من يعمّد بريد كل خدمة.
 *
 * التعيين بالاسم لا بالمسمّى ولا بالدور — كما استقرّ عليه منح الخدمات نفسه.
 * وخدمةٌ بلا معمِّد تخرج رسائلها مباشرةً، فالتعميد يُضاف حيث يُراد ولا يُفرض
 * على الجميع لأن أحدهم أراده.
 */
export default function MailSettingsPanel() {
  const [services, setServices] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [byService, setByService] = useState<Record<string, string[]>>({});
  // مرشَّحو كل خدمة: من مُنحوها وحدهم.
  const [eligible, setEligible] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingService, setSavingService] = useState<string | null>(null);
  const [savedService, setSavedService] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMailApproverSettings()
      .then((data) => {
        if (cancelled) return;
        setServices(data.services);
        setEmployees(data.employees);
        setEligible(data.eligible);
        const map: Record<string, string[]> = {};
        for (const name of data.services) map[name] = [];
        for (const row of data.approvers) {
          map[row.serviceName] = [...(map[row.serviceName] ?? []), row.employeeId];
        }
        setByService(map);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذّر جلب الإعدادات");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (serviceName: string, ids: string[]) => {
    const previous = byService[serviceName] ?? [];
    setByService((prev) => ({ ...prev, [serviceName]: ids }));
    setSavingService(serviceName);
    setError(null);
    try {
      await setMailApprovers(serviceName, ids);
      setSavedService(serviceName);
      setTimeout(() => setSavedService((s) => (s === serviceName ? null : s)), 2000);
    } catch (err) {
      // الرجوع إلى ما كان: قائمةٌ معروضة لم تُحفظ أسوأ من خطأ ظاهر.
      setByService((prev) => ({ ...prev, [serviceName]: previous }));
      setError(err instanceof Error ? err.message : "تعذّر الحفظ");
    } finally {
      setSavingService(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <LoaderCircle className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <header className="space-y-1">
        <h2 className="text-[length:var(--mail-fs-subject)] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary dark:text-teal-300" />
          معمِّدو البريد الصادر إلى الجمعيات
        </h2>
        <p className="text-[length:var(--mail-fs-nav)] text-slate-500 dark:text-slate-400 leading-relaxed">
          بريد الخدمة يخرج باسمها، فمن يُعيَّن هنا يقرؤه قبل أن يصل الجمعية: يعتمده، أو
          يعدّله ثم يعتمده، أو يُرجعه إلى مسودات صاحبه بملاحظة.
          <br />
          <span className="text-slate-400 dark:text-slate-500">
            خدمةٌ بلا معمِّدين يخرج بريدها مباشرةً. والمعمِّد لا يُعمَّد عليه بريده هو.
          </span>
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-[length:var(--mail-fs-nav)] font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {services.map((name) => {
          const ids = byService[name] ?? [];
          const holders = eligible[name] ?? [];
          const candidates = employees.filter((e) => holders.includes(e.id) && !ids.includes(e.id));
          return (
            <div key={name} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 bg-white dark:bg-slate-900">
              <div className="sm:w-56 shrink-0">
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-[length:var(--mail-fs-nav)]">
                  {name}
                </div>
                <div className="text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                  {savingService === name && <LoaderCircle className="w-3 h-3 animate-spin" />}
                  {savedService === name && <Check className="w-3 h-3 text-primary" />}
                  {ids.length === 0 ? "بلا تعميد" : `${ids.length} معمِّداً`}
                </div>
              </div>

              <div className="flex-1 flex flex-wrap gap-2 items-center">
                {ids.map((id) => {
                  const person = employees.find((e) => e.id === id);
                  return (
                    <span
                      key={id}
                      className="h-7 px-2.5 rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-medium"
                    >
                      {person?.name ?? id}
                      <button
                        type="button"
                        onClick={() => save(name, ids.filter((i) => i !== id))}
                        className="opacity-60 hover:opacity-100"
                        title="إزالة"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* المرشَّحون: من مُنحوا هذه الخدمة وحدهم. ومن مُنحها كلهم معمِّدون
                    بالفعل، فلا يبقى في القائمة أحد. */}
                <BrandSelect
                  placeholder={ids.length === 0 ? "تعيين معمِّد…" : "إضافة معمِّد…"}
                  emptyLabel={
                    candidates.length === 0 && (eligible[name] ?? []).length === 0
                      ? "لا موظف مُنح هذه الخدمة"
                      : "كل من مُنح الخدمة معمِّد"
                  }
                  options={candidates.map((e) => ({ value: e.id, label: e.name }))}
                  onSelect={(id) => save(name, [...ids, id])}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
