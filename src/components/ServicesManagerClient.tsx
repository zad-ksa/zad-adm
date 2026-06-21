"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Calendar, LayoutList, ChevronDown, ChevronUp, Map } from "lucide-react";
import { createService, updateService, deleteService, addServiceStage, updateServiceStage, deleteServiceStage } from "@/app/actions/services";

type ServiceStage = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
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
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(initialServices.length > 0 ? initialServices[0].id : null);
  
  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ServiceStage | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);

  // Form State - Service
  const [serviceName, setServiceName] = useState("");
  const [serviceDepartment, setServiceDepartment] = useState("");

  // Form State - Stage
  const [stageName, setStageName] = useState("");
  const [stageDescription, setStageDescription] = useState("");
  const [stageStartDate, setStageStartDate] = useState("");
  const [stageEndDate, setStageEndDate] = useState("");

  const openAddService = () => {
    setEditingService(null);
    setServiceName("");
    setServiceDepartment("");
    setIsServiceModalOpen(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDepartment(service.department || "");
    setIsServiceModalOpen(true);
  };

  const openAddStage = (serviceId: string) => {
    setActiveServiceId(serviceId);
    setEditingStage(null);
    setStageName("");
    setStageDescription("");
    setStageStartDate("");
    setStageEndDate("");
    setIsStageModalOpen(true);
  };

  const openEditStage = (serviceId: string, stage: ServiceStage) => {
    setActiveServiceId(serviceId);
    setEditingStage(stage);
    setStageName(stage.name);
    setStageDescription(stage.description || "");
    setStageStartDate(stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : "");
    setStageEndDate(stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : "");
    setIsStageModalOpen(true);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingService) {
          const updated = await updateService(editingService.id, serviceName, serviceDepartment || null);
          setServices(services.map(s => s.id === updated.id ? { ...s, name: updated.name, department: updated.department } : s));
        } else {
          const created = await createService(charityId, serviceName, serviceDepartment || null);
          setServices([{...created, stages: []}, ...services]);
          setExpandedServiceId(created.id);
        }
        setIsServiceModalOpen(false);
      } catch (error) {
        console.error("Error saving service", error);
        alert("حدث خطأ أثناء حفظ الخدمة");
      }
    });
  };

  const handleDeleteService = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة بالكامل مع جميع مراحلها؟")) return;
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

  const handleStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServiceId) return;

    const start = stageStartDate ? new Date(stageStartDate) : null;
    const end = stageEndDate ? new Date(stageEndDate) : null;

    startTransition(async () => {
      try {
        if (editingStage) {
          const updated = await updateServiceStage(editingStage.id, stageName, stageDescription || null, start, end);
          setServices(services.map(s => {
            if (s.id === activeServiceId) {
              return { ...s, stages: s.stages.map(st => st.id === updated.id ? updated : st) };
            }
            return s;
          }));
        } else {
          const created = await addServiceStage(activeServiceId, stageName, stageDescription || null, start, end);
          setServices(services.map(s => {
            if (s.id === activeServiceId) {
              return { ...s, stages: [...s.stages, created] };
            }
            return s;
          }));
        }
        setIsStageModalOpen(false);
      } catch (error) {
        console.error("Error saving stage", error);
        alert("حدث خطأ أثناء حفظ المرحلة");
      }
    });
  };

  const handleDeleteStage = (serviceId: string, stageId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟")) return;
    startTransition(async () => {
      try {
        await deleteServiceStage(stageId);
        setServices(services.map(s => {
          if (s.id === serviceId) {
            return { ...s, stages: s.stages.filter(st => st.id !== stageId) };
          }
          return s;
        }));
      } catch (error) {
        console.error("Error deleting stage", error);
        alert("حدث خطأ أثناء الحذف");
      }
    });
  };

  const getDepartmentLabel = (val: string | null) => {
    if (!val) return "لا يتبع لأي قسم";
    const found = DEPARTMENTS.find(d => d.value === val);
    return found ? found.label : val;
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
            إضافة خدمة جديدة
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
        <div className="space-y-6">
          {services.map(service => {
            const isExpanded = expandedServiceId === service.id;
            
            return (
              <div key={service.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-300">
                
                {/* Service Header */}
                <div 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                  onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <LayoutList className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{service.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700">
                          القسم: {getDepartmentLabel(service.department)}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {service.stages.length} مراحل
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 sm:mt-0" onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <div className="flex items-center gap-2 mr-auto sm:mr-0 ml-4 border-l border-slate-200 dark:border-slate-700 pl-4">
                        <button onClick={() => openEditService(service)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="تعديل الخدمة">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteService(service.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="حذف الخدمة">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>
                </div>

                {/* Service Timeline / Stages */}
                {isExpanded && (
                  <div className="p-6 md:p-8 animate-in fade-in duration-300">
                    
                    {isAdmin && (
                      <div className="mb-8 flex justify-end">
                        <button
                          onClick={() => openAddStage(service.id)}
                          className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة مرحلة زمنية
                        </button>
                      </div>
                    )}

                    {service.stages.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Calendar className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p>لا توجد مراحل في الخط الزمني لهذه الخدمة</p>
                      </div>
                    ) : (
                      <div className="relative border-r-2 border-slate-200 dark:border-slate-700 pr-6 space-y-8">
                        {service.stages.map((stage, idx) => (
                          <div key={stage.id} className="relative group">
                            {/* Timeline node */}
                            <div className="absolute -right-[33px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-primary shadow-[0_0_0_4px_rgba(255,255,255,1)] dark:shadow-[0_0_0_4px_rgba(30,41,59,1)] z-10 transition-transform group-hover:scale-125"></div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 p-5 hover:shadow-md transition-all">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                  <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">
                                    <span className="text-primary mr-1 text-sm">{idx + 1}.</span> {stage.name}
                                  </h4>
                                  
                                  {(stage.startDate || stage.endDate) && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3 bg-white dark:bg-slate-800 inline-flex px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                      <Calendar className="w-4 h-4" />
                                      <span>
                                        {stage.startDate ? new Intl.DateTimeFormat('ar-SA').format(new Date(stage.startDate)) : 'غير محدد'}
                                      </span>
                                      <span className="px-1 text-slate-300">-</span>
                                      <span>
                                        {stage.endDate ? new Intl.DateTimeFormat('ar-SA').format(new Date(stage.endDate)) : 'غير محدد'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {stage.description && (
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                      {stage.description}
                                    </p>
                                  )}
                                </div>
                                
                                {isAdmin && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 self-start">
                                    <button onClick={() => openEditStage(service.id, stage)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="تعديل المرحلة">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteStage(service.id, stage.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="حذف المرحلة">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsServiceModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editingService ? "تعديل الخدمة" : "إضافة خدمة جديدة"}
              </h2>
            </div>
            <form onSubmit={handleServiceSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الخدمة</label>
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
                  في حال اختيار قسم معين، سيظهر الخط الزمني لهذه الخدمة أيضاً في تبويب القسم المختار.
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

      {/* Stage Modal */}
      {isStageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsStageModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editingStage ? "تعديل المرحلة" : "إضافة مرحلة جديدة"}
              </h2>
            </div>
            <form onSubmit={handleStageSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم المرحلة</label>
                <input
                  type="text"
                  required
                  value={stageName}
                  onChange={e => setStageName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                  placeholder="مثال: تحليل الفجوة، إعداد التقرير..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الوصف (اختياري)</label>
                <textarea
                  value={stageDescription}
                  onChange={e => setStageDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none dark:text-white custom-scrollbar"
                  placeholder="اكتب وصفاً مفصلاً للمرحلة..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تاريخ البداية (اختياري)</label>
                  <input
                    type="date"
                    value={stageStartDate}
                    onChange={e => setStageStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تاريخ النهاية (اختياري)</label>
                  <input
                    type="date"
                    value={stageEndDate}
                    onChange={e => setStageEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={isPending || !stageName.trim()}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsStageModalOpen(false)}
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
