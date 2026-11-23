"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Download, FileText, Pencil, Plus } from "lucide-react";
import { EmptyState, StatStrip, Tabs } from "@/components/console/layout";
import { Badge, MONO, Note, btn, card, cx } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import {
  approveDocRequest,
  createDocRequest,
  updateDocRequest,
} from "@/app/actions/docRequests";
import {
  docRequestCan,
  docRequestStatusHint,
  docRequestStatusLabel,
  docRequestStatusOf,
  docRequestStatusTone,
  type DocRequestInput,
} from "@/lib/docRequests";
import DocRequestForm from "./DocRequestForm";

export type PortalDocRequest = {
  id: string;
  programName: string | null;
  programIdea: string;
  beneficiariesCount: string | null;
  programDuration: string | null;
  targetCategory: string | null;
  startDate: string | null;
  endDate: string | null;
  budgetInclude: boolean;
  budgetTotal: string | null;
  note: string | null;
  status: string;
  submittedAt: string;
  expectedCompletionDate: string;
  workingDays: number;
  returnNote: string | null;
  deliveryNote: string | null;
  fileUrl: string | null;
  fileName: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
};

type Tab = "OPEN" | "AWAITING_REVIEW" | "COMPLETED";

/**
 * طلباتُ وثائق المشاريع عند الجمعية: ترفعها وتتابعها وتُعمّدها.
 *
 * **والتبويباتُ ثلاثةٌ لا أربع**: «الجارية» تجمع ما في الدور وما رُدّ، لأنّ
 * كليهما عملٌ على الجمعية أن تتابعه — والمردودُ يُعلَّم بشارته ولا يُخبَّأ في
 * تبويبٍ يُنسى.
 */
export default function DocRequestsClient({
  charityName,
  requests,
  defaultWorkingDays,
  tableMissing,
}: {
  charityName: string;
  requests: PortalDocRequest[];
  defaultWorkingDays: number;
  tableMissing: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PortalDocRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("OPEN");

  const counts = useMemo(() => {
    const of = (s: string) => requests.filter((r) => docRequestStatusOf(r.status) === s).length;
    return {
      pending: of("PENDING"),
      returned: of("RETURNED"),
      awaiting: of("AWAITING_REVIEW"),
      completed: of("COMPLETED"),
    };
  }, [requests]);

  const shown = useMemo(() => {
    if (tab === "OPEN") {
      return requests.filter((r) => ["PENDING", "RETURNED"].includes(docRequestStatusOf(r.status)));
    }
    return requests.filter((r) => docRequestStatusOf(r.status) === tab);
  }, [requests, tab]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "تعذرت العملية");
        notify("error", res.error ?? "تعذرت العملية");
        return;
      }
      setError(null);
      done?.();
      router.refresh();
    });

  const submit = (input: DocRequestInput) => {
    if (editing) {
      run(() => updateDocRequest(editing.id, input), () => {
        setEditing(null);
        notify("ok", "حفظ الطلب وأعيد إرساله.");
      });
      return;
    }
    run(() => createDocRequest(charityName, input), () => {
      setFormOpen(false);
      notify("ok", "أرسل الطلب إلى فريق زاد.");
    });
  };

  if (tableMissing) {
    return (
      <Note tone="warn">
        قسم طلبات وثائق المشاريع لم يفعل بعد عند فريق زاد. راجعهم لتفعيله.
      </Note>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatStrip
          items={[
            { label: "قيد التنفيذ", value: counts.pending },
            {
              label: "بانتظار تعميدكم",
              value: counts.awaiting,
              dot: counts.awaiting > 0 ? "warn" : "muted",
            },
            {
              label: "أعيد بملاحظات",
              value: counts.returned,
              dot: counts.returned > 0 ? "danger" : "muted",
            },
            { label: "معمد", value: counts.completed, dot: counts.completed > 0 ? "active" : "muted" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="حالات الطلبات"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "OPEN" as const, label: "الجارية", count: counts.pending + counts.returned },
            { id: "AWAITING_REVIEW" as const, label: "بانتظار تعميدكم", count: counts.awaiting },
            { id: "COMPLETED" as const, label: "المعمدة", count: counts.completed },
          ]}
        />
        <button type="button" onClick={() => { setError(null); setFormOpen(true); }} className={btn.primary}>
          <Plus className="size-4" />
          طلب وثيقة جديدة
        </button>
      </div>

      <p className="text-meta text-slate-500 dark:text-slate-400">
        <CalendarClock aria-hidden className="me-1 inline size-3.5 align-[-2px] text-slate-400" />
        المهلة المعتمدة {defaultWorkingDays} أيام عمل من دخول الطلب الدور.
      </p>

      {shown.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-4" />}
          title="لا طلبات في هذا التبويب"
          description={
            tab === "OPEN" ? "ارفع طلبا ليكتب فريق زاد وثيقته." : "ما يصل هنا يظهر بتاريخه."
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((request) => {
            const can = docRequestCan(request.status);
            return (
              <li key={request.id} className={cx(card.static, "flex flex-col gap-2.5 p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 text-title font-semibold text-slate-900 dark:text-slate-100">
                    {request.programName || "مبادرة بلا اسم بعد"}
                  </h3>
                  <Badge tone={docRequestStatusTone(request.status)}>
                    {docRequestStatusLabel(request.status)}
                  </Badge>
                </div>

                <p className="line-clamp-3 text-body leading-6 text-slate-500 dark:text-slate-400">
                  {request.programIdea}
                </p>

                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-slate-500 dark:text-slate-400">
                  <span>
                    رفع <span className={cx(MONO, "text-slate-700 dark:text-slate-200")}>{request.submittedAt}</span>
                  </span>
                  {docRequestStatusOf(request.status) === "PENDING" && (
                    <span>
                      يسلم{" "}
                      <span className={cx(MONO, "text-slate-700 dark:text-slate-200")}>
                        {request.expectedCompletionDate}
                      </span>
                    </span>
                  )}
                  {request.completedAt && (
                    <span>
                      عمد <span className={cx(MONO, "text-slate-700 dark:text-slate-200")}>{request.completedAt}</span>
                    </span>
                  )}
                </dl>

                <p className="text-meta text-slate-400">{docRequestStatusHint(request.status)}</p>

                {request.returnNote && (
                  <Note tone="danger">
                    <span className="font-semibold">ملاحظات فريق زاد: </span>
                    {request.returnNote}
                  </Note>
                )}

                {request.deliveryNote && docRequestStatusOf(request.status) !== "PENDING" && (
                  <Note tone="brand">
                    <span className="font-semibold">مع التسليم: </span>
                    {request.deliveryNote}
                  </Note>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {request.fileUrl && (
                    <a
                      href={request.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={btn.secondary}
                      download={request.fileName ?? undefined}
                    >
                      <Download className="size-4" />
                      الوثيقة
                    </a>
                  )}

                  {can.approve && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await confirmAction({
                            title: "تعميد الوثيقة؟",
                            message:
                              "بالتعميد ينتهي الطلب ولا تعديل بعده. راجع الملف النهائي قبل التعميد.",
                            confirmLabel: "تعميد",
                            tone: "primary",
                          })
                        ) {
                          run(() => approveDocRequest(request.id), () => notify("ok", "عمدت الوثيقة."));
                        }
                      }}
                      className={btn.primary}
                    >
                      تعميد الوثيقة
                    </button>
                  )}

                  {can.edit && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => { setError(null); setEditing(request); }}
                      className={btn.secondary}
                    >
                      <Pencil className="size-4" />
                      {docRequestStatusOf(request.status) === "RETURNED" ? "إكمال وإعادة إرسال" : "تعديل"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && (
        <DocRequestForm
          title="طلب وثيقة مشروع"
          busy={busy}
          error={error}
          onClose={() => setFormOpen(false)}
          onSubmit={submit}
        />
      )}

      {editing && (
        <DocRequestForm
          title={docRequestStatusOf(editing.status) === "RETURNED" ? "إكمال الطلب وإعادة إرساله" : "تعديل الطلب"}
          initial={editing}
          busy={busy}
          error={error}
          onClose={() => setEditing(null)}
          onSubmit={submit}
        />
      )}
    </>
  );
}
