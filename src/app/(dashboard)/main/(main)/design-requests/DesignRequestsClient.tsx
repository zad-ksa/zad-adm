"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Palette, Plus, Filter, AlertTriangle, Loader2, Paperclip } from "lucide-react";
import DesignRequestCard, { type DesignRequestCardData } from "@/components/design-requests/DesignRequestCard";
import { markDesignRequestComplete, deleteDesignRequest } from "@/app/actions/designRequests";
import type { DesignRequestProgress } from "@/lib/designRequestProgress";
import StaffNewDesignRequestModal from "./StaffNewDesignRequestModal";
import StaffRescheduleDesignRequestModal from "./StaffRescheduleDesignRequestModal";
import StaffRescheduleCharityQueueModal from "./StaffRescheduleCharityQueueModal";
import StaffExtendDesignRequestModal from "./StaffExtendDesignRequestModal";
import { ACCEPT_ATTRIBUTE, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import { uploadDesignRequestFiles } from "@/components/design-requests/uploadDesignRequestFiles";
import DesignTypesModal, { type DesignTypeRow } from "./DesignTypesModal";
import EditDesignRequestModal from "@/components/design-requests/EditDesignRequestModal";
import StaffReviewDesignRequestModal from "./StaffReviewDesignRequestModal";
import SuccessToast from "@/components/ui/SuccessToast";
import ConfirmModal from "@/components/ui/ConfirmModal";

const DESIGN_MAX = maxBytesFor("design_request");
const DESIGN_MAX_LABEL = maxLabelFor("design_request");

type DesignStatus = "UNDER_REVIEW" | "PENDING" | "COMPLETED" | "REJECTED";

type RequestItem = DesignRequestCardData & {
  charityId: string;
  status: DesignStatus;
  /** Set only on rejected rows — shown so staff can see what was told to the charity. */
  rejectionReason?: string | null;
};
type Item = {
  request: RequestItem;
  progress: DesignRequestProgress;
  /** Raw due date in ms, for ordering — see page.tsx. */
  expectedCompletionAt: number;
};

export default function DesignRequestsClient({
  initialItems,
  charities,
  designTypes,
}: {
  initialItems: Item[];
  charities: { id: string; name: string }[];
  designTypes: DesignTypeRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [charityFilter, setCharityFilter] = useState("");
  const [tab, setTab] = useState<DesignStatus>("PENDING");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [deliverables, setDeliverables] = useState<File[]>([]);
  // This panel had no error slot at all, so an oversized file was dropped with
  // only a browser alert() — which is easy to dismiss without reading.
  const [deliverableError, setDeliverableError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // The deliverables dialog is a form, not a question — so the question comes
  // after it, the same as everywhere else here.
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [isQueueRescheduleOpen, setIsQueueRescheduleOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTypesOpen, setIsTypesOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const rows = initialItems.filter((it) => {
      if (charityFilter && it.request.charityId !== charityFilter) return false;
      return it.request.status === tab;
    });

    // Soonest delivery on top — which also floats anything already past its
    // date to the very top, since those have the earliest dates of all. The
    // other tabs keep the server's ordering: a completed or rejected request
    // has no urgency left to rank by.
    if (tab === "PENDING") {
      return [...rows].sort((a, b) => a.expectedCompletionAt - b.expectedCompletionAt);
    }
    return rows;
  }, [initialItems, charityFilter, tab]);

  const reviewCount = initialItems.filter((it) => it.request.status === "UNDER_REVIEW").length;
  const pendingCount = initialItems.filter((it) => it.request.status === "PENDING").length;
  const completedCount = initialItems.filter((it) => it.request.status === "COMPLETED").length;
  const overdueCount = initialItems.filter((it) => it.request.status === "PENDING" && it.progress.isOverdue).length;

  const handleComplete = () => {
    if (!confirmingId) return;
    setDeliverableError(null);
    setIsCompleteConfirmOpen(true);
  };

  const runComplete = async () => {
    if (!confirmingId) return;
    setIsCompleteConfirmOpen(false);
    setIsCompleting(true);
    try {
      // Uploaded only now, at the moment of delivery — an abandoned dialog
      // should not leave orphaned files in storage.
      let uploaded;
      try {
        uploaded = deliverables.length ? await uploadDesignRequestFiles(deliverables) : [];
      } catch (uploadErr) {
        // Shown above the attach control rather than in an alert(), so the
        // reason stays on screen next to the files it is about.
        setDeliverableError(uploadErr instanceof Error ? uploadErr.message : "تعذّر رفع الملفات");
        return;
      }

      const res = await markDesignRequestComplete(confirmingId, uploaded);
      if (res.error) {
        setDeliverableError(res.error);
        return;
      }
      setDeliverables([]);
      setConfirmingId(null);
      setToast("تم إنهاء الطلب وتسليمه للجمعية");
    } catch (err) {
      setDeliverableError(err instanceof Error ? err.message : "تعذّر إنهاء الطلب");
    } finally {
      setIsCompleting(false);
      startTransition(() => router.refresh());
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await deleteDesignRequest(deletingId);
      if (res.error) alert(res.error);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
      startTransition(() => router.refresh());
    }
  };

  return (
    <div className="design-requests-ui space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Bento Grid Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bento Box 1: Stats */}
        <div className="md:col-span-2 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md dark:shadow-none transition-shadow flex flex-col justify-between">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-teal-500/10 flex items-center justify-center shrink-0 border border-primary/10 dark:border-teal-500/20">
              <Palette className="w-6 h-6 text-primary dark:text-teal-400" />
            </div>
            <div>
              <h1
                className="font-bold text-slate-900 dark:text-slate-100"
                style={{ fontSize: "var(--dr-fs-h1)", letterSpacing: "var(--dr-tracking-h1)" }}
              >
                طلبات التصاميم
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1" style={{ fontSize: "var(--dr-fs-body)" }}>
                إدارة ومتابعة طلبات التصميم للجمعيات
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-primary dark:bg-teal-400"></span>
              <span className="text-slate-600 dark:text-slate-300 font-bold" style={{ fontSize: "var(--dr-fs-meta)" }}>{pendingCount} قيد التنفيذ</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-rose-600 dark:text-rose-400 font-bold" style={{ fontSize: "var(--dr-fs-meta)" }}>{overdueCount} متأخر</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
              <span className="text-slate-600 dark:text-slate-300 font-bold" style={{ fontSize: "var(--dr-fs-meta)" }}>{completedCount} منجز</span>
            </div>
          </div>
        </div>

        {/* Bento Box 2: Primary Action */}
        <div className="md:col-span-1 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md dark:shadow-none transition-shadow flex flex-col justify-center items-center text-center gap-4 group">
          <div className="w-12 h-12 rounded-full bg-primary/5 dark:bg-teal-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Plus className="w-6 h-6 text-primary dark:text-teal-400" />
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full h-12 flex items-center justify-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px rounded-xl font-bold transition-all"
            style={{ fontSize: "var(--dr-fs-body)" }}
          >
            طلب تصميم جديد
          </button>
        </div>

        {/* Bento Box 3: Filters & Tabs */}
        <div className="md:col-span-3 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80 rounded-xl p-1">
            {(
              [
                { key: "PENDING" as const, label: "الطلبات الحالية", count: pendingCount, urgent: false },
                { key: "UNDER_REVIEW" as const, label: "قيد الانتظار", count: reviewCount, urgent: true },
                { key: "COMPLETED" as const, label: "الطلبات المنجزة", count: 0, urgent: false },
                { key: "REJECTED" as const, label: "المرفوضة", count: 0, urgent: false },
              ]
            ).map(({ key, label, count, urgent }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`h-9 px-4 rounded-lg font-bold transition-all duration-300 flex items-center gap-1.5 ${
                  tab === key
                    ? "bg-white dark:bg-[#222] text-primary dark:text-teal-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                {label}
                {/* Amber only on the review queue: that number is work waiting
                    on us, while the current-requests count is just how many
                    are in flight. Same badge in two colours would flatten the
                    difference. */}
                {count > 0 && (
                  <span
                    className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black ${
                      urgent
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTypesOpen(true)}
              title="تعديل أنواع التصاميم ومدد تنفيذها"
              className="h-10 px-4 flex items-center gap-2 rounded-xl bg-slate-100 text-slate-600 dark:bg-[#111] dark:text-slate-400 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <Palette className="w-4 h-4" />
              أنواع التصاميم
            </button>
            {charityFilter && tab === "PENDING" && (
              <button
                onClick={() => setIsQueueRescheduleOpen(true)}
                className="h-10 px-4 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-400/20 hover:bg-amber-100 dark:hover:bg-amber-400/20 transition-colors font-bold"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                إعادة ترتيب التنفيذ
              </button>
            )}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={charityFilter}
                onChange={(e) => setCharityFilter(e.target.value)}
                className="h-10 pl-3 pr-9 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 dark:focus:ring-teal-500/20 focus:border-primary dark:focus:border-teal-500 outline-none transition-all appearance-none [&>option]:dark:bg-[#111]"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                <option value="">كل الجمعيات</option>
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400 dark:text-slate-600">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/60 rounded-full flex items-center justify-center">
            <Palette className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-bold text-slate-500 dark:text-slate-400" style={{ fontSize: "var(--dr-fs-title)" }}>
            لا توجد طلبات هنا
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((it) => (
            <DesignRequestCard
              key={it.request.id}
              request={it.request}
              progress={it.progress}
              actions={
                it.request.status === "UNDER_REVIEW" ? (
                  <div className="flex flex-wrap items-center gap-2 w-full mt-2">
                    <button
                      onClick={() => setReviewingId(it.request.id)}
                      className="flex-1 min-w-[120px] h-9 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors font-bold"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      مراجعة الطلب
                    </button>
                    <button
                      onClick={() => setEditingId(it.request.id)}
                      title="تعديل الوصف والمرفقات"
                      className="flex-1 min-w-[72px] h-9 rounded-xl bg-slate-100 text-slate-600 dark:bg-[#111] dark:text-slate-400 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      تعديل
                    </button>
                  </div>
                ) : it.request.status === "REJECTED" ? (
                  it.request.rejectionReason ? (
                    <div
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-rose-500/[0.06] text-rose-600 dark:text-rose-400 leading-relaxed"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      <span className="font-bold">سبب الرفض: </span>
                      {it.request.rejectionReason}
                    </div>
                  ) : null
                ) : it.request.status === "PENDING" ? (
                  // Five actions now. flex-wrap with a sensible minimum keeps
                  // them readable on a narrow card instead of crushing each to a
                  // few pixels; basis-0 lets them still share a row when there is
                  // room.
                  <div className="flex flex-wrap items-center gap-2 w-full mt-2">
                    <button
                      onClick={() => setConfirmingId(it.request.id)}
                      className="flex-1 min-w-[72px] h-9 rounded-xl bg-primary/10 text-primary dark:bg-teal-500/10 dark:text-teal-400 hover:bg-primary hover:text-white dark:hover:bg-teal-500 dark:hover:text-[#0A0A0A] transition-colors font-bold"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      إنهاء
                    </button>
                    <button
                      onClick={() => setReschedulingId(it.request.id)}
                      className="flex-1 min-w-[72px] h-9 rounded-xl bg-slate-100 text-slate-600 dark:bg-[#111] dark:text-slate-400 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      جدولة
                    </button>
                    <button
                      onClick={() => setEditingId(it.request.id)}
                      title="تعديل الوصف والمرفقات"
                      className="flex-1 min-w-[72px] h-9 rounded-xl bg-slate-100 text-slate-600 dark:bg-[#111] dark:text-slate-400 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => setExtendingId(it.request.id)}
                      title="إضافة أيام دون تغيير تاريخ البدء"
                      className="flex-1 min-w-[72px] h-9 rounded-xl bg-slate-100 text-slate-600 dark:bg-[#111] dark:text-slate-400 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      +أيام
                    </button>
                    <button
                      onClick={() => setDeletingId(it.request.id)}
                      className="flex-1 min-w-[72px] h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 dark:hover:text-[#0A0A0A] transition-colors font-bold"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      حذف
                    </button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {editingId !== null && (() => {
        const target = initialItems.find((it) => it.request.id === editingId);
        if (!target) return null;
        return (
          <EditDesignRequestModal
            request={{
              id: target.request.id,
              title: target.request.title,
              description: target.request.description,
              attachments: target.request.attachments,
            }}
            onClose={() => setEditingId(null)}
            onSuccess={(message) => {
              setEditingId(null);
              setToast(message);
              router.refresh();
            }}
          />
        );
      })()}

      {reviewingId && (() => {
        const item = initialItems.find((it) => it.request.id === reviewingId);
        if (!item) return null;
        return (
          <StaffReviewDesignRequestModal
            requestId={reviewingId}
            title={item.request.title}
            charityName={item.request.charityName ?? ""}
            suggestedDays={item.request.totalWorkingDays ?? 3}
            onClose={() => setReviewingId(null)}
            onDone={(message) => {
              setReviewingId(null);
              setToast(message);
              startTransition(() => router.refresh());
            }}
          />
        );
      })()}

      <ConfirmModal
        isOpen={isCompleteConfirmOpen}
        title="إنهاء الطلب"
        message={
          deliverables.length > 0
            ? `سيُسلَّم الطلب للجمعية مع ${deliverables.length} من الملفات، وتُحذف مرفقات الطلب الأصلية نهائياً. هل تريد المتابعة؟`
            : "سيُسلَّم الطلب للجمعية بدون ملفات نهائية، وتُحذف مرفقات الطلب الأصلية نهائياً. هل تريد المتابعة؟"
        }
        isPending={isCompleting}
        onCancel={() => setIsCompleteConfirmOpen(false)}
        onConfirm={runComplete}
      />

      <SuccessToast message={toast} onDismiss={() => setToast(null)} />

      {isTypesOpen && (
        <DesignTypesModal
          initialTypes={designTypes}
          onClose={() => setIsTypesOpen(false)}
          onChanged={() => router.refresh()}
        />
      )}

      {extendingId !== null && (() => {
        const target = initialItems.find((it) => it.request.id === extendingId);
        if (!target) return null;
        return (
          <StaffExtendDesignRequestModal
            requestId={extendingId}
            currentDays={target.request.totalWorkingDays ?? 0}
            expectedCompletionDate={target.request.expectedCompletionDate}
            onClose={() => setExtendingId(null)}
            onSuccess={() => {
              setExtendingId(null);
              router.refresh();
            }}
          />
        );
      })()}

      {isComposeOpen && (
        <StaffNewDesignRequestModal
          charities={charities}
          designTypes={designTypes.filter((t) => t.isActive)}
          onClose={() => setIsComposeOpen(false)}
          onSuccess={(message) => {
            setIsComposeOpen(false);
            setToast(message);
            router.refresh();
          }}
        />
      )}

      {confirmingId !== null && (
        <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div
            dir="rtl"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-sm p-6 text-center"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-primary dark:text-teal-300" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2" style={{ fontSize: "var(--dr-fs-title)" }}>
              إنهاء طلب التصميم
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4" style={{ fontSize: "var(--dr-fs-body)" }}>
              سيتم وضع الطلب كمُنجز، وحذف ملفات الجمعية المرفقة مع الطلب من التخزين. أما
              الملفات النهائية التي ترفعها هنا فتبقى وتظهر للجمعية.
            </p>

            <div className="mb-6 text-right">
              {deliverableError && (
                <div
                  className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold"
                  style={{ fontSize: "var(--dr-fs-meta)" }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{deliverableError}</span>
                </div>
              )}
              <label
                className="flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/40 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 transition-colors font-bold"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                <Paperclip className="w-4 h-4" />
                إرفاق الملف النهائي (اختياري)
                <input
                  type="file"
                  multiple
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    const tooBig = picked.filter((f) => f.size > DESIGN_MAX);
                    setDeliverableError(
                      tooBig.length
                        ? `تجاوز الحد (${DESIGN_MAX_LABEL}): ${tooBig.map((f) => f.name).join("، ")}`
                        : null
                    );
                    setDeliverables((prev) => [
                      ...prev,
                      ...picked.filter((f) => f.size <= DESIGN_MAX),
                    ]);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
              {deliverables.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {deliverables.map((file, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/[0.06] text-primary dark:text-teal-300"
                      style={{ fontSize: "var(--dr-fs-eyebrow)" }}
                    >
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDeliverables((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-primary/60 hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setConfirmingId(null);
                  setDeliverables([]);
                  setDeliverableError(null);
                }}
                disabled={isCompleting}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-colors disabled:opacity-50"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                إلغاء
              </button>
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] font-bold transition-all disabled:opacity-60"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                {isCompleting && <Loader2 className="w-4 h-4 animate-spin" />}
                إنهاء الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {reschedulingId !== null && (
        <StaffRescheduleDesignRequestModal
          requestId={reschedulingId}
          onClose={() => setReschedulingId(null)}
          onSuccess={() => {
            setReschedulingId(null);
            router.refresh();
          }}
        />
      )}

      {isQueueRescheduleOpen && charityFilter && (
        <StaffRescheduleCharityQueueModal
          charityId={charityFilter}
          charityName={charities.find((c) => c.id === charityFilter)?.name || ""}
          onClose={() => setIsQueueRescheduleOpen(false)}
          onSuccess={() => {
            setIsQueueRescheduleOpen(false);
            router.refresh();
          }}
        />
      )}

      {deletingId !== null && (
        <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div
            dir="rtl"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-sm p-6 text-center"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2" style={{ fontSize: "var(--dr-fs-title)" }}>
              حذف الطلب
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6" style={{ fontSize: "var(--dr-fs-body)" }}>
              هل أنت متأكد من رغبتك في حذف هذا الطلب نهائيًا؟ سيتم حذف المرفقات ولن يمكنك التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-colors disabled:opacity-50"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-sm font-bold transition-all disabled:opacity-60"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
