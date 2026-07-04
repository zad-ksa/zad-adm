"use client";

import { useState, useTransition } from "react";
import {
  Plus, X, Send, Loader2, AlertCircle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, FileText, Link2, ExternalLink, Trash2,
  RefreshCw, MessageSquare, CornerUpLeft, Check, ShieldCheck, Flag,
  User, Calendar,
} from "lucide-react";
import {
  createRequest, reviewRequest, resubmitRequest, deleteRequest,
} from "@/app/actions/requests";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "PENDING" | "RETURNED" | "APPROVED" | "REJECTED";

type Request = {
  id: string;
  title: string;
  body: string | null;
  fileUrl: string | null;
  priority: Priority;
  status: Status;
  reviewNote: string | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  createdBy?: { id: string; name: string; role: string; avatarUrl: string | null };
  reviewedBy?: { id: string; name: string } | null;
};

type Props = {
  requests: Request[];
  isExec: boolean;
  sessionId: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; icon: string }> = {
  URGENT: { label: "عاجل",    color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20",    border: "border-red-300 dark:border-red-700",    icon: "🚨" },
  HIGH:   { label: "عالية",   color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-300 dark:border-orange-700", icon: "🔴" },
  MEDIUM: { label: "متوسطة",  color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-300 dark:border-amber-700",  icon: "🟡" },
  LOW:    { label: "منخفضة",  color: "text-slate-500 dark:text-slate-400",  bg: "bg-slate-50 dark:bg-slate-800",     border: "border-slate-200 dark:border-slate-700",  icon: "🟢" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:  { label: "قيد المراجعة", color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20",   icon: Clock },
  RETURNED: { label: "مرجع للتعديل", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", icon: CornerUpLeft },
  APPROVED: { label: "معتمد",        color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: CheckCircle2 },
  REJECTED: { label: "مرفوض",        color: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-900/20",     icon: X },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  EXECUTIVE_DIRECTOR: "الإدارة التنفيذية",
  GENERAL_MANAGER: "المدير العام",
  ADMINISTRATIVE_SECRETARIAT: "مساعد المدير",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
};

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(date).toLocaleDateString("ar-SA");
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

// ── نموذج الطلب الجديد / التعديل ─────────────────────────────────────────────
function RequestForm({
  initial,
  onClose,
  onDone,
  isResubmit,
  requestId,
}: {
  initial?: Partial<Request>;
  onClose: () => void;
  onDone: () => void;
  isResubmit?: boolean;
  requestId?: string;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl || "");
  const [priority, setPriority] = useState<Priority>(initial?.priority || "MEDIUM");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!title.trim()) { setError("العنوان مطلوب"); return; }
    setError("");
    startTransition(async () => {
      try {
        if (isResubmit && requestId) {
          await resubmitRequest({ requestId, title, body, fileUrl, priority });
        } else {
          await createRequest({ title, body, fileUrl, priority });
        }
        onDone();
        onClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            {isResubmit ? "إعادة إرسال الطلب" : "طلب جديد"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* العنوان */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">عنوان الطلب *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="أدخل عنوان الطلب..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* مستوى الأهمية */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">مستوى الأهمية</label>
            <div className="grid grid-cols-4 gap-2">
              {(["URGENT", "HIGH", "MEDIUM", "LOW"] as Priority[]).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                      priority === p
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-2 ring-offset-1 ring-current`
                        : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <span className="text-base">{cfg.icon}</span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* نص الطلب */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
              نص الطلب <span className="font-normal text-slate-400">(اختياري إن أرفقت رابطاً)</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              placeholder="اكتب تفاصيل طلبك هنا..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* رابط الملف */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block flex items-center gap-1">
              <Link2 className="w-3 h-3" /> رابط الملف (Google Drive أو أي رابط)
            </label>
            <input
              value={fileUrl}
              onChange={e => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              dir="ltr"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">إلغاء</button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── نموذج المراجعة (للإدارة) ──────────────────────────────────────────────────
function ReviewModal({
  request,
  onClose,
  onDone,
}: {
  request: Request;
  onClose: () => void;
  onDone: () => void;
}) {
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | "RETURNED">("APPROVED");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (action !== "APPROVED" && !note.trim()) {
      setError("يجب ذكر السبب أو الملاحظات");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await reviewRequest({ requestId: request.id, action, reviewNote: note });
        onDone();
        onClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            مراجعة الطلب
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
            {request.title}
          </p>

          {/* اختيار الإجراء */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "APPROVED", label: "اعتماد", icon: Check, color: "emerald" },
              { value: "RETURNED", label: "إرجاع للتعديل", icon: CornerUpLeft, color: "amber" },
              { value: "REJECTED", label: "رفض", icon: X, color: "red" },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAction(opt.value)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                  action === opt.value
                    ? opt.color === "emerald"
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-300 dark:ring-emerald-700"
                      : opt.color === "amber"
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-400 text-amber-700 dark:text-amber-300 ring-2 ring-amber-300 dark:ring-amber-700"
                      : "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-300 ring-2 ring-red-300 dark:ring-red-700"
                    : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* الملاحظات */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
              {action === "APPROVED" ? "ملاحظات الاعتماد (اختياري)" : "السبب / الملاحظات *"}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder={action === "APPROVED" ? "يمكنك إضافة ملاحظة..." : "اذكر السبب أو التعديلات المطلوبة..."}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">إلغاء</button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className={`flex items-center gap-2 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
              action === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" :
              action === "RETURNED" ? "bg-amber-500 hover:bg-amber-600" :
              "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isPending ? "جاري الحفظ..." : "تأكيد"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── بطاقة الطلب ───────────────────────────────────────────────────────────────
function RequestCard({
  request,
  isExec,
  sessionId,
  onReview,
  onResubmit,
  onDelete,
  onRefresh,
}: {
  request: Request;
  isExec: boolean;
  sessionId: string;
  onReview: (r: Request) => void;
  onResubmit: (r: Request) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[request.status];
  const priority = PRIORITY_CONFIG[request.priority];
  const StatusIcon = status.icon;

  const isOwner = request.createdBy ? request.createdBy.id === sessionId : true;
  const canDelete = isExec || (isOwner && ["PENDING", "RETURNED"].includes(request.status));

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border-r-4 ${priority.border} border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-sm`}>
      {/* رأس البطاقة */}
      <div className="flex items-start gap-3 p-3">
        <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${priority.bg}`}>
          <span className="text-sm">{priority.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{request.title}</span>
            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}`}>
              {priority.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-400 dark:text-slate-500">
            {isExec && request.createdBy && (
              <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                <User className="w-3 h-3" />
                {request.createdBy.name}
                <span className="opacity-70">({ROLE_LABELS[request.createdBy.role] || request.createdBy.role})</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {timeAgo(request.createdAt)}
            </span>
            {request.reviewedBy && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                راجعه: {request.reviewedBy.name}
                {request.reviewedAt && ` · ${timeAgo(request.reviewedAt)}`}
              </span>
            )}
          </div>
        </div>

        {/* أزرار */}
        <div className="flex items-center gap-1 shrink-0">
          {/* توسيع */}
          {(request.body || request.fileUrl || request.reviewNote) && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
              title={expanded ? "إخفاء" : "عرض التفاصيل"}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* مراجعة (للإدارة فقط على PENDING) */}
          {isExec && request.status === "PENDING" && (
            <button
              onClick={() => onReview(request)}
              className="flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-3 h-3" /> مراجعة
            </button>
          )}

          {/* إعادة إرسال (لصاحب الطلب فقط على RETURNED) */}
          {!isExec && request.status === "RETURNED" && (
            <button
              onClick={() => onResubmit(request)}
              className="flex items-center gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> تعديل وإعادة إرسال
            </button>
          )}

          {/* حذف */}
          {canDelete && (
            <button
              onClick={() => onDelete(request.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
              title="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* التفاصيل المنسدلة */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-100 dark:border-slate-700/50 pt-2.5">
          {request.body && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> نص الطلب
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{request.body}</p>
            </div>
          )}

          {request.fileUrl && (
            <a
              href={request.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              فتح الملف المرفق
            </a>
          )}

          {request.reviewNote && (
            <div className={`rounded-xl p-3 ${request.status === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/20" : request.status === "RETURNED" ? "bg-amber-50 dark:bg-amber-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
              <p className={`text-xs font-bold mb-1 flex items-center gap-1 ${request.status === "APPROVED" ? "text-emerald-700 dark:text-emerald-400" : request.status === "RETURNED" ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}>
                <MessageSquare className="w-3 h-3" />
                {request.status === "APPROVED" ? "ملاحظات الاعتماد" : request.status === "RETURNED" ? "ملاحظات الإرجاع" : "سبب الرفض"}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{request.reviewNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── المكون الرئيسي ────────────────────────────────────────────────────────────
export default function RequestsClient({ requests: initial, isExec, sessionId }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [resubmitRequest, setResubmitRequest] = useState<Request | null>(null);
  const [reviewingRequest, setReviewingRequest] = useState<Request | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("ALL");
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => { router.refresh(); });
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;
    try {
      await deleteRequest(id);
      refresh();
    } catch (e: any) { alert(e.message); }
  }

  const filtered = filterStatus === "ALL" ? requests : requests.filter(r => r.status === filterStatus);

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    RETURNED: requests.filter(r => r.status === "RETURNED").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {isExec ? "إدارة الطلبات" : "طلباتي"}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isExec ? `${requests.length} طلب · ${counts.PENDING} قيد المراجعة` : `${requests.length} طلب`}
            </p>
          </div>
        </div>
        {!isExec && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> طلب جديد
          </button>
        )}
      </div>

      {/* فلاتر الحالة */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: "ALL", label: "الكل" },
          { key: "PENDING", label: "قيد المراجعة" },
          { key: "RETURNED", label: "مرجع للتعديل" },
          { key: "APPROVED", label: "معتمد" },
          { key: "REJECTED", label: "مرفوض" },
        ] as const).map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilterStatus(opt.key)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
              filterStatus === opt.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}
          >
            {opt.label}
            {counts[opt.key] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterStatus === opt.key ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-600"}`}>
                {counts[opt.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* قائمة الطلبات */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-16 text-center">
          <Send className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            {filterStatus === "ALL"
              ? isExec ? "لا توجد طلبات بعد" : "لم ترفع أي طلب بعد"
              : "لا توجد طلبات بهذه الحالة"}
          </p>
          {!isExec && filterStatus === "ALL" && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-blue-500 hover:underline font-bold"
            >
              ارفع طلبك الأول
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <RequestCard
              key={r.id}
              request={r}
              isExec={isExec}
              sessionId={sessionId}
              onReview={setReviewingRequest}
              onResubmit={setResubmitRequest}
              onDelete={handleDelete}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {/* نموذج طلب جديد */}
      {showForm && (
        <RequestForm
          onClose={() => setShowForm(false)}
          onDone={refresh}
        />
      )}

      {/* نموذج إعادة إرسال */}
      {resubmitRequest && (
        <RequestForm
          initial={resubmitRequest}
          requestId={resubmitRequest.id}
          isResubmit
          onClose={() => setResubmitRequest(null)}
          onDone={refresh}
        />
      )}

      {/* نموذج المراجعة */}
      {reviewingRequest && (
        <ReviewModal
          request={reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
