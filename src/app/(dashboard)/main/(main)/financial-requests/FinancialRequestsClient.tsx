"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PageHeader, EmptyState, SearchField } from "@/components/console/layout";
import { Badge, btn, cx } from "@/components/console/ui";
import { confirmAction } from "@/components/console/confirmBus";
import { notify } from "@/components/console/toastBus";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight, CheckCircle2, Clock, CornerUpLeft, Eye, FileText, GitBranch, Landmark,
  Loader2, Plus, RefreshCw, Receipt, Send, Settings2, ShieldCheck, Trash2, UserCheck, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteRequest } from "@/app/actions/approvals";
import { getFinancialRequestsAndMarkRead } from "@/app/actions/financialRequests";
import { amounts, formatAmount, serialLabel } from "@/lib/financialRequest";
import type { FinancialDetail } from "@/lib/financialRequestRow";

const FinancialRequestForm = dynamic(() => import("@/components/financial/FinancialRequestForm"), { ssr: false });
// نافذةُ البتّ القائمة نفسُها: الأفعالُ الستّة والسلسلةُ والسجلُّ محرّكٌ
// واحد، ولا يُكتب ثانٍ يُصان مرّتين.
const ReviewModal = dynamic(() => import("@/components/approvals/ReviewModal"), { ssr: false });
const FinancialSettingsSheet = dynamic(() => import("@/components/financial/FinancialSettingsSheet"), { ssr: false });

// ── الأنواع ──────────────────────────────────────────────────────────────────
type Status = "PENDING" | "RETURNED" | "APPROVED" | "REJECTED" | "DELEGATED";
type Action =
  | "SUBMITTED" | "FORWARDED" | "FORWARDED_DOWN" | "APPROVED_FINAL"
  | "REJECTED" | "RETURNED" | "DELEGATED" | "RESUBMITTED";

type Employee = { id: string; name: string; role: string; avatarUrl?: string | null };
type Attachment = { name?: string; url: string; size?: number };

type RequestLog = {
  id: string;
  stepOrder: number;
  action: Action;
  note: string | null;
  attachments?: unknown;
  createdAt: string | Date;
  actor: Employee;
  delegatedTo: Employee | null;
};

export type FinancialRequestRow = {
  id: string;
  title: string;
  body: string | null;
  attachments?: unknown;
  status: Status;
  reviewNote: string | null;
  createdAt: string | Date;
  currentStepOrder: number;
  currentReviewerId: string | null;
  createdBy?: Employee;
  currentReviewer?: Employee | null;
  delegatedTo?: Employee | null;
  // شكلُ REQUEST_INCLUDE: المُعتمِد بمعرّفه واسمه لا أكثر.
  chain?: { id: string; name: string; steps?: { order: number; label: string | null; approver: { id: string; name: string } }[] } | null;
  logs: RequestLog[];
  financial: FinancialDetail | null;
};

type Props = {
  requests: FinancialRequestRow[];
  types: { id: string; name: string }[];
  vatRate: number;
  hasActiveChain: boolean;
  canReviewAll: boolean;
  canManageSettings: boolean;
  sessionId: string;
  allEmployees: Employee[];
};

// ── ثوابت العرض ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; tone: "brand" | "gold" | "good" | "danger" | "neutral"; icon: LucideIcon }> = {
  PENDING:   { label: "قيد المراجعة",  tone: "brand",   icon: Clock },
  RETURNED:  { label: "مرجع للتعديل",  tone: "gold",    icon: CornerUpLeft },
  APPROVED:  { label: "معتمد",          tone: "good",    icon: CheckCircle2 },
  REJECTED:  { label: "مرفوض",          tone: "danger",  icon: X },
  DELEGATED: { label: "محوّل للتنفيذ",  tone: "neutral", icon: UserCheck },
};

const ACTION_CONFIG: Record<Action, { label: string; color: string; icon: LucideIcon }> = {
  SUBMITTED:      { label: "رُفع الطلب",            color: "text-blue-500",    icon: Send },
  FORWARDED:      { label: "مُرِّر للمستوى الأعلى", color: "text-indigo-500",  icon: ArrowRight },
  FORWARDED_DOWN: { label: "مُرِّر للمستوى الأدنى", color: "text-sky-500",     icon: ArrowRight },
  APPROVED_FINAL: { label: "اعتُمد نهائياً",         color: "text-emerald-500", icon: CheckCircle2 },
  REJECTED:       { label: "رُفض",                   color: "text-red-500",     icon: X },
  RETURNED:       { label: "أُرجع للتعديل",          color: "text-amber-500",   icon: CornerUpLeft },
  DELEGATED:      { label: "حُوِّل التنفيذ",         color: "text-purple-500",  icon: UserCheck },
  RESUBMITTED:    { label: "أُعيد إرساله",           color: "text-blue-400",    icon: RefreshCw },
};

function timeAgo(date: string | Date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(date).toLocaleDateString("ar-SA");
}

/** مرفقاتُ الصفّ أو السجلّ — حقلُ Json قد يأتي نصّاً أو مصفوفةً أو لا شيء. */
function readAttachments(value: unknown): Attachment[] {
  if (!value) return [];
  const raw = typeof value === "string" ? safeParse(value) : value;
  return Array.isArray(raw) ? (raw.filter((a) => a && typeof a.url === "string") as Attachment[]) : [];
}

function safeParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

/** آخرُ قرارٍ أُرفق به ملف — النموذجُ المختوم في الغالب. */
function latestStamped(logs: RequestLog[]): { log: RequestLog; items: Attachment[] } | null {
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const items = readAttachments(logs[i].attachments);
    if (items.length) return { log: logs[i], items };
  }
  return null;
}

function AttachmentList({ items, label }: { items: Attachment[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-caption font-semibold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
        <FileText className="w-3 h-3" /> {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((att, i) => (
          <a key={`${att.url}-${i}`} href={att.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 text-caption font-medium text-slate-600 dark:text-slate-300 hover:border-primary/50 hover:text-primary transition-colors max-w-[220px]">
            <FileText className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{att.name || "مرفق"}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── خط سير الطلب ─────────────────────────────────────────────────────────────
function RequestTimeline({ logs }: { logs: RequestLog[] }) {
  if (logs.length === 0) return null;
  return (
    <div>
      <p className="text-caption font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        <GitBranch className="w-3 h-3" /> مسار الاعتماد
      </p>
      <div className="relative">
        <div className="absolute right-[14px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          {logs.map((log) => {
            const cfg = ACTION_CONFIG[log.action];
            const Icon = cfg.icon;
            // مرفقُ القرار نفسه: النموذجُ المختوم أثرُ قرارٍ بعينه، فيظهر عند
            // خطوته ليُعرف من ختم ومتى.
            const stamped = readAttachments(log.attachments);
            return (
              <div key={log.id} className="flex items-start gap-3 relative">
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 ring-2 ring-white dark:ring-slate-900 bg-slate-100 dark:bg-slate-800">
                  <Icon className={cx("w-3.5 h-3.5", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0 pb-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-caption font-semibold text-slate-700 dark:text-slate-200">{log.actor.name}</span>
                    <span className={cx("text-caption font-semibold", cfg.color)}>{cfg.label}</span>
                    {log.delegatedTo && <span className="text-caption text-purple-500 font-semibold">→ {log.delegatedTo.name}</span>}
                    <span className="text-caption text-slate-400 dark:text-slate-500 mr-auto">{timeAgo(log.createdAt)}</span>
                  </div>
                  {log.note && (
                    <p className="text-caption text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2 py-1">{log.note}</p>
                  )}
                  <AttachmentList items={stamped} label="النموذج الموقَّع" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── الكتلة المالية ───────────────────────────────────────────────────────────
function MoneyBlock({ detail }: { detail: FinancialDetail }) {
  const totals = amounts(detail);
  const cells = [
    { label: "المبلغ", value: totals.amount },
    { label: totals.taxRate !== null ? `الضريبة ${formatAmount(totals.taxRate)}٪` : "الضريبة", value: totals.taxAmount },
    { label: "الإجمالي", value: totals.total },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {cells.map((cell, i) => (
        <div key={cell.label}
          className={cx(
            "rounded-xl px-3 py-2 text-center border",
            i === 2
              ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
          )}>
          <p className="text-caption text-slate-400">{cell.label}</p>
          <p className={cx("text-caption font-semibold tabular-nums", i === 2 ? "text-primary" : "text-slate-700 dark:text-slate-200")}>
            {formatAmount(cell.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function BankBlock({ detail }: { detail: FinancialDetail }) {
  if (!detail.bankName && !detail.iban && !detail.accountNumber) return null;
  const rows = [
    { label: "البنك", value: detail.bankName, ltr: false },
    { label: "الآيبان", value: detail.iban, ltr: true },
    { label: "رقم الحساب", value: detail.accountNumber, ltr: true },
  ].filter((r) => r.value);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
      <p className="text-caption font-semibold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
        <Landmark className="w-3 h-3" /> الحساب البنكي
      </p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="text-caption text-slate-400 w-20 shrink-0">{r.label}</span>
            <span className={cx("text-caption font-medium text-slate-700 dark:text-slate-200 truncate", r.ltr && "tabular-nums")}
              dir={r.ltr ? "ltr" : undefined}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── بطاقة الطلب ──────────────────────────────────────────────────────────────
function RequestCard({
  request, sessionId, onReview, onResubmit, onDelete,
}: {
  request: FinancialRequestRow;
  sessionId: string;
  onReview: (r: FinancialRequestRow) => void;
  onResubmit: (r: FinancialRequestRow) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const status = STATUS_CONFIG[request.status];
  const StatusIcon = status.icon;
  const detail = request.financial;
  const totals = detail ? amounts(detail) : null;
  const isOwner = request.createdBy?.id === sessionId;
  const isHolder = request.status === "PENDING" && request.currentReviewerId === sessionId;
  const canDelete = (isOwner && ["PENDING", "RETURNED"].includes(request.status)) || isHolder;
  const ownAttachments = readAttachments(request.attachments);
  const stamped = latestStamped(request.logs);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full text-right px-4 py-3 flex items-start gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
        <span className="shrink-0 mt-0.5 grid size-9 place-items-center rounded-xl bg-primary/10 dark:bg-primary/20 text-primary">
          <Receipt className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {detail && (
              <span className="text-caption font-semibold text-slate-400 tabular-nums" dir="ltr">
                {serialLabel(detail.serial)}
              </span>
            )}
            <span className="text-caption font-semibold text-slate-800 dark:text-slate-100 truncate">{request.title}</span>
            <Badge tone={status.tone}>
              <StatusIcon className="w-3 h-3" /> {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-caption text-slate-500 dark:text-slate-400">
            {detail && <span className="font-medium text-slate-600 dark:text-slate-300">{detail.typeLabel}</span>}
            <span>·</span>
            <span>{request.createdBy?.name}</span>
            <span>·</span>
            <span>{timeAgo(request.createdAt)}</span>
            {request.status === "PENDING" && request.currentReviewer && (
              <>
                <span>·</span>
                <span className="text-primary font-medium">عند {request.currentReviewer.name}</span>
              </>
            )}
          </div>
        </div>
        {totals && (
          <span className="shrink-0 text-caption font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
            {formatAmount(totals.total)} <span className="text-slate-400 font-normal">ريال</span>
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-4">
          {request.body && (
            <p className="text-caption text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-6">{request.body}</p>
          )}

          {detail && <MoneyBlock detail={detail} />}
          {detail && <BankBlock detail={detail} />}

          <AttachmentList items={ownAttachments} label="مرفقات الطلب" />

          {stamped && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-3 py-2">
              <AttachmentList
                items={stamped.items}
                label={`النموذج الموقَّع — ${stamped.log.actor.name}`}
              />
            </div>
          )}

          {request.reviewNote && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
              <p className="text-caption font-semibold text-amber-700 dark:text-amber-400 mb-0.5">ملاحظة المراجع</p>
              <p className="text-caption text-amber-800 dark:text-amber-300 whitespace-pre-wrap">{request.reviewNote}</p>
            </div>
          )}

          <RequestTimeline logs={request.logs} />

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {isHolder && (
              <button type="button" onClick={() => onReview(request)} className={btn.primary}>
                <ShieldCheck className="w-4 h-4" /> مراجعة واتخاذ قرار
              </button>
            )}
            {isOwner && request.status === "RETURNED" && (
              <button type="button" onClick={() => onResubmit(request)} className={btn.primary}>
                <RefreshCw className="w-4 h-4" /> تعديل وإعادة الإرسال
              </button>
            )}
            {canDelete && (
              <button type="button" onClick={() => onDelete(request.id)} className={btn.ghost}>
                <Trash2 className="w-4 h-4" /> حذف
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── الصفحة ───────────────────────────────────────────────────────────────────
export default function FinancialRequestsClient({
  requests: initial, types, vatRate, hasActiveChain, canReviewAll, canManageSettings, sessionId, allEmployees,
}: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<FinancialRequestRow[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [resubmitReq, setResubmitReq] = useState<FinancialRequestRow | null>(null);
  const [reviewingReq, setReviewingReq] = useState<FinancialRequestRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"AWAITING" | "MINE" | "ALL">(() =>
    initial.some((r) => r.status === "PENDING" && r.currentReviewerId === sessionId) ? "AWAITING" : "MINE"
  );

  const refresh = useCallback(async () => {
    try {
      const fresh = await getFinancialRequestsAndMarkRead();
      setRequests(fresh as unknown as FinancialRequestRow[]);
    } catch {
      // قراءةٌ فاشلة تُبقي القائمة كما هي: أفضل من إفراغها وادّعاء أن لا طلبات.
    }
  }, []);

  // استطلاعٌ كل ١٥ ثانية، ولا يعمل والتبويب في الخلفية — كصفحة الاعتمادات.
  useEffect(() => {
    const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function handleDelete(id: string) {
    if (!(await confirmAction({ title: "حذف هذا الطلب المالي؟", confirmLabel: "حذف", tone: "danger" }))) return;
    setBusy(true);
    try {
      await deleteRequest(id);
      await refresh();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "فشل حذف الطلب");
    } finally {
      setBusy(false);
    }
  }

  const awaitingMe = requests.filter((r) => r.status === "PENDING" && r.currentReviewerId === sessionId);
  const mine = requests.filter((r) => r.createdBy?.id === sessionId);
  const all = canReviewAll ? requests : [];

  const lanes = (
    [
      { key: "AWAITING", label: "بانتظار اعتمادي", icon: ShieldCheck, count: awaitingMe.length, show: true },
      { key: "MINE",     label: "طلباتي",          icon: Send,        count: mine.length,       show: true },
      { key: "ALL",      label: "كل الطلبات",      icon: Eye,         count: all.length,        show: canReviewAll },
    ] as const
  ).filter((l) => l.show);

  const lane = tab === "AWAITING" ? awaitingMe : tab === "MINE" ? mine : all;

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      lane.filter((r) =>
        !q ||
        [
          r.title, r.body, r.createdBy?.name, r.currentReviewer?.name,
          r.financial?.typeLabel, r.financial?.bankName, r.financial?.iban,
          r.financial ? serialLabel(r.financial.serial) : null,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      ),
    [lane, q]
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <PageHeader
        icon={<Receipt className="w-6 h-6" />}
        title="الطلبات المالية"
        description={
          awaitingMe.length > 0
            ? `${awaitingMe.length} بانتظار اعتمادك · ${mine.length} من طلباتك`
            : `${mine.length} من طلباتك`
        }
        actions={
          <div className="flex items-center gap-2">
          {canManageSettings && (
            <button type="button" onClick={() => setSettingsOpen(true)} className={btn.secondary}
              title="إعدادات الطلبات المالية">
              <Settings2 className="w-4 h-4" /> الإعدادات
            </button>
          )}
          <button type="button" onClick={() => setShowForm(true)} disabled={!hasActiveChain}
            title={hasActiveChain ? undefined : "لا توجد سلسلة اعتماد مالية نشطة حالياً، راجع مسؤول النظام"}
            className={btn.primary}>
            <Plus className="w-4 h-4" /> طلب مالي جديد
          </button>
          </div>
        }
      />

      {!hasActiveChain && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-caption font-semibold leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          لا توجد سلسلة اعتماد مالية نشطة حالياً — لن تُرفع طلبات حتى يُفعّلها مسؤول النظام من صفحة سلاسل الاعتماد.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {lanes.map((l) => {
          const Icon = l.icon;
          const active = tab === l.key;
          return (
            <button key={l.key} type="button" onClick={() => setTab(l.key)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-caption font-semibold transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary hover:border-primary/40"
              )}>
              <Icon className="w-3.5 h-3.5" /> {l.label}
              <span className={cx("tabular-nums", active ? "text-primary" : "text-slate-400")}>{l.count}</span>
            </button>
          );
        })}
        <SearchField value={search} onChange={setSearch} label="بحث" placeholder="عنوان، نوع، رقم وثيقة، بنك…"
          className="ms-auto w-full sm:w-72" />
      </div>

      {busy && (
        <p className="text-caption text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ التنفيذ…</p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <EmptyState
            icon={<Receipt className="w-5 h-5" />}
            title={q ? "لا نتائج للبحث" : tab === "AWAITING" ? "لا طلبات بانتظار اعتمادك" : tab === "MINE" ? "لم ترفع طلباً مالياً بعد" : "لا طلبات مالية"}
            description={q ? "جرّب كلمةً أخرى" : tab === "MINE" ? "ابدأ بطلبٍ جديد من الزرّ أعلى الصفحة" : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => (
            <RequestCard key={r.id} request={r} sessionId={sessionId}
              onReview={setReviewingReq} onResubmit={setResubmitReq} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {settingsOpen && (
        <FinancialSettingsSheet
          vatRate={vatRate}
          onClose={() => setSettingsOpen(false)}
          // النسبةُ والأنواعُ تُقرآن في الخادم عند الرسم، فإنعاشُ المسار هو
          // ما يُنزلهما إلى النموذج — لا حالةٌ محليّةٌ تُحدَّث على التخمين.
          onSaved={() => router.refresh()}
        />
      )}

      {reviewingReq && (
        <ReviewModal
          request={reviewingReq}
          allEmployees={allEmployees}
          onClose={() => setReviewingReq(null)}
          onDone={refresh}
        />
      )}

      {(showForm || resubmitReq) && (
        <FinancialRequestForm
          types={types}
          vatRate={vatRate}
          hasActiveChain={hasActiveChain}
          initial={resubmitReq ?? undefined}
          onClose={() => { setShowForm(false); setResubmitReq(null); }}
          onDone={refresh}
        />
      )}
    </div>
  );
}
