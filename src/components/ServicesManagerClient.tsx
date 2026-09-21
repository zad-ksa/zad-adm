"use client";

import { useState, useTransition } from "react";
import Select from "@/components/console/Select";
import { Plus, Layers, AlertTriangle, AlertCircle } from "lucide-react";
import { createService, unifyCharityStagesAction } from "@/app/actions/services";
import { useRouter } from "next/navigation";

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

/**
 * لوحة صفحة الجمعية: زرّان لكلٍّ منهما حكمه، لا شرطٌ واحد لهما معاً.
 *
 * كانت اللوحة كلها تُرسم لـisAdmin (مدير النظام || manage_services)، فكانت
 * الإضافة والتعميم قدرةً واحدة. الآن:
 *   • «إضافة خدمة جديدة» لحامل manage_services.
 *   • «التعميم» لمن مُنح خدمةً واحدة على الأقل في هذه الجمعية، ويعمّم خدماته
 *     الممنوحة وحدها، على الجمعيات المسنَدة إليه وحدها — والخادم يفرض الأمرين.
 */
export default function ServicesManagerClient({
  charityId,
  unifiableServices,
  canAddService,
}: {
  charityId: string;
  /** خدمات هذه الجمعية الممنوحة للموظف — مصادر التعميم الجائزة له. */
  unifiableServices: Service[];
  canAddService: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  /** رفض الخادم للاسم («توجد خدمة بهذا الاسم») يُعرض تحت الحقل، لا في alert. */
  const [serviceError, setServiceError] = useState<string | null>(null);

  const [isUnifyModalOpen, setIsUnifyModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(unifiableServices[0]?.id ? `CUSTOM_${unifiableServices[0].id}` : "");

  const canUnify = unifiableServices.length > 0;

  const openAddService = () => {
    setServiceName("");
    setServiceError(null);
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await createService(charityId, serviceName.trim(), null);
        if (res?.error) {
          setServiceError(res.error);
          return;
        }
        setIsServiceModalOpen(false);
        router.refresh();
      } catch (error: any) {
        console.error("Error saving service", error);
        alert(error.message || "حدث خطأ أثناء حفظ الخدمة");
      }
    });
  };

  const handleUnifySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let sourceTimelineType = selectedSource;
    let sourceServiceId: string | undefined = undefined;

    if (selectedSource.startsWith("CUSTOM_")) {
      sourceTimelineType = "CUSTOM";
      sourceServiceId = selectedSource.replace("CUSTOM_", "");
    }

    startTransition(async () => {
      try {
        await unifyCharityStagesAction(charityId, sourceTimelineType, sourceServiceId);
        setIsUnifyModalOpen(false);
        router.refresh();
      } catch (error: any) {
        console.error("Error unifying stages", error);
        alert(error.message || "حدث خطأ أثناء توحيد المراحل");
      }
    });
  };

  if (!canAddService && !canUnify) return null;

  return (
    <>
      <div className="flex justify-end gap-3 mb-6">
        {canUnify && (
          <button
            onClick={() => setIsUnifyModalOpen(true)}
            disabled={isPending}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Layers className="w-4 h-4 text-amber-500" />
            تعميم مراحل خدمة على الجمعيات
          </button>
        )}
        {canAddService && (
          <button
            onClick={openAddService}
            disabled={isPending}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            إضافة خدمة جديدة
          </button>
        )}
      </div>

      {/* Add Service Modal */}
      {isServiceModalOpen && canAddService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsServiceModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                إضافة خدمة جديدة
              </h2>
            </div>
            <form onSubmit={handleServiceSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الخدمة</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={e => { setServiceName(e.target.value); setServiceError(null); }}
                  aria-invalid={!!serviceError}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 outline-none transition-all dark:text-white text-sm ${
                    serviceError
                      ? "border-red-400 focus:ring-red-200 focus:border-red-400"
                      : "border-slate-200 dark:border-slate-700 focus:ring-primary focus:border-primary"
                  }`}
                  placeholder="مثال: خدمة الإسناد الإداري..."
                />
                {serviceError && (
                  <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {serviceError}
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={isPending || !serviceName.trim()}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-2 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-xl font-bold transition-colors text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unify Stages Modal */}
      {isUnifyModalOpen && canUnify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsUnifyModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700" dir="rtl">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="p-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  تعميم مراحل الخدمة على الجمعيات الأخرى
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  نسخ مراحل خدمة من هذه الجمعية وتعميمها على الخدمة نفسها في الجمعيات الأخرى التي لك وصولٌ إليها
                </p>
              </div>
            </div>
            <form onSubmit={handleUnifySubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  الخدمة المصدر (التي ستُنسخ مراحلها):
                </label>
                <Select
                  variant="soft"
                  value={selectedSource}
                  onSelect={setSelectedSource}
                  disabled={isPending}
                  placeholder="اختر الخدمة"
                  options={unifiableServices.map(service => ({ value: `CUSTOM_${service.id}`, label: service.name }))}
                  className="w-full [&>button]:w-full [&>button]:justify-between"
                />
              </div>

              {/* Warning box */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-800 dark:text-red-400">تنبيه هام جداً وإجراء غير قابل للتراجع</h4>
                  <p className="text-xs text-red-700/90 dark:text-red-300/80 leading-relaxed">
                    عند إتمام هذه العملية، سيتم <strong>حذف كافة المراحل الحالية للخدمة المختارة</strong> في الجمعيات الأخرى التي لك وصولٌ إليها نهائياً، وسيتم <strong>إنشاء نسخ متطابقة</strong> من مراحل هذه الخدمة لتلك الجمعيات.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={isPending || !selectedSource}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white py-2 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isPending ? "جاري تعميم المراحل..." : "تأكيد التعميم وتطبيق المراحل"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsUnifyModalOpen(false)}
                  disabled={isPending}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
