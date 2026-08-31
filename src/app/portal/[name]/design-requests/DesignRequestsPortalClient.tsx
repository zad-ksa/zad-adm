"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Info, Palette } from "lucide-react";
import DesignRequestCard, { type DesignRequestCardData } from "@/components/design-requests/DesignRequestCard";
import EditDesignRequestModal from "@/components/design-requests/EditDesignRequestModal";
import type { DesignRequestProgress } from "@/lib/designRequestProgress";
import SuccessToast from "@/components/ui/SuccessToast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import RequestRevisionModal from "@/components/design-requests/RequestRevisionModal";
import { approveDeliveryByCharity } from "@/app/actions/designRequests";
import NewDesignRequestForm from "./NewDesignRequestForm";
import type { DesignTypeOption } from "@/components/design-requests/DesignTypePicker";

type Item = {
  request: DesignRequestCardData & {
    status:
      | "UNDER_REVIEW"
      | "PENDING"
      | "AWAITING_REVIEW"
      | "REVISION_REQUESTED"
      | "COMPLETED"
      | "REJECTED";
    /** Written by staff when rejecting; this is what the charity reads. */
    rejectionReason?: string | null;
    /** Selected design types, for prefilling a resubmission. */
    typeIds?: string[];
    /** Notes this charity sent back with a delivery. */
    revisionNotes?: string | null;
    /** Settled by the deadline rather than by this charity. */
    autoApproved?: boolean;
  };
  progress: DesignRequestProgress;
};

export default function DesignRequestsPortalClient({
  charityId,
  initialItems,
  canCreate,
  designTypes,
}: {
  charityId: string;
  initialItems: Item[];
  canCreate: boolean;
  designTypes: DesignTypeOption[];
}) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  type PortalTab = "AWAITING_REVIEW" | "UNDER_REVIEW" | "PENDING" | "REVISION_REQUESTED" | "COMPLETED" | "REJECTED";
  const [tab, setTab] = useState<PortalTab>("PENDING");
  const [resubmitId, setResubmitId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const reviewCount = initialItems.filter((it) => it.request.status === "UNDER_REVIEW").length;
  const awaitingYouCount = initialItems.filter((it) => it.request.status === "AWAITING_REVIEW").length;
  const revisionCount = initialItems.filter((it) => it.request.status === "REVISION_REQUESTED").length;
  const rejectedCount = initialItems.filter((it) => it.request.status === "REJECTED").length;
  const pendingCount = initialItems.filter((it) => it.request.status === "PENDING").length;
  const completedCount = initialItems.filter((it) => it.request.status === "COMPLETED").length;
  const filtered = initialItems.filter((it) => it.request.status === tab);

  return (
    <div className="design-requests-ui space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Bento Grid Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bento Box 1: Info & Stats */}
        <div className="md:col-span-2 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md dark:shadow-none transition-shadow flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
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
                  تُنجز الطلبات خلال 3 أيام عمل
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-primary dark:bg-teal-400"></span>
              <span className="text-slate-600 dark:text-slate-300 font-bold" style={{ fontSize: "var(--dr-fs-meta)" }}>{pendingCount} قيد التنفيذ</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
              <span className="text-slate-600 dark:text-slate-300 font-bold" style={{ fontSize: "var(--dr-fs-meta)" }}>{completedCount} منجز</span>
            </div>
          </div>
        </div>

        {/* Bento Box 2: Primary Action — hidden without create_design_requests.
            Cosmetic only; the server action re-checks the same permission. */}
        {canCreate && (
        <div className="md:col-span-1 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md dark:shadow-none transition-shadow flex flex-col justify-center items-center text-center gap-4 group">
          <div className="w-12 h-12 rounded-full bg-primary/5 dark:bg-teal-500/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Plus className="w-6 h-6 text-primary dark:text-teal-400" />
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="w-full h-12 flex items-center justify-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px rounded-xl font-bold transition-all"
            style={{ fontSize: "var(--dr-fs-body)" }}
          >
            طلب تصميم جديد
          </button>
        </div>
        )}

        {/* Bento Box 3: Tabs & Warning */}
        <div className="md:col-span-3 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80 rounded-xl p-1">
            {(
              [
                { key: "AWAITING_REVIEW" as const, label: "بانتظار مراجعتك", count: awaitingYouCount },
                { key: "PENDING" as const, label: "الطلبات الحالية", count: 0 },
                { key: "REVISION_REQUESTED" as const, label: "قيد التعديل", count: revisionCount },
                { key: "UNDER_REVIEW" as const, label: "قيد المراجعة", count: reviewCount },
                { key: "COMPLETED" as const, label: "الطلبات المنجزة", count: 0 },
                { key: "REJECTED" as const, label: "المرفوضة", count: rejectedCount },
              ]
            ).map(({ key: t, label, count }) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-9 px-5 rounded-lg font-bold transition-all duration-300 ${
                  tab === t
                    ? "bg-white dark:bg-[#222] text-primary dark:text-teal-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`inline-flex min-w-[18px] h-[18px] px-1 ms-1.5 items-center justify-center rounded-full text-[10px] font-black text-white ${
                      t === "REJECTED" ? "bg-rose-500" : "bg-amber-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span style={{ fontSize: "var(--dr-fs-meta)" }}>الطلبات تُنفَّذ بالترتيب، طلباً تلو الآخر</span>
          </div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400 dark:text-slate-600">
          <div className="w-16 h-16 bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/60 rounded-3xl flex items-center justify-center shadow-sm">
            <Palette className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-bold text-slate-500 dark:text-slate-400" style={{ fontSize: "var(--dr-fs-title)" }}>
            لا توجد طلبات تصاميم هنا
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
                it.request.status === "AWAITING_REVIEW" ? (
                  canCreate ? (
                    <div className="w-full mt-2 space-y-2">
                      <button
                        onClick={() => setApprovingId(it.request.id)}
                        className="w-full h-10 rounded-xl text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px transition-all font-bold"
                        style={{ fontSize: "var(--dr-fs-meta)" }}
                      >
                        اعتماد نهائي
                      </button>
                      <button
                        onClick={() => setRevisionFor(it.request.id)}
                        className="w-full h-8 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors font-medium"
                        style={{ fontSize: "var(--dr-fs-eyebrow)" }}
                      >
                        لديّ ملاحظات
                      </button>
                    </div>
                  ) : null
                ) : it.request.status === "REVISION_REQUESTED" ? (
                  <div
                    className="w-full mt-2 px-3 py-2.5 rounded-xl bg-amber-500/[0.08] text-amber-700 dark:text-amber-400 leading-relaxed"
                    style={{ fontSize: "var(--dr-fs-meta)" }}
                  >
                    <span className="font-bold">ملاحظاتك: </span>
                    {it.request.revisionNotes || "—"}
                  </div>
                ) : it.request.status === "REJECTED" ? (
                  <div className="w-full mt-2 space-y-2">
                    <div
                      className="px-3 py-2.5 rounded-xl bg-rose-500/[0.06] text-rose-600 dark:text-rose-400 leading-relaxed"
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      <span className="font-bold">سبب الرفض: </span>
                      {it.request.rejectionReason || "لم يُذكر سبب."}
                    </div>
                    {canCreate && (
                      <button
                        onClick={() => setResubmitId(it.request.id)}
                        className="w-full h-9 rounded-xl bg-primary/10 text-primary dark:bg-teal-500/10 dark:text-teal-400 hover:bg-primary hover:text-white dark:hover:bg-teal-500 dark:hover:text-[#0A0A0A] transition-colors font-bold"
                        style={{ fontSize: "var(--dr-fs-meta)" }}
                      >
                        إعادة رفع الطلب
                      </button>
                    )}
                  </div>
                ) : it.request.status === "UNDER_REVIEW" ? (
                  <div
                    className="w-full mt-2 px-3 py-2.5 rounded-xl bg-amber-500/[0.08] text-amber-700 dark:text-amber-400 leading-relaxed"
                    style={{ fontSize: "var(--dr-fs-meta)" }}
                  >
                    قيد المراجعة — سيتم الرد خلال 24 ساعة. الموعد الظاهر تقديري حتى الاعتماد.
                  </div>
                ) : // Editing is for a brief still being worked on; a delivered
                // request has none left to edit.
                canCreate && it.request.status === "PENDING" ? (
                  <button
                    onClick={() => setEditingId(it.request.id)}
                    className="h-9 px-4 rounded-xl bg-slate-100 text-slate-600 dark:bg-[#111] dark:text-slate-400 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold"
                    style={{ fontSize: "var(--dr-fs-meta)" }}
                  >
                    تعديل
                  </button>
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

      {isFormOpen && canCreate && (
        <NewDesignRequestForm
          charityId={charityId}
          designTypes={designTypes}
          onClose={() => setIsFormOpen(false)}
          onSuccess={(message) => {
            setIsFormOpen(false);
            setToast(message);
            router.refresh();
          }}
        />
      )}

      {/* Same form, prefilled — a rejected request is edited and sent back
          through review rather than retyped from scratch. */}
      {resubmitId && canCreate && (() => {
        const target = initialItems.find((it) => it.request.id === resubmitId);
        if (!target) return null;
        return (
          <NewDesignRequestForm
            charityId={charityId}
            designTypes={designTypes}
            resubmit={{
              id: target.request.id,
              title: target.request.title,
              description: target.request.description,
              typeIds: target.request.typeIds ?? [],
              rejectionReason: target.request.rejectionReason,
              attachments: target.request.attachments ?? [],
            }}
            onClose={() => setResubmitId(null)}
            onSuccess={(message) => {
              setResubmitId(null);
              setToast(message);
              router.refresh();
            }}
          />
        );
      })()}

      {revisionFor && (() => {
        const target = initialItems.find((it) => it.request.id === revisionFor);
        if (!target) return null;
        return (
          <RequestRevisionModal
            requestId={target.request.id}
            title={target.request.title}
            attachments={target.request.attachments ?? []}
            onClose={() => setRevisionFor(null)}
            onSuccess={(message) => {
              setRevisionFor(null);
              setToast(message);
              router.refresh();
            }}
          />
        );
      })()}

      <ConfirmModal
        isOpen={!!approvingId}
        title="اعتماد نهائي"
        message="سيُعتمد التسليم نهائياً وتُحذف مرفقات الطلب الأصلية من التخزين، وتبقى الملفات النهائية. لا يمكن التراجع ولا طلب تعديل بعدها."
        confirmLabel="اعتماد نهائي"
        tone="primary"
        isPending={isApproving}
        onCancel={() => setApprovingId(null)}
        onConfirm={async () => {
          if (!approvingId) return;
          setIsApproving(true);
          const res = await approveDeliveryByCharity(approvingId);
          setIsApproving(false);
          setApprovingId(null);
          if (res.error) return setToast(res.error);
          setToast("تم اعتماد التسليم نهائياً");
          router.refresh();
        }}
      />

      <SuccessToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
