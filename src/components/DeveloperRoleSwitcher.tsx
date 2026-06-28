"use client";

import { useState } from "react";
import { Eye, Settings, Shield, User, Briefcase, FileText, Activity, Database, Check } from "lucide-react";
import { setDeveloperOverrideRole } from "@/app/actions/auth";

export default function DeveloperRoleSwitcher({ currentRole }: { currentRole: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Exclude ADMIN as they already have access to everything, 
  // but allow developer reset.
  const options = [
    { role: "DEVELOPER_RESET", label: "المطور (الصلاحية الأصلية)", icon: Shield },
    { role: "CHARITY_CLIENT", label: "عضو جمعية", icon: User },
    { role: "EXECUTIVE_DIRECTOR", label: "الإدارة التنفيذية", icon: Briefcase },
    { role: "STRATEGY", label: "الاستراتيجية", icon: TargetIcon },
    { role: "FINANCE", label: "المالية", icon: CoinsIcon },
    { role: "GOVERNANCE", label: "الحوكمة", icon: ScaleIcon },
  ];

  const handleOverride = async (role: string) => {
    setIsPending(true);
    await setDeveloperOverrideRole(role === "DEVELOPER_RESET" ? null : role);
    window.location.reload(); // Hard reload to ensure server components fetch fresh session
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="relative">
        {isOpen && (
          <div className="absolute bottom-full mb-4 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 mb-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                خيارات المطور (منظور الحساب)
              </h4>
            </div>
            <div className="space-y-1">
              {options.map((opt) => (
                <button
                  key={opt.role}
                  disabled={isPending}
                  onClick={() => handleOverride(opt.role)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    (currentRole === opt.role || (opt.role === "DEVELOPER_RESET" && currentRole === "ADMIN"))
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4 opacity-70" />
                    {opt.label}
                  </div>
                  {currentRole === opt.role && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
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

function TargetIcon(props: any) {
  return <Activity {...props} />;
}
function CoinsIcon(props: any) {
  return <Database {...props} />;
}
function ScaleIcon(props: any) {
  return <FileText {...props} />;
}
