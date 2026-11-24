"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Download,
  Eye,
  FileText,
  Settings,
  Sparkles,
  Undo2,
  Upload,
} from "lucide-react";
import { EmptyState, StatStrip, Tabs } from "@/components/console/layout";
import { Badge, Field, MONO, Note, Spinner, btn, card, cx, field } from "@/components/console/ui";
import { Dialog } from "@/components/console/Dialog";
import { notify } from "@/components/console/toastBus";
import {
  DOC_QUEUE_MODES,
  docRequestCan,
  docRequestKindOf,
  docRequestStatusLabel,
  docRequestStatusOf,
  docRequestStatusTone,
  MAX_DOC_DAYS,
  MIN_DOC_DAYS,
  type DocAttachment,
  type DocRequestSettings,
} from "@/lib/docRequests";
import {
  deliverDocRequest,
  returnDocRequest,
  updateDocRequestSettings,
} from "@/app/actions/docRequests";
import DocRequestBuilderDialog from "./DocRequestBuilderDialog";
import FileOpenDownload from "@/components/FileOpenDownload";
import DocRequestDeliverDialog from "./DocRequestDeliverDialog";
import { DocPreview } from "../project-builder/DocPreview";

export type StaffDocRequest = {
  id: string;
  kind: string;
  attachments: DocAttachment[];
  charityId: string;
  charityName: string;
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
  submittedByName: string | null;
  expectedCompletionDate: string;
  expectedCompletionAt: number;
  workingDays: number;
  hasDocument: boolean;
  docContent: string | null;
  builderOptions: Record<string, unknown> | null;
  generatedAt: string | null;
  generatedByName: string | null;
  fileUrl: string | null;
  fileName: string | null;
  deliveredAt: string | null;
  deliveredByName: string | null;
  deliveryNote: string | null;
  returnNote: string | null;
  completedAt: string | null;
};

type Tab = "PENDING" | "AWAITING_REVIEW" | "RETURNED" | "COMPLETED";

/**
 * شاشةُ تنفيذ طلبات وثائق المشاريع.
 *
 * **ومدخلاتُ الجمعية تُعرض كما أُرسلت**: كلُّ حقلٍ ملأته يُقرأ في بطاقته —
 * فالموظّفُ يحكم على كفاية الطلب قبل أن يفتح المنشئ، ويردُّه إن نقص.
 *
 * **والإنشاءُ من داخل الطلب لا من شاشةٍ أخرى**: النافذةُ تُفتح بمدخلات الطلب
 * معبّأةً، فيختار الموظّفُ التفضيلاتِ والتوجيهاتِ ويُنشئ — ولا نقلَ بيدٍ بين
 * شاشتين، وهو ما يُسقط حقلاً أو حقلين في كلِّ مرّة.
 */
export default function DocRequestsStaffClient({
  requests,
  settings,
  canManage,
}: {
  requests: StaffDocRequest[];
  settings: DocRequestSettings;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [building, setBuilding] = useState<StaffDocRequest | null>(null);
  const [delivering, setDelivering] = useState<StaffDocRequest | null>(null);
  const [previewing, setPreviewing] = useState<StaffDocRequest | null>(null);
  const [returning, setReturning] = useState<StaffDocRequest | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const counts = useMemo(() => {
    const of = (s: string) => requests.filter((r) => docRequestStatusOf(r.status) === s).length;
    return {
      pending: of("PENDING"),
      awaiting: of("AWAITING_REVIEW"),
      returned: of("RETURNED"),
      completed: of("COMPLETED"),
    };
  }, [requests]);

  const shown = useMemo(() => {
    const rows = requests.filter((r) => docRequestStatusOf(r.status) === tab);
    // وفي الدور: الأقربُ موعداً أوّلاً — القائمةُ قائمةُ انتظارٍ لا معجم.
    return tab === "PENDING"
      ? [...rows].sort((a, b) => a.expectedCompletionAt - b.expectedCompletionAt)
      : rows;
  }, [requests, tab]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        notify("error", res.error ?? "تعذرت العملية");
        return;
      }
      done?.();
      router.refresh();
    });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatStrip
          items={[
            { label: "في الدور", value: counts.pending, dot: counts.pending > 0 ? "warn" : "muted" },
            { label: "بانتظار الجمعية", value: counts.awaiting },
            { label: "أعيد بملاحظات", value: counts.returned },
            { label: "معمد", value: counts.completed, dot: counts.completed > 0 ? "active" : "muted" },
          ]}
        />
        {canManage && (
          <button type="button" onClick={() => setSettingsOpen(true)} className={btn.secondary}>
            <Settings className="size-4" />
            إعدادات الطلبات
          </button>
        )}
      </div>

      <Tabs
        label="حالات الطلبات"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "PENDING" as const, label: "في الدور", count: counts.pending },
          { id: "AWAITING_REVIEW" as const, label: "بانتظار الجمعية", count: counts.awaiting },
          { id: "RETURNED" as const, label: "أعيد بملاحظات", count: counts.returned },
          { id: "COMPLETED" as const, label: "المعمدة", count: counts.completed },
        ]}
      />

      <p className="text-meta text-slate-500 dark:text-slate-400">
        <CalendarClock aria-hidden className="me-1 inline size-3.5 align-[-2px] text-slate-400" />
        المهلة الافتراضية {settings.defaultWorkingDays} أيام عمل، والطلبات{" "}
        {settings.queueMode === "QUEUE" ? "بالدور داخل كل جمعية" : "في وقت واحد"}.
      </p>

      {shown.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-4" />}
          title="لا طلبات في هذا التبويب"
          description="ما ترفعه الجمعيات يظهر هنا بموعده."
        />
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {shown.map((request) => {
            const can = docRequestCan(request.status);
            const review = docRequestKindOf(request.kind) === "REVIEW";
            return (
              <li key={request.id} className={cx(card.static, "flex flex-col gap-3 p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-caption font-semibold text-primary dark:text-teal-300">
                      {request.charityName}
                    </p>
                    <h3 className="text-title font-semibold text-slate-900 dark:text-slate-100">
                      {review ? "مراجعة وثيقة" : request.programName || "مبادرة بلا اسم"}
                    </h3>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {review && <Badge tone="neutral">طلب مراجعة</Badge>}
                    {request.hasDocument && <Badge tone="brand">الوثيقة منشأة</Badge>}
                    <Badge tone={docRequestStatusTone(request.status)}>
                      {docRequestStatusLabel(request.status)}
                    </Badge>
                  </div>
                </div>

                {request.programIdea && (
                  <p className="whitespace-pre-line text-body leading-6 text-slate-600 dark:text-slate-300">
                    {request.programIdea}
                  </p>
                )}

                {/* مرفقاتُ الجمعية: في المراجعة هي موضوعُ الطلب، وفي الإنشاء عونٌ على الكتابة. */}
                {request.attachments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-meta text-slate-400">{review ? "الوثيقة المراد مراجعتها" : "مرفقات الجمعية"}</p>
                    <ul className="flex flex-wrap gap-2">
                      {request.attachments.map((a) => (
                        <li key={a.url}>
                          <FileOpenDownload url={a.url} name={a.name} label={a.name.length > 40 ? a.name.slice(0, 38) + "…" : a.name} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* وما ملأته الجمعيةُ وحدَه يُعرض: حقلٌ فارغٌ يُعرض «—» يُطيل
                    البطاقةَ ولا يقول شيئاً. */}
                <dl className="grid gap-x-6 gap-y-1 text-meta sm:grid-cols-2">
                  {[
                    ["عدد المستفيدين", request.beneficiariesCount],
                    ["مدة البرنامج", request.programDuration],
                    ["الفئة المستهدفة", request.targetCategory],
                    ["من", request.startDate],
                    ["إلى", request.endDate],
                    [
                      "الميزانية",
                      request.budgetInclude ? request.budgetTotal || "تضمن، بلا مبلغ محدد" : null,
                    ],
                  ]
                    .filter(([, value]) => !!value)
                    .map(([label, value]) => (
                      <div key={label as string} className="flex gap-2">
                        <dt className="text-slate-400">{label}</dt>
                        <dd className="min-w-0 text-slate-700 dark:text-slate-200">{value}</dd>
                      </div>
                    ))}
                </dl>

                {request.note && (
                  <Note tone="brand">
                    <span className="font-semibold">ملاحظات الجمعية: </span>
                    {request.note}
                  </Note>
                )}

                {request.returnNote && (
                  <Note tone="warn">
                    <span className="font-semibold">أعيد بملاحظة: </span>
                    {request.returnNote}
                  </Note>
                )}

                <p className={cx(MONO, "text-meta text-slate-400")}>
                  رفع {request.submittedAt}
                  {request.submittedByName ? ` · ${request.submittedByName}` : ""} · يسلم{" "}
                  {request.expectedCompletionDate} ({request.workingDays} أيام)
                  {request.generatedAt ? ` · أنشئت ${request.generatedAt}` : ""}
                  {request.deliveredAt ? ` · سلم ${request.deliveredAt}` : ""}
                  {request.completedAt ? ` · عمد ${request.completedAt}` : ""}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  {can.generate && !review && (
                    <button type="button" onClick={() => setBuilding(request)} className={btn.primary}>
                      <Sparkles className="size-4" />
                      {request.hasDocument ? "إعادة الإنشاء" : "إنشاء الوثيقة"}
                    </button>
                  )}

                  {request.hasDocument && (
                    <button type="button" onClick={() => setPreviewing(request)} className={btn.secondary}>
                      <Eye className="size-4" />
                      معاينة
                    </button>
                  )}

                  {can.deliver && request.hasDocument && (
                    <button type="button" onClick={() => setDelivering(request)} className={btn.secondary}>
                      <Upload className="size-4" />
                      إنهاء الطلب
                    </button>
                  )}

                  {can.returnToCharity && (
                    <button
                      type="button"
                      onClick={() => {
                        setReturnNote("");
                        setReturning(request);
                      }}
                      className={btn.ghost}
                    >
                      <Undo2 className="size-4" />
                      إعادة بملاحظات
                    </button>
                  )}

                  {request.fileUrl && (
                    <a
                      href={request.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={request.fileName ?? undefined}
                      className={btn.ghost}
                    >
                      <Download className="size-4" />
                      الملف النهائي
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {building && (
        <DocRequestBuilderDialog
          request={building}
          onClose={() => setBuilding(null)}
          onSaved={() => {
            setBuilding(null);
            notify("ok", "حفظت الوثيقة في الطلب.");
            router.refresh();
          }}
        />
      )}

      {delivering && (
        <DocRequestDeliverDialog
          request={delivering}
          onClose={() => setDelivering(null)}
          onDone={(file, note) =>
            run(() => deliverDocRequest(delivering.id, file, note), () => {
              setDelivering(null);
              notify("ok", "سلم الطلب إلى الجمعية للتعميد.");
            })
          }
        />
      )}

      {previewing && (
        <Dialog
          size="2xl"
          icon={<Eye className="size-5" />}
          title={previewing.programName || "معاينة الوثيقة"}
          description={`${previewing.charityName}${previewing.generatedByName ? ` · أنشأها ${previewing.generatedByName}` : ""}`}
          onClose={() => setPreviewing(null)}
          flush
        >
          <DocPreview content={previewing.docContent ?? ""} charityId={previewing.charityId} />
        </Dialog>
      )}

      {returning && (
        <Dialog
          size="md"
          icon={<Undo2 className="size-5" />}
          title="إعادة الطلب إلى الجمعية"
          description="اكتب ما ينقصه ليكملوه ويعيدوا الإرسال."
          onClose={() => setReturning(null)}
          busy={busy}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => returnDocRequest(returning.id, returnNote), () => {
              setReturning(null);
              notify("ok", "أعيد الطلب بملاحظة.");
            });
          }}
          footer={
            <button type="submit" disabled={busy || !returnNote.trim()} className={btn.primary}>
              {busy ? <Spinner tone="onPrimary" /> : <Undo2 className="size-4" />}
              إعادة الطلب
            </button>
          }
        >
          <Field id="dr-return" label="ما الذي ينقص الطلب؟">
            <textarea
              id="dr-return"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="مثال: الفكرة عامة — وضحوا الفئة المستهدفة ومدة التنفيذ."
              className={cx(field, "h-auto resize-y py-2")}
            />
          </Field>
        </Dialog>
      )}

      {settingsOpen && canManage && (
        <SettingsDialog
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            notify("ok", "حفظت الإعدادات.");
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/**
 * إعدادُ المهلة ونمطِ الدور.
 *
 * **ولا يُعاد حسابُ المواعيد القائمة**: كلُّ طلبٍ يحفظ أيّامَه وقتَ رفعه، فوعدٌ
 * قُطع للجمعية لا يتبدّل بإعدادٍ غُيّر بعده — ويُقال ذلك في الشاشة لا في
 * الشيفرة وحدَها.
 */
function SettingsDialog({
  settings,
  onClose,
  onSaved,
}: {
  settings: DocRequestSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState(String(settings.defaultWorkingDays));
  const [mode, setMode] = useState(settings.queueMode);
  const [busy, start] = useTransition();

  return (
    <Dialog
      size="md"
      icon={<Settings className="size-5" />}
      title="إعدادات طلبات الوثائق"
      description="تسري على الطلبات الجديدة وحدها."
      onClose={onClose}
      busy={busy}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateDocRequestSettings({
            defaultWorkingDays: Number(days) || settings.defaultWorkingDays,
            queueMode: mode,
          });
          if (!res.ok) {
            notify("error", res.error);
            return;
          }
          onSaved();
        });
      }}
      footer={
        <button type="submit" disabled={busy} className={btn.primary}>
          {busy ? <Spinner tone="onPrimary" /> : null}
          حفظ
        </button>
      }
    >
      <div className="space-y-4">
        <Field
          id="dr-days"
          label="أيام العمل الافتراضية للطلب"
          hint={`من ${MIN_DOC_DAYS} إلى ${MAX_DOC_DAYS} يوم عمل (الأحد – الخميس).`}
        >
          <input
            id="dr-days"
            type="number"
            min={MIN_DOC_DAYS}
            max={MAX_DOC_DAYS}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={field}
          />
        </Field>

        <div className="space-y-1.5">
          <p className="text-body font-medium text-slate-700 dark:text-slate-300">
            طلبات الجمعية الواحدة
          </p>
          <div className="space-y-2">
            {DOC_QUEUE_MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={mode === option.value}
                className={cx(
                  "block w-full rounded-lg border p-3 text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  mode === option.value
                    ? "border-primary/40 bg-primary/[0.04] dark:border-teal-400/30 dark:bg-teal-400/[0.06]"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                )}
              >
                <span className="block text-body font-medium text-slate-900 dark:text-slate-100">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-meta leading-5 text-slate-500 dark:text-slate-400">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Note tone="brand">
          تغيير المهلة لا يحرك مواعيد الطلبات القائمة: كل طلب يحفظ أيامه وقت رفعه، فالوعد المقطوع
          للجمعية يبقى كما قطع.
        </Note>
      </div>
    </Dialog>
  );
}
