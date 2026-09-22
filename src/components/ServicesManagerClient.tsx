"use client";

import { useState, useTransition } from "react";
import { notify } from "@/components/console/toastBus";
import Select from "@/components/console/Select";
import { Plus, Layers, AlertTriangle, AlertCircle } from "lucide-react";
import { createService, unifyCharityStagesAction } from "@/app/actions/services";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

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
        notify("error", error.message || "حدث خطأ أثناء حفظ الخدمة");
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
        notify("error", error.message || "حدث خطأ أثناء توحيد المراحل");
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
        <Dialog
title="إضافة خدمة جديدة"
onClose={() => setIsServiceModalOpen(false)}
onSubmit={handleServiceSubmit}
footer={
<>
<button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className={btn.secondary}
                >
                  إلغاء
                </button>
<button
                  type="submit"
                  disabled={isPending || !serviceName.trim()}
                  className={btn.primary}
                >
                  {isPending ? "جاري الحفظ..." : "حفظ"}
                </button>
</>
}
>
<div className="space-y-4">
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
</div>
</Dialog>
      )}

      {/* Unify Stages Modal */}
      {isUnifyModalOpen && canUnify && (
        <Dialog
title="تعميم مراحل الخدمة على الجمعيات الأخرى"
description="نسخ مراحل خدمة من هذه الجمعية وتعميمها على الخدمة نفسها في الجمعيات الأخرى التي لك وصولٌ إليها"
onClose={() => setIsUnifyModalOpen(false)}
onSubmit={handleUnifySubmit}
footer={
<>
<button
                  type="button"
                  onClick={() => setIsUnifyModalOpen(false)}
                  disabled={isPending}
                  className={btn.secondary}
                >
                  إلغاء
                </button>
<button
                  type="submit"
                  disabled={isPending || !selectedSource}
                  className={btn.danger}
                >
                  {isPending ? "جاري تعميم المراحل..." : "تأكيد التعميم وتطبيق المراحل"}
                </button>
</>
}
>
<div className="space-y-4">
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
</div>
</Dialog>
      )}
    </>
  );
}
