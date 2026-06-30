"use client";

import { useState, useEffect } from "react";
import { Eye, Settings, Shield, User, Briefcase, FileText, Activity, Database, Check, Loader2 } from "lucide-react";
import { setDeveloperOverrideEmployee } from "@/app/actions/auth";
import { getAllEmployees } from "@/app/actions/employeeSettings";
import { ROLE_LABELS } from "@/lib/permissions";

export default function DeveloperRoleSwitcher({ currentEmployeeId, hideCharityClients = false }: { currentEmployeeId?: string, hideCharityClients?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [employees, setEmployees] = useState<{id: string, name: string, role: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const emps = await getAllEmployees();
      if (hideCharityClients) {
        setEmployees(emps.filter(e => e.role !== "CHARITY_CLIENT"));
      } else {
        setEmployees(emps);
      }
      setIsLoading(false);
    }
    load();
  }, [hideCharityClients]);

  const handleOverride = async (employeeId: string) => {
    setIsPending(true);
    await setDeveloperOverrideEmployee(employeeId === "DEVELOPER_RESET" ? null : employeeId);
    window.location.reload(); // Hard reload to ensure server components fetch fresh session
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {isOpen && (
          <div className="absolute bottom-full mb-4 right-0 w-72 max-h-96 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm z-10 px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 mb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                خيارات المطور (منظور حساب الموظف)
              </h4>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  disabled={isPending}
                  onClick={() => handleOverride("DEVELOPER_RESET")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    !currentEmployeeId
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 opacity-70" />
                    المطور (الصلاحية الأصلية)
                  </div>
                  {!currentEmployeeId && <Check className="w-3.5 h-3.5" />}
                </button>
                
                <div className="my-2 border-t border-slate-100 dark:border-slate-700/50"></div>
                
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    disabled={isPending}
                    onClick={() => handleOverride(emp.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                      currentEmployeeId === emp.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-semibold">{emp.name}</span>
                      <span className="text-[10px] opacity-70">{ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS] || emp.role}</span>
                    </div>
                    {currentEmployeeId === emp.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all ${
            isOpen ? "bg-slate-800 text-white dark:bg-slate-700" : "bg-primary text-white hover:bg-primary/90 hover:scale-105 active:scale-95"
          }`}
          title="منظور المطور"
        >
          <Eye className={`w-5 h-5 ${isPending ? "animate-pulse" : ""}`} />
        </button>
      </div>
    </div>
  );
}
