"use client";

import { useState, useTransition } from "react";
import { Plus, Map } from "lucide-react";
import { createService, deleteService } from "@/app/actions/services";
import ServiceTimeline from "./ServiceTimeline";

type ServiceStage = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
  isCurrent: boolean;
};

type Service = {
  id: string;
  name: string;
  department: string | null;
  stages: ServiceStage[];
};

const DEPARTMENTS = [
  { value: "", label: "لا يتبع لأي قسم" },
  { value: "STRATEGY", label: "الاستراتيجية" },
  { value: "GOVERNANCE", label: "الحوكمة" },
  { value: "FINANCE", label: "المالية" },
  { value: "PROGRAMS", label: "البرامج والمشاريع" },
  { value: "HR", label: "الموارد البشرية" }
];

export default function ServicesManagerClient({
  charityId,
  initialServices,
  isAdmin,
}: {
  charityId: string;
  initialServices: Service[];
  isAdmin: boolean;
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDepartment, setServiceDepartment] = useState("");

  const openAddService = () => {
    setServiceName("");
    setServiceDepartment("");
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const created = await createService(charityId, serviceName, serviceDepartment || null);
        setServices([{...created, stages: []}, ...services]);
        setIsServiceModalOpen(false);
      } catch (error) {
        console.error("Error saving service", error);
        alert("حدث خطأ أثناء حفظ الخدمة");
      }
    });
  };

  const handleDeleteService = (id: string) => {
    startTransition(async () => {
      try {
        await deleteService(id);
        setServices(services.filter(s => s.id !== id));
      } catch (error) {
        console.error("Error deleting service", error);
        alert("حدث خطأ أثناء الحذف");
      }
    });
  };

  return (
    <div className="space-y-8">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={openAddService}
            disabled={isPending}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            إضافة خط زمني جديد
          </button>
        </div>
      )}

      {services.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <Map className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">لا توجد خدمات مضافة</h3>
          <p className="text-slate-500 dark:text-slate-400">لم يتم إضافة أي خدمات أو خطوط زمنية لهذه الجمعية بعد.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {services.map(service => (
            <ServiceTimeline 
              key={service.id} 
              charityId={charityId} 
              initialService={service} 
              isAdmin={isAdmin}
              onDeleteService={handleDeleteService}
            />
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsServiceModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                إضافة خط زمني جديد
              </h2>
            </div>
            <form onSubmit={handleServiceSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الخدمة / الخط الزمني</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                  placeholder="مثال: تقديم استشارات إدارية..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">القسم التابع له (اختياري)</label>
                <select
                  value={serviceDepartment}
                  onChange={e => setServiceDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  في حال اختيار قسم معين، سيظهر هذا الخط الزمني أيضاً في تبويب القسم المختار تلقائياً.
                </p>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={isPending || !serviceName.trim()}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
