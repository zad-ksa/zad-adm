"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, Hammer, Loader2, X } from "lucide-react";
import { reorderCharityQueue } from "@/app/actions/designRequests";

/**
 * Arranging one entity's execution queue — used by Zad staff and by the
 * charity itself.
 *
 * The order is the schedule: each request starts where the one before it
 * finishes, so dragging a design to the top does not merely relabel it — it
 * moves every delivery date behind it. That is the whole point, and the modal
 * says so rather than letting it be a surprise.
 *
 * Requests already under a designer's hand are shown but cannot move: their
 * start date is something that actually happened, and reordering them would be
 * rewriting history rather than planning. Everything else queues up behind them.
 */

export type QueueRow = {
  id: string;
  title: string;
  scheduledStartDate: string;
  expectedCompletionDate: string;
  totalWorkingDays?: number;
  startedAt?: string | null;
  startedByName?: string | null;
};

function SortableRow({ row, index }: { row: QueueRow; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-3 rounded-xl border bg-white dark:bg-[#0d0d0d] p-3 ${
        isDragging
          ? "border-primary/50 shadow-lg opacity-90"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`تحريك: ${row.title}`}
        className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-400 grid place-items-center text-[11px] font-black tabular-nums">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 break-words leading-snug">
          {row.title}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {row.scheduledStartDate} ← {row.expectedCompletionDate}
          {typeof row.totalWorkingDays === "number" ? ` · ${row.totalWorkingDays} يوم عمل` : ""}
        </p>
      </div>
    </li>
  );
}

export default function QueueOrderModal({
  charityId,
  charityName,
  rows,
  onClose,
  onSuccess,
}: {
  /** null is the Zad company queue, which has no charity row. */
  charityId: string | null;
  charityName: string;
  /** Every PENDING request for this entity, started ones included. */
  rows: QueueRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const locked = useMemo(() => rows.filter((r) => r.startedAt), [rows]);
  const [order, setOrder] = useState<QueueRow[]>(() => rows.filter((r) => !r.startedAt));

  // Nothing to swap with. Saving a queue of one would still recompute its
  // dates from today and quietly move a delivery the charity was promised,
  // so the modal drops to a read-only view of the schedule instead.
  const canReorder = order.length > 1;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Without a small threshold every click on the handle starts a drag, and
      // keyboard users get no click at all.
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const from = prev.findIndex((r) => r.id === active.id);
      const to = prev.findIndex((r) => r.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  };

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= order.length) return;
    setOrder((prev) => arrayMove(prev, index, to));
  };

  const handleSave = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await reorderCharityQueue({
        charityId,
        orderedIds: order.map((r) => r.id),
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "تعذّرت إعادة الترتيب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-xl max-h-[88vh] flex flex-col"
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
              ترتيب تنفيذ التصاميم
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 break-words">
              {charityName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
            {canReorder
              ? "رتّب الطلبات بالسحب. كل طلب يبدأ حين ينتهي الذي قبله، فتتغيّر مواعيد البدء والتسليم تبعاً للترتيب فور الحفظ."
              : "مواعيد البدء والتسليم كما هي مجدولة الآن. ويظهر الترتيب قابلاً للتغيير حين يكون في الطابور أكثر من طلب."}
          </p>

          {locked.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                جارٍ العمل عليها — لا تتحرك
              </h3>
              <ul className="space-y-2">
                {locked.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 rounded-xl border border-indigo-200/70 dark:border-indigo-500/25 bg-indigo-500/[0.05] p-3"
                  >
                    <Hammer className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 break-words leading-snug">
                        {row.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-indigo-600/80 dark:text-indigo-300/80">
                        جارٍ العمل عليه · التسليم {row.expectedCompletionDate}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400">
              في الطابور ({order.length})
            </h3>

            {order.length === 0 ? (
              <p className="text-[12px] text-slate-400 dark:text-slate-500 py-6 text-center">
                لا توجد طلبات لم تبدأ بعد لهذه الجهة.
              </p>
            ) : !canReorder ? (
              // A drag handle and two arrows on a single row are controls that
              // do nothing — the list is just the schedule, read.
              <ul className="space-y-2">
                {order.map((row, i) => (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d0d0d] p-3"
                  >
                    <span className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-400 grid place-items-center text-[11px] font-black tabular-nums">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 break-words leading-snug">
                        {row.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {row.scheduledStartDate} ← {row.expectedCompletionDate}
                        {typeof row.totalWorkingDays === "number"
                          ? ` · ${row.totalWorkingDays} يوم عمل`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={order.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {order.map((row, i) => (
                      <div key={row.id} className="flex items-stretch gap-1.5">
                        <div className="flex-1 min-w-0">
                          <SortableRow row={row} index={i} />
                        </div>
                        {/* Dragging is not available to everyone on every device;
                            two buttons make the same move without a pointer. */}
                        <div className="flex flex-col justify-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            aria-label="تقديم"
                            className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(i, 1)}
                            disabled={i === order.length - 1}
                            aria-label="تأخير"
                            className="p-1 rounded-md text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-500/[0.07] text-rose-600 dark:text-rose-400 p-3 text-[12px] font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-4 rounded-xl text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {canReorder ? "إلغاء" : "إغلاق"}
          </button>
          {canReorder && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || order.length === 0}
            className="h-9 px-5 rounded-xl text-[12px] font-bold text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            حفظ الترتيب
          </button>
          )}
        </footer>
      </div>
    </div>
  );
}
