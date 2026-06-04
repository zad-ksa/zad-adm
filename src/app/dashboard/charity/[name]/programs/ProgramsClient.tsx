"use client";

import { useState, useTransition } from "react";
import { 
  Plus, 
  Trash2, 
  FolderHeart, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Sparkles,
  ClipboardList
} from "lucide-react";
import { addProgramAction, deleteProgramAction } from "@/app/actions/programs";

interface Program {
  id: string;
  name: string;
  beneficiaries: number;
  charityId: string;
  createdAt: Date | string;
}

interface Charity {
  id: string;
  name: string;
  logoUrl: string | null;
}

export default function ProgramsClient({
  charity,
  initialPrograms,
}: {
  charity: Charity;
  initialPrograms: any[];
}) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [programName, setProgramName] = useState("");
  const [beneficiariesCount, setBeneficiariesCount] = useState<number | "">("");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(message);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Calculate totals
  const totalPrograms = programs.length;
  const totalBeneficiaries = programs.reduce((sum, p) => sum + p.beneficiaries, 0);

  // Handle adding a program
  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName.trim() || beneficiariesCount === "") return;

    startTransition(async () => {
      const res = await addProgramAction(
        charity.id,
        programName.trim(),
        Number(beneficiariesCount)
      );

      if (res.error) {
        showNotification("error", res.error);
      } else if (res.success && res.program) {
        setPrograms((prev) => [res.program as Program, ...prev]);
        setProgramName("");
        setBeneficiariesCount("");
        showNotification("success", "تم إضافة البرنامج بنجاح");
      }
    });
  };

  // Handle deleting a program
  const handleDeleteProgram = async (programId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا البرنامج؟")) return;

    startTransition(async () => {
      const res = await deleteProgramAction(programId);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setPrograms((prev) => prev.filter((p) => p.id !== programId));
        showNotification("success", "تم حذف البرنامج بنجاح");
      }
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {charity.logoUrl ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-white flex items-center justify-center">
                  <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain p-1" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <ClipboardList className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 tracking-tight">{charity.name}</h1>
                <p className="text-slate-500 font-medium">البرامج والمشاريع التنموية</p>
              </div>
            </div>

            {/* Quick summary stats */}
            <div className="flex items-center gap-4">
              <div className="bg-violet-50 text-violet-700 px-4 py-2.5 rounded-2xl border border-violet-100 flex items-center gap-2 shadow-sm shrink-0">
                <FolderHeart className="w-5 h-5" />
                <div>
                  <div className="text-[10px] font-bold text-violet-400">إجمالي البرامج</div>
                  <div className="text-sm font-black">{totalPrograms} برامج</div>
                </div>
              </div>

              <div className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-2xl border border-indigo-100 flex items-center gap-2 shadow-sm shrink-0">
                <Users className="w-5 h-5" />
                <div>
                  <div className="text-[10px] font-bold text-indigo-400">إجمالي المستفيدين</div>
                  <div className="text-sm font-black">{totalBeneficiaries.toLocaleString()} مستفيد</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Right side: Add Program Form (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              إضافة برنامج أو مشروع
            </h3>

            <form onSubmit={handleAddProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">اسم البرنامج أو المشروع</label>
                <input
                  type="text"
                  required
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="مثال: برنامج الحوكمة المتميز..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">عدد المستفيدين من البرنامج</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={beneficiariesCount}
                  onChange={(e) => setBeneficiariesCount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="أدخل عدد المستفيدين..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-805 transition-all font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !programName.trim() || beneficiariesCount === ""}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة البرنامج</span>
              </button>
            </form>
          </div>
        </div>

        {/* Left side: Programs List (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-50 pb-3">
              قائمة البرامج والمشاريع المضافة ({programs.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold">
                    <th className="pb-3 pr-2">اسم البرنامج / المشروع</th>
                    <th className="pb-3 text-center">عدد المستفيدين</th>
                    <th className="pb-3 text-center">تاريخ الإضافة</th>
                    <th className="pb-3 text-left pl-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {programs.map((program) => (
                    <tr key={program.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 pr-2 font-bold text-slate-800 text-sm">
                        {program.name}
                      </td>
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                          <Users className="w-3.5 h-3.5" />
                          {program.beneficiaries.toLocaleString()} مستفيد
                        </span>
                      </td>
                      <td className="py-4 text-center text-xs text-slate-400 font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(program.createdAt).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </div>
                      </td>
                      <td className="py-4 text-left pl-2">
                        <button
                          onClick={() => handleDeleteProgram(program.id)}
                          title="حذف البرنامج"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {programs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-slate-400">
                        <div className="text-3xl mb-3 opacity-40">📂</div>
                        <p className="font-bold text-sm text-slate-700 mb-1">لا توجد برامج مضافة حالياً</p>
                        <p className="text-xs text-slate-400 font-medium">يمكنك استخدام النموذج لإضافة أول البرامج والمشاريع للجمعية.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
