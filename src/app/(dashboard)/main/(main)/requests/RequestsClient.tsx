"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Plus, X, Send, Loader2, AlertCircle, CheckCircle2, Clock,
  FileText, Link2, ExternalLink, Trash2,
  RefreshCw, MessageSquare, CornerUpLeft, Check, ShieldCheck,
  User, Calendar, ArrowRight, GitBranch, UserCheck, ChevronRight,
} from "lucide-react";
import {
  createRequest, reviewRequest, resubmitRequest, deleteRequest,
  getMyRequests, getAllRequests,
} from "@/app/actions/requests";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const RequestForm = dynamic(() => import("@/components/requests/RequestFormModal"), { ssr: false });
const ReviewModal = dynamic(() => import("@/components/requests/ReviewModal"), { ssr: false });

// ── الأقسام ───────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "زاد",                   label: "إدارة زاد",               color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20",       border: "border-blue-400" },
  { key: "التخطيط الاستراتيجي",   label: "التخطيط الاستراتيجي",    color: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-50 dark:bg-indigo-900/20",   border: "border-indigo-400" },
  { key: "الحوكمة",               label: "الحوكمة",                 color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-900/20",   border: "border-violet-400" },
  { key: "تنمية الموارد المالية", label: "تنمية الموارد المالية",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-400" },
  { key: "المالية",               label: "المالية",                 color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-900/20",     border: "border-amber-400" },
  { key: "الإعلامية",             label: "الإعلامية",               color: "text-pink-600 dark:text-pink-400",       bg: "bg-pink-50 dark:bg-pink-900/20",       border: "border-pink-400" },
  { key: "التقنية",               label: "التقنية",                 color: "text-cyan-600 dark:text-cyan-400",       bg: "bg-cyan-50 dark:bg-cyan-900/20",       border: "border-cyan-400" },
  { key: "التسويق",               label: "التسويق",                 color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-900/20",   border: "border-orange-400" },
  { key: "خدمات المشاريع",        label: "خدمات المشاريع",          color: "text-teal-600 dark:text-teal-400",       bg: "bg-teal-50 dark:bg-teal-900/20",       border: "border-teal-400" },
  { key: "الإدارية",              label: "الإدارية",                color: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-900/20",       border: "border-rose-400" },
  { key: "الإسناد الحكومي",       label: "الإسناد الحكومي",         color: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-900/20",         border: "border-sky-400" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "PENDING" | "RETURNED" | "APPROVED" | "REJECTED" | "DELEGATED";
type Action = "SUBMITTED" | "FORWARDED" | "APPROVED_FINAL" | "REJECTED" | "RETURNED" | "DELEGATED" | "RESUBMITTED";

type Employee = { id: string; name: string; role: string; avatarUrl?: string | null };

type RequestLog = {
  id: string;
  stepOrder: number;
  action: Action;
  note: string | null;
  createdAt: string | Date;
  actor: Employee;
  delegatedTo: Employee | null;
};

type Request = {
  id: string;
  title: string;
  category: string | null;
  body: string | null;
  fileUrl: string | null;
  attachments?: any | null;
  priority: Priority;
  status: Status;
  reviewNote: string | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  currentStepOrder: number;
  currentReviewerId: string | null;
  createdBy?: Employee;
  reviewedBy?: Employee | null;
  currentReviewer?: Employee | null;
  delegatedTo?: Employee | null;
  chain?: { id: string; name: string } | null;
  logs: RequestLog[];
};

type Props = {
  requests: Request[];
  isExec: boolean;
  sessionId: string;
  allEmployees: Employee[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; icon: string }> = {
  URGENT: { label: "عاجل",    color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/20",      border: "border-red-400 dark:border-red-600",    icon: "🚨" },
  HIGH:   { label: "عالية",   color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20",border: "border-orange-400 dark:border-orange-600", icon: "🔴" },
  MEDIUM: { label: "متوسطة",  color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-400 dark:border-amber-600",  icon: "🟡" },
  LOW:    { label: "منخفضة",  color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-50 dark:bg-slate-800",     border: "border-slate-300 dark:border-slate-600",  icon: "🟢" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:  { label: "قيد المراجعة", color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/20",      icon: Clock },
  RETURNED: { label: "مرجع للتعديل", color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/20",    icon: CornerUpLeft },
  APPROVED: { label: "معتمد",        color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-900/20",icon: CheckCircle2 },
  REJECTED: { label: "مرفوض",        color: "text-red-600 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-900/20",        icon: X },
  DELEGATED:{ label: "محوّل للتنفيذ",color: "text-purple-600 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-900/20",  icon: UserCheck },
};

const ACTION_CONFIG: Record<Action, { label: string; color: string; icon: any }> = {
  SUBMITTED:     { label: "رُفع الطلب",             color: "text-blue-500",    icon: Send },
  FORWARDED:     { label: "مُرِّر للمستوى التالي",  color: "text-indigo-500",  icon: ArrowRight },
  APPROVED_FINAL:{ label: "اعتُمد نهائياً",          color: "text-emerald-500", icon: CheckCircle2 },
  REJECTED:      { label: "رُفض",                   color: "text-red-500",     icon: X },
  RETURNED:      { label: "أُرجع للتعديل",           color: "text-amber-500",   icon: CornerUpLeft },
  DELEGATED:     { label: "حُوِّل التنفيذ",          color: "text-purple-500",  icon: UserCheck },
  RESUBMITTED:   { label: "أُعيد إرساله",            color: "text-blue-400",    icon: RefreshCw },
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




// ── خط سير الطلب ─────────────────────────────────────────────────────────────
function RequestTimeline({ logs }: { logs: RequestLog[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        <GitBranch className="w-3 h-3" /> خط سير الطلب
      </p>
      <div className="relative">
        <div className="absolute right-[14px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          {logs.map(log => {
            const cfg = ACTION_CONFIG[log.action];
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 relative">
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 ring-2 ring-white dark:ring-slate-900 ${
                  log.action === "APPROVED_FINAL" ? "bg-emerald-100 dark:bg-emerald-900/40" :
                  log.action === "REJECTED"       ? "bg-red-100 dark:bg-red-900/40" :
                  log.action === "RETURNED"       ? "bg-amber-100 dark:bg-amber-900/40" :
                  log.action === "DELEGATED"      ? "bg-purple-100 dark:bg-purple-900/40" :
                  log.action === "FORWARDED"      ? "bg-indigo-100 dark:bg-indigo-900/40" :
                  "bg-blue-100 dark:bg-blue-900/40"
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.actor.name}</span>
                    <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                    {log.delegatedTo && <span className="text-[10px] text-purple-500 font-bold">→ {log.delegatedTo.name}</span>}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mr-auto">{timeAgo(log.createdAt)}</span>
                  </div>
                  {log.note && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2 py-1">{log.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── بطاقة الطلب ───────────────────────────────────────────────────────────────
function RequestCard({
  request, isExec, sessionId, allEmployees, onReview, onResubmit, onDelete,
}: {
  request: Request; isExec: boolean; sessionId: string; allEmployees: Employee[];
  onReview: (r: Request) => void; onResubmit: (r: Request) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[request.status];
  const priority = PRIORITY_CONFIG[request.priority];
  const StatusIcon = status.icon;

  const isOwner = request.createdBy ? request.createdBy.id === sessionId : true;
  const canDelete = isExec || (isOwner && ["PENDING", "RETURNED"].includes(request.status));

  const isCurrentReviewer =
    request.status === "PENDING" && isExec && (
      request.currentReviewerId === null
        ? true
        : request.currentReviewerId === sessionId
    );

  const catInfo = CATEGORIES.find(c => c.key === request.category);
  const attachments = typeof request.attachments === 'string' ? JSON.parse(request.attachments) : request.attachments;
  const hasDetails = !!(request.body || request.fileUrl || (Array.isArray(attachments) && attachments.length > 0) || request.reviewNote || request.logs.length > 0);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border-r-4 ${priority.border} border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-sm ${hasDetails ? "cursor-pointer" : ""}`}
      onClick={hasDetails ? () => setExpanded(v => !v) : undefined}>
      <div className="flex items-start gap-3 p-3">
        <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${priority.bg}`}>
          <span className="text-sm">{priority.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{request.title}</span>
            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              <StatusIcon className="w-3 h-3" />{status.label}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}`}>
              {priority.label}
            </span>
            {catInfo && (
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${catInfo.bg} ${catInfo.color} ${catInfo.border}`}>
                {catInfo.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-400 dark:text-slate-500">
            {isExec && request.createdBy && (
              <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                <User className="w-3 h-3" />
                {request.createdBy.name}
                <span className="opacity-70">({ROLE_LABELS[request.createdBy.role] || request.createdBy.role})</span>
              </span>
            )}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{timeAgo(request.createdAt)}</span>
            {request.status === "PENDING" && request.currentReviewer && (
              <span className="flex items-center gap-1 text-primary font-bold">
                <ChevronRight className="w-3 h-3" /> عند: {request.currentReviewer.name}
              </span>
            )}
            {request.chain && (
              <span className="flex items-center gap-1 text-indigo-400">
                <GitBranch className="w-3 h-3" /> {request.chain.name}
              </span>
            )}
            {request.status === "DELEGATED" && request.delegatedTo && (
              <span className="flex items-center gap-1 text-purple-500 font-bold">
                <UserCheck className="w-3 h-3" /> ينفذه: {request.delegatedTo.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {isCurrentReviewer && (
            <button onClick={() => onReview(request)}
              className="flex items-center gap-1 text-xs font-bold bg-primary hover:bg-primary/90 text-white px-2.5 py-1.5 rounded-lg transition-colors">
              <ShieldCheck className="w-3 h-3" /> مراجعة
            </button>
          )}
          {!isExec && request.status === "RETURNED" && isOwner && (
            <button onClick={() => onResubmit(request)}
              className="flex items-center gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg transition-colors">
              <RefreshCw className="w-3 h-3" /> تعديل وإعادة إرسال
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(request.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="حذف">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasDetails && expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700/50 pt-3">
          {request.body && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> نص الطلب
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{request.body}</p>
            </div>
          )}
          {request.fileUrl && (
            <a href={request.fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline bg-primary/10 rounded-xl px-3 py-2">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" /> فتح الملف المرفق
            </a>
          )}
          {Array.isArray(attachments) && attachments.length > 0 && (
            <div className="space-y-1.5">
              {attachments.map((att: any, i: number) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs font-bold text-primary hover:underline bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2 transition-colors border border-primary/10">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{att.name || "ملف مرفق"}</span>
                  </div>
                  {att.size && <span className="text-[10px] text-primary/70 shrink-0 font-normal">{(att.size / 1024 / 1024).toFixed(2)} MB</span>}
                </a>
              ))}
            </div>
          )}
          {request.reviewNote && (
            <div className={`rounded-xl p-3 ${
              request.status === "APPROVED"  ? "bg-emerald-50 dark:bg-emerald-900/20" :
              request.status === "RETURNED"  ? "bg-amber-50 dark:bg-amber-900/20" :
              request.status === "DELEGATED" ? "bg-purple-50 dark:bg-purple-900/20" :
              "bg-red-50 dark:bg-red-900/20"}`}>
              <p className={`text-xs font-bold mb-1 flex items-center gap-1 ${
                request.status === "APPROVED"  ? "text-emerald-700 dark:text-emerald-400" :
                request.status === "RETURNED"  ? "text-amber-700 dark:text-amber-400" :
                request.status === "DELEGATED" ? "text-purple-700 dark:text-purple-400" :
                "text-red-700 dark:text-red-400"}`}>
                <MessageSquare className="w-3 h-3" />
                {request.status === "APPROVED"  ? "ملاحظات الاعتماد" :
                 request.status === "RETURNED"  ? "ملاحظات الإرجاع" :
                 request.status === "DELEGATED" ? "ملاحظات التحويل" : "سبب الرفض"}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{request.reviewNote}</p>
            </div>
          )}
          <RequestTimeline logs={request.logs} />
        </div>
      )}
    </div>
  );
}

// ── المكون الرئيسي ────────────────────────────────────────────────────────────
export default function RequestsClient({ requests: initial, isExec, sessionId, allEmployees }: Props) {
  const [requests, setRequests] = useState<Request[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [resubmitReq, setResubmitReq] = useState<Request | null>(null);
  const [reviewingReq, setReviewingReq] = useState<Request | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("PENDING");
  const [loading, setLoading] = useState(false);

  // جلب البيانات الحية مباشرة من server action
  const fetchRequests = useCallback(async () => {
    try {
      const fresh = isExec ? await getAllRequests() : await getMyRequests();
      setRequests(fresh as any);
    } catch {}
  }, [isExec]);

  // polling كل 15 ثانية للإشعارات والتحديثات
  useEffect(() => {
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  async function handleAction(fn: () => Promise<void>) {
    setLoading(true);
    try {
      await fn();
      await fetchRequests();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;
    await handleAction(() => deleteRequest(id));
  }

  const filtered = filterStatus === "ALL" ? requests : requests.filter(r => r.status === filterStatus);
  const counts = {
    ALL:      requests.length,
    PENDING:  requests.filter(r => r.status === "PENDING").length,
    RETURNED: requests.filter(r => r.status === "RETURNED").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
    DELEGATED:requests.filter(r => r.status === "DELEGATED").length,
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-primary" />
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
        <div className="flex items-center gap-2">
          <button onClick={fetchRequests} disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors" title="تحديث">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
            <Plus className="w-3.5 h-3.5" /> طلب جديد
          </button>
        </div>
      </div>

      {/* فلاتر الحالة */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: "PENDING",  label: "قيد المراجعة" },
          { key: "ALL",      label: "الكل" },
          { key: "RETURNED", label: "مرجع" },
          { key: "APPROVED", label: "معتمد" },
          { key: "DELEGATED",label: "محوّل" },
          { key: "REJECTED", label: "مرفوض" },
        ] as const).map(opt => (
          <button key={opt.key} onClick={() => setFilterStatus(opt.key)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
              filterStatus === opt.key ? "bg-primary text-white"
              : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
            }`}>
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
            {filterStatus === "ALL" ? (isExec ? "لا توجد طلبات بعد" : "لم ترفع أي طلب بعد") : "لا توجد طلبات بهذه الحالة"}
          </p>
          {filterStatus === "ALL" && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-primary hover:underline font-bold">
              ارفع طلبك الأول
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <RequestCard key={r.id} request={r} isExec={isExec} sessionId={sessionId}
              allEmployees={allEmployees}
              onReview={req => setReviewingReq(req)}
              onResubmit={req => setResubmitReq(req)}
              onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showForm && (
        <RequestForm onClose={() => setShowForm(false)}
          onDone={() => handleAction(async () => {})} />
      )}
      {resubmitReq && (
        <RequestForm initial={resubmitReq} requestId={resubmitReq.id} isResubmit
          onClose={() => setResubmitReq(null)}
          onDone={() => handleAction(async () => {})} />
      )}
      {reviewingReq && (
        <ReviewModal request={reviewingReq} allEmployees={allEmployees}
          onClose={() => setReviewingReq(null)}
          onDone={() => handleAction(async () => {})} />
      )}
    </div>
  );
}
