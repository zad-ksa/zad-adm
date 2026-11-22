"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ListOrdered, Palette, Plus, Trash2 } from "lucide-react";
import DesignRequestCard, { type DesignRequestCardData } from "@/components/design-requests/DesignRequestCard";
import EditDesignRequestModal from "@/components/design-requests/EditDesignRequestModal";
import DesignRequestLogModal from "@/components/design-requests/DesignRequestLogModal";
import QueueOrderModal, { type QueueRow } from "@/components/design-requests/QueueOrderModal";
import type { DesignRequestProgress } from "@/lib/designRequestProgress";
import { EmptyState, PageHeader, StatStrip, Tabs } from "@/components/console/layout";
import { Note, btn } from "@/components/console/ui";
import { Toast } from "@/components/console/Toast";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import RequestRevisionModal from "@/components/design-requests/RequestRevisionModal";
import { RevisionNotesList } from "@/components/design-requests/RevisionNotesList";
import {
  approveDeliveryByCharity,
  deleteDesignRequest,
  archiveDesignRequest,
  unarchiveDesignRequest,
} from "@/app/actions/designRequests";
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
    /** متى أُرشِف، مصوغاً في الخادم — و`null` يعني أنه في القوائم. */
    archivedAt: string | null;
    archivedByName: string | null;
  };
  /** Raw due date in ms, for ordering — "١٥ سبتمبر" does not sort. */
  expectedCompletionAt: number;
  progress: DesignRequestProgress;
};

type PortalTab =
  | "AWAITING_REVIEW"
  | "UNDER_REVIEW"
  | "PENDING"
  | "REVISION_REQUESTED"
  | "COMPLETED"
  | "REJECTED"
  // الأرشيفُ تبويبٌ لا حالة: الصفُّ يحفظ حالته وهو مؤرشف.
  | "ARCHIVED";

/**
 * طلبات التصاميم كما تراها الجمعية.
 *
 * **والترويسةُ هنا لا في الصفحة**: زرُّ «طلب جديد» يفتح نموذجاً، والنموذجُ
 * حالٌ في هذا المكوِّن. وكانت الصفحةُ تكتب عنواناً ويكتب هذا عنواناً ثانياً
 * تحته — «طلبات التصاميم» مرّتين في شاشةٍ واحدة.
 *
 * **والأرقامُ شريطٌ لا بطاقاتٌ ملوّنة**: بانتظارك، وقيد التنفيذ، والمنجز —
 * واللونُ فيها حالٌ: الكهرمانيُّ لما ينتظر ردَّك.
 */
export default function DesignRequestsPortalClient({
  charityId,
  charityName,
  initialItems,
  canCreate,
  designTypes,
}: {
  charityId: string;
  charityName: string;
  initialItems: Item[];
  canCreate: boolean;
  designTypes: DesignTypeOption[];
}) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logRequestId, setLogRequestId] = useState<string | null>(null);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [tab, setTab] = useState<PortalTab>("PENDING");
  const [archiveFor, setArchiveFor] = useState<{ id: string; mode: "archive" | "unarchive" } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [resubmitId, setResubmitId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // العدّاداتُ على غير المؤرشف: الشارةُ تعدّ ما يُرى.
  const live = useMemo(() => initialItems.filter((it) => !it.request.archivedAt), [initialItems]);
  const countOf = (status: string) => live.filter((it) => it.request.status === status).length;
  const reviewCount = countOf("UNDER_REVIEW");
  const awaitingYouCount = countOf("AWAITING_REVIEW");
  const revisionCount = countOf("REVISION_REQUESTED");
  const rejectedCount = countOf("REJECTED");
  const pendingCount = countOf("PENDING");
  const completedCount = countOf("COMPLETED");
  const archivedCount = initialItems.length - live.length;

  /**
   * أرشفةُ طلبٍ أو إخراجُه — والخادمُ هو من يفحص الشرط.
   *
   * فالجمعيةُ تُؤرشف ما لم يبدأ به المصمم، والزرُّ لا يظهر لغيره — لكنّ
   * إخفاءَ زرٍّ ليس تصريحاً، فالشرطُ مُعادٌ في الفعل نفسه.
   */
  const runArchive = () => {
    if (!archiveFor) return;
    const { id, mode } = archiveFor;
    setIsArchiving(true);
    void (async () => {
      const res = mode === "archive" ? await archiveDesignRequest(id) : await unarchiveDesignRequest(id);
      setIsArchiving(false);
      setArchiveFor(null);
      if ("error" in res && res.error) {
        setToast(res.error);
        return;
      }
      setToast(mode === "archive" ? "نُقل الطلب إلى الأرشيف." : "أُخرج الطلب من الأرشيف وعاد إلى الدور.");
      router.refresh();
    })();
  };

  const filtered = useMemo(() => {
    const rows =
      tab === "ARCHIVED"
        ? initialItems.filter((it) => !!it.request.archivedAt)
        : initialItems.filter((it) => !it.request.archivedAt && it.request.status === tab);

    // Started first, then whatever is due soonest. What is under way is what
    // someone is working on today, so it belongs at the top whatever its date;
    // the rest is a waiting list, and a waiting list is only useful in
    // deadline order. The other tabs keep the server's ordering — a completed
    // or rejected request has no urgency left to rank by.
    if (tab !== "PENDING") return rows;

    return [...rows].sort((a, b) => {
      const aStarted = a.request.startedAt ? 1 : 0;
      const bStarted = b.request.startedAt ? 1 : 0;
      if (aStarted !== bStarted) return bStarted - aStarted;
      return a.expectedCompletionAt - b.expectedCompletionAt;
    });
  }, [initialItems, tab]);

  // Only what has not been started can move, which is what makes handing this
  // to the charity safe: it can decide what comes next among its own designs,
  // and can never disturb work already under way.
  const queueRows: QueueRow[] = useMemo(
    () =>
      initialItems
        .filter((it) => it.request.status === "PENDING" && !it.request.archivedAt)
        .sort((a, b) => a.expectedCompletionAt - b.expectedCompletionAt)
        .map((it) => ({
          id: it.request.id,
          title: it.request.title,
          scheduledStartDate: it.request.scheduledStartDate,
          expectedCompletionDate: it.request.expectedCompletionDate,
          totalWorkingDays: it.request.totalWorkingDays,
          startedAt: it.request.startedAt,
          startedByName: it.request.startedByName,
        })),
    [initialItems]
  );

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<Palette className="size-6" />}
        title="طلبات التصاميم"
        description="ارفع طلبك، وتابع دوره وموعد تسليمه، واعتمد ما يسلم إليك."
        actions={
          <>
            {/* Shown whenever anything is scheduled at all, not only when there
                are two to swap.

                It was gated on "more than one waiting", on the reasoning that a
                queue of one cannot be reordered. True — but it made the schedule
                itself invisible to seven of the eight charities, which have one
                request queued or none. Seeing when your design starts and lands
                is the point; rearranging it is the extra. */}
            {queueRows.length > 0 && (
              <button type="button" onClick={() => setIsQueueOpen(true)} className={btn.secondary}>
                <ListOrdered className="size-4" />
                ترتيب التنفيذ
              </button>
            )}
            {/* Cosmetic only; the server action re-checks the same permission. */}
            {canCreate && (
              <button type="button" onClick={() => setIsFormOpen(true)} className={btn.primary}>
                <Plus className="size-4" />
                طلب تصميم جديد
              </button>
            )}
          </>
        }
      />

      <StatStrip
        items={[
          {
            label: "بانتظار مراجعتك",
            value: awaitingYouCount,
            dot: awaitingYouCount > 0 ? "warn" : "muted",
            hint: awaitingYouCount > 0 ? "سلمت ولم تعتمد بعد" : undefined,
          },
          { label: "قيد التنفيذ", value: pendingCount },
          { label: "قيد المراجعة", value: reviewCount },
          { label: "منجز", value: completedCount, dot: completedCount > 0 ? "active" : "muted" },
        ]}
      />

      <Tabs
        label="حالات الطلبات"
        value={tab}
        onChange={(next) => setTab(next)}
        tabs={[
          { id: "PENDING" as const, label: "الحالية", count: pendingCount },
          { id: "AWAITING_REVIEW" as const, label: "بانتظار مراجعتك", count: awaitingYouCount },
          { id: "REVISION_REQUESTED" as const, label: "قيد التعديل", count: revisionCount },
          { id: "UNDER_REVIEW" as const, label: "قيد المراجعة", count: reviewCount },
          { id: "REJECTED" as const, label: "المعادة للتعديل", count: rejectedCount },
          { id: "COMPLETED" as const, label: "المنجزة", count: completedCount },
          { id: "ARCHIVED" as const, label: "الأرشيف", count: archivedCount },
        ]}
      />

      {tab === "PENDING" && pendingCount > 0 && (
        <p className="text-meta text-slate-500 dark:text-slate-400">
          الطلبات تنفذ بالترتيب، طلبا تلو الآخر — والمبدوء به أولا.
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Palette className="size-4" />}
          title="لا طلبات في هذا التبويب"
          description={
            tab === "PENDING"
              ? "ما رفعته واعتمد يظهر هنا بموعد تسليمه."
              : "جرب تبويبا آخر، أو ارفع طلبا جديدا."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((it) => (
            <DesignRequestCard
              key={it.request.id}
              request={it.request}
              progress={it.progress}
              onOpenLog={() => setLogRequestId(it.request.id)}
              actions={
                it.request.status === "AWAITING_REVIEW" ? (
                  <div className="mt-2 w-full space-y-2">
                    {/* Zad's note, as a panel rather than a line in the detail
                        list. After a reply round this is the whole message —
                        what was done, what was not, and why — and the charity
                        is about to approve or push back on the strength of it. */}
                    {it.request.completionNote && (
                      <div className="rounded-lg bg-primary/[0.06] px-3 py-2.5 dark:bg-teal-400/10">
                        <p className="mb-2 text-caption font-semibold text-primary dark:text-teal-300">
                          {it.request.revisionNotes ? "رد فريق زاد على ملاحظاتكم" : "ملاحظات فريق زاد"}
                        </p>
                        <RevisionNotesList notes={it.request.completionNote} tone="staff" />
                      </div>
                    )}

                    {/* And what you asked for, kept in view beside the reply —
                        judging an answer means seeing the question. */}
                    {it.request.revisionNotes && (
                      <div className="rounded-lg bg-amber-500/[0.08] px-3 py-2.5">
                        <p className="mb-2 text-caption font-semibold text-amber-700 dark:text-amber-400">
                          ملاحظاتكم السابقة
                        </p>
                        <RevisionNotesList notes={it.request.revisionNotes} />
                      </div>
                    )}

                    {canCreate && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setApprovingId(it.request.id)}
                          className={btn.primary}
                        >
                          اعتماد نهائي
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevisionFor(it.request.id)}
                          className={btn.ghost}
                        >
                          {it.request.revisionNotes ? "لدي ملاحظات أخرى" : "لدي ملاحظات"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : it.request.status === "REVISION_REQUESTED" ? (
                  <div className="mt-2 w-full rounded-lg bg-amber-500/[0.08] px-3 py-2.5">
                    <p className="mb-2 text-caption font-semibold text-amber-700 dark:text-amber-400">
                      ملاحظاتك
                    </p>
                    {it.request.revisionNotes ? (
                      <RevisionNotesList notes={it.request.revisionNotes} />
                    ) : (
                      <span className="text-body text-amber-700 dark:text-amber-400">—</span>
                    )}
                  </div>
                ) : it.request.status === "REJECTED" ? (
                  <div className="mt-2 w-full space-y-2">
                    <Note tone="danger">
                      <span className="font-semibold">ملاحظات فريق زاد: </span>
                      {it.request.rejectionReason || "لم يذكر سبب."}
                    </Note>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => setResubmitId(it.request.id)}
                        className={btn.secondary}
                      >
                        إعادة رفع الطلب
                      </button>
                    )}
                  </div>
                ) : it.request.status === "UNDER_REVIEW" ? (
                  <div className="mt-2 w-full space-y-2">
                    <Note tone="warn">
                      قيد المراجعة — سيرد عليك خلال يوم عمل. والموعد الظاهر تقديري حتى الاعتماد.
                    </Note>
                    {/* Editable while it waits: nothing has been scheduled or
                        started, so the brief is still entirely yours. */}
                    {canCreate && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(it.request.id)}
                          className={btn.secondary}
                        >
                          تعديل الطلب
                        </button>
                        {/* Withdrawing is only offered here. One step later the
                            request has a promised date and a place in the queue. */}
                        <button
                          type="button"
                          onClick={() => setDeletingId(it.request.id)}
                          aria-label="حذف الطلب"
                          title="حذف الطلب"
                          className={btn.iconDanger}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : // Editing is for a brief still being worked on; a delivered
                // request has none left to edit — and neither has one a designer
                // has already started, where the card itself explains why and
                // names who to call instead.
                it.request.archivedAt ? (
                  <div className="mt-2 w-full space-y-2">
                    <p className="rounded-lg bg-slate-100 px-3 py-2.5 text-meta leading-5 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      في الأرشيف منذ {it.request.archivedAt}. وهو خارج الدور حتى تخرجه، فيعود بموعد
                      جديد على ذيل الطابور.
                    </p>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => setArchiveFor({ id: it.request.id, mode: "unarchive" })}
                        className={btn.secondary}
                      >
                        <ArchiveRestore className="size-4" />
                        إعادته إلى الدور
                      </button>
                    )}
                  </div>
                ) : canCreate && it.request.status === "PENDING" && !it.request.startedAt ? (
                  <div className="mt-2 flex w-full flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(it.request.id)}
                      className={btn.secondary}
                    >
                      تعديل
                    </button>
                    {/* Reordering is a queue-level decision, so this opens the same
                        modal as the one above the list — reached from the card
                        because that is where you are looking when you decide this
                        design should come sooner. */}
                    <button
                      type="button"
                      onClick={() => setIsQueueOpen(true)}
                      className={btn.secondary}
                    >
                      <ListOrdered className="size-4" />
                      ترتيب التنفيذ
                    </button>
                    {/* ما لم يبدأ به المصمم للجمعية أن تُنزله من الدور: طلبٌ
                        لم يُعد له حاجةٌ لا يُشغل دوراً ولا يُحذف. */}
                    <button
                      type="button"
                      onClick={() => setArchiveFor({ id: it.request.id, mode: "archive" })}
                      className={btn.secondary}
                    >
                      <Archive className="size-4" />
                      أرشفة
                    </button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={archiveFor !== null}
        title={archiveFor?.mode === "archive" ? "نقل الطلب إلى الأرشيف؟" : "إعادة الطلب إلى الدور؟"}
        message={
          archiveFor?.mode === "archive"
            ? "يخرج الطلب من الدور ويبقى في تبويب الأرشيف بلا حذف، ويمكنك إعادته متى شئت."
            : "يعود الطلب إلى الدور كطلبٍ جديد: موعدُه يُحسب الآن على ذيل الطابور، لا موعدَه القديم."
        }
        confirmLabel={archiveFor?.mode === "archive" ? "أرشفة" : "إعادة للدور"}
        tone="primary"
        isPending={isArchiving}
        onCancel={() => setArchiveFor(null)}
        onConfirm={runArchive}
      />

      {isQueueOpen && (
        <QueueOrderModal
          charityId={charityId}
          charityName={charityName}
          rows={queueRows}
          onClose={() => setIsQueueOpen(false)}
          onSuccess={() => {
            setIsQueueOpen(false);
            router.refresh();
          }}
        />
      )}

      {logRequestId !== null && (
        <DesignRequestLogModal requestId={logRequestId} onClose={() => setLogRequestId(null)} />
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

      <ConfirmDialog
        isOpen={!!deletingId}
        title="حذف الطلب"
        message="سيُحذف الطلب ومرفقاته نهائياً ولا يمكن التراجع. الحذف متاح ما دام الطلب قيد المراجعة ولم يُعتمد بعد."
        confirmLabel="حذف الطلب"
        tone="danger"
        isPending={isDeleting}
        onCancel={() => setDeletingId(null)}
        onConfirm={async () => {
          if (!deletingId) return;
          setIsDeleting(true);
          const res = await deleteDesignRequest(deletingId);
          setIsDeleting(false);
          setDeletingId(null);
          if (res.error) return setToast(res.error);
          setToast("حُذف الطلب");
          router.refresh();
        }}
      />

      <ConfirmDialog
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

      <Toast toast={toast ? { tone: "ok", text: toast } : null} onDismiss={() => setToast(null)} />
    </div>
  );
}
