"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Info, Palette } from "lucide-react";
import DesignRequestCard, { type DesignRequestCardData } from "@/components/design-requests/DesignRequestCard";
import type { DesignRequestProgress } from "@/lib/designRequestProgress";
import NewDesignRequestForm from "./NewDesignRequestForm";
import type { DesignTypeOption } from "@/components/design-requests/DesignTypePicker";

type Item = {
  request: DesignRequestCardData & { status: "PENDING" | "COMPLETED" };
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
  const [tab, setTab] = useState<"PENDING" | "COMPLETED">("PENDING");

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
            {(["PENDING", "COMPLETED"] as const).map((t) => (
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
                {t === "PENDING" ? `الطلبات الحالية` : `الطلبات المنجزة`}
              </button>
            ))}
          </div>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span style={{ fontSize: "var(--dr-fs-meta)" }}>الطلبات تنفذ كطابور متسلسل (الطلب تلو الآخر)</span>
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
            <DesignRequestCard key={it.request.id} request={it.request} progress={it.progress} />
          ))}
        </div>
      )}

      {isFormOpen && canCreate && (
        <NewDesignRequestForm
          charityId={charityId}
          designTypes={designTypes}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
