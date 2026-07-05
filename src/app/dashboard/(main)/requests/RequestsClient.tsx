"use client";

import { useState, useTransition } from "react";
import {
  Plus, X, Send, Loader2, AlertCircle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, FileText, Link2, ExternalLink, Trash2,
  RefreshCw, MessageSquare, CornerUpLeft, Check, ShieldCheck, Flag,
  User, Calendar, ArrowRight, GitBranch, UserCheck, ChevronRight,
} from "lucide-react";
import {
  createRequest, reviewRequest, resubmitRequest, deleteRequest,
} from "@/app/actions/requests";
import { useRouter } from "next/navigation";

// ── الأقسام ───────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "زاد",                   label: "إدارة زاد",               color: "text-primary dark:text-primary/60",       bg: "bg-primary/10 dark:bg-primary/20",       border: "border-primary/50" },
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
  priority: Priority;
  status: Status;
  reviewNote: string | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  currentStepOrder: number;
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
  PENDING:  { label: "قيد المراجعة", color: "text-primary dark:text-primary/60",      bg: "bg-primary/10 dark:bg-primary/20",      icon: Clock },
  RETURNED: { label: "مرجع للتعديل", color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-900/20",    icon: CornerUpLeft },
  APPROVED: { label: "معتمد",        color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-900/20",icon: CheckCircle2 },
  REJECTED: { label: "مرفوض",        color: "text-red-600 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-900/20",        icon: X },
  DELEGATED:{ label: "محوّل للتنفيذ",color: "text-purple-600 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-900/20",  icon: UserCheck },
};

const ACTION_CONFIG: Record<Action, { label: string; color: string; icon: any }> = {
  SUBMITTED:     { label: "رُفع الطلب",             color: "text-primary/80",    icon: Send },
  FORWARDED:     { label: "مُرِّر للمستوى التالي",  color: "text-indigo-500",  icon: ArrowRight },
  APPROVED_FINAL:{ label: "اعتُمد نهائياً",          color: "text-emerald-500", icon: CheckCircle2 },
  REJECTED:      { label: "رُفض",                   color: "text-red-500",     icon: X },
  RETURNED:      { label: "أُرجع للتعديل",           color: "text-amber-500",   icon: CornerUpLeft },
  DELEGATED:     { label: "حُوِّل التنفيذ",          color: "text-purple-500",  icon: UserCheck },
  RESUBMITTED:   { label: "أُعيد إرساله",            color: "text-primary/60",    icon: RefreshCw },
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

// ── نموذج الطلب ───────────────────────────────────────────────────────────────
function RequestForm({
  initial, onClose, onDone, isResubmit, requestId,
}: {
  initial?: Partial<Request>; onClose: () => void; onDone: () => void;
  isResubmit?: boolean; requestId?: string;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState(initial?.category || "");
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
          await resubmitRequest({ requestId, title, category, body, fileUrl, priority });
        } else {
          await createRequest({ title, category, body, fileUrl, priority });
        }
        onDone(); onClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary/80" />
            {isResubmit ? "إعادة إرسال الطلب" : "طلب جديد"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">عنوان الطلب *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="أدخل عنوان الطلب..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">القسم <span className="font-normal text-slate-400">(اختياري)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button key={cat.key} type="button" onClick={() => setCategory(category === cat.key ? "" : cat.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    category === cat.key
                      ? `${cat.bg} ${cat.border} ${cat.color} ring-1 ring-current`
                      : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">مستوى الأهمية</label>
            <div className="grid grid-cols-4 gap-2">
              {(["URGENT", "HIGH", "MEDIUM", "LOW"] as Priority[]).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                      priority === p ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-2 ring-offset-1 ring-current`
                      : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                    }`}>
                    <span className="text-base">{cfg.icon}</span>{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
              نص الطلب <span className="font-normal text-slate-400">(اختياري)</span>
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              placeholder="اكتب تفاصيل طلبك هنا..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> رابط ملف (Google Drive)
            </label>
            <input value={fileUrl} onChange={e => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/..." dir="ltr"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">إلغاء</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── نموذج المراجعة ─────────────────────────────────────────────────────────────
function ReviewModal({
  request, onClose, onDone, allEmployees,
}: {
  request: Request; onClose: () => void; onDone: () => void; allEmployees: Employee[];
}) {
  type ReviewAction = "APPROVED_FINAL" | "FORWARDED" | "REJECTED" | "RETURNED" | "DELEGATED";
  const [action, setAction] = useState<ReviewAction>("FORWARDED");
  const [note, setNote] = useState("");
  const [delegatedToId, setDelegatedToId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // هل توجد خطوة تالية في السلسلة؟
  const hasNextStep = !!request.chain;

  const actions: { value: ReviewAction; label: string; icon: any; color: string; desc: string }[] = [
    ...(hasNextStep ? [{ value: "FORWARDED" as ReviewAction, label: "تمرير للأعلى", icon: ArrowRight, color: "indigo", desc: "إرسال للمستوى التالي في السلسلة" }] : []),
    { value: "APPROVED_FINAL", label: "اعتماد نهائي", icon: Check, color: "emerald", desc: "اعتماد الطلب وإغلاقه" },
    { value: "RETURNED", label: "إرجاع للتعديل", icon: CornerUpLeft, color: "amber", desc: "إرجاع للمرسل مع ملاحظات" },
    { value: "REJECTED", label: "رفض", icon: X, color: "red", desc: "رفض الطلب نهائياً" },
    { value: "DELEGATED", label: "تحويل التنفيذ", icon: UserCheck, color: "purple", desc: "تحويل تنفيذ الطلب لشخص آخر" },
  ];

  function handleSubmit() {
    if (action !== "APPROVED_FINAL" && action !== "DELEGATED" && !note.trim()) {
      setError("يجب ذكر السبب أو الملاحظات"); return;
    }
    if (action === "DELEGATED" && !delegatedToId) {
      setError("يجب اختيار الشخص المحوَّل إليه"); return;
    }
    setError("");
    startTransition(async () => {
      try {
        await reviewRequest({ requestId: request.id, action, note, delegatedToId: delegatedToId || undefined });
        onDone(); onClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  const colorMap: Record<string, string> = {
    indigo:  "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-700 dark:text-indigo-300 ring-indigo-300 dark:ring-indigo-700",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 text-emerald-700 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-700",
    amber:   "bg-amber-50 dark:bg-amber-900/20 border-amber-400 text-amber-700 dark:text-amber-300 ring-amber-300 dark:ring-amber-700",
    red:     "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-300 ring-red-300 dark:ring-red-700",
    purple:  "bg-purple-50 dark:bg-purple-900/20 border-purple-400 text-purple-700 dark:text-purple-300 ring-purple-300 dark:ring-purple-700",
  };
  const btnMap: Record<string, string> = {
    indigo: "bg-indigo-600 hover:bg-indigo-700", emerald: "bg-emerald-600 hover:bg-emerald-700",
    amber: "bg-amber-500 hover:bg-amber-600", red: "bg-red-600 hover:bg-red-700",
    purple: "bg-purple-600 hover:bg-purple-700",
  };
  const selectedAction = actions.find(a => a.value === action)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary/80" /> مراجعة الطلب
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5">
            {request.title}
          </p>

          {/* اختيار الإجراء */}
          <div className="grid grid-cols-2 gap-2">
            {actions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setAction(opt.value)}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-right ${
                  action === opt.value
                    ? `${colorMap[opt.color]} ring-2`
                    : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300"
                }`}>
                <opt.icon className="w-4 h-4 shrink-0" />
                <div>
                  <div>{opt.label}</div>
                  <div className="font-normal text-[10px] opacity-70">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* اختيار الشخص عند التحويل */}
          {action === "DELEGATED" && (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">الشخص المحوَّل إليه *</label>
              <select value={delegatedToId} onChange={e => setDelegatedToId(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">اختر شخصاً...</option>
                {allEmployees.filter(e => e.id !== request.createdBy?.id).map(e => (
                  <option key={e.id} value={e.id}>{e.name} — {ROLE_LABELS[e.role] || e.role}</option>
                ))}
              </select>
            </div>
          )}

          {/* الملاحظات */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">
              {action === "APPROVED_FINAL" || action === "FORWARDED" || action === "DELEGATED"
                ? "ملاحظات (اختياري)" : "السبب / الملاحظات *"}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="اكتب ملاحظاتك..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">إلغاء</button>
          <button onClick={handleSubmit} disabled={isPending}
            className={`flex items-center gap-2 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors ${btnMap[selectedAction?.color || "emerald"]}`}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isPending ? "جاري الحفظ..." : "تأكيد"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── خط سير الطلب (Timeline) ───────────────────────────────────────────────────
function RequestTimeline({ logs }: { logs: RequestLog[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="space-y-0 mt-2">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        <GitBranch className="w-3 h-3" /> خط سير الطلب
      </p>
      <div className="relative">
        {/* خط عمودي */}
        <div className="absolute right-[14px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          {logs.map((log, i) => {
            const cfg = ACTION_CONFIG[log.action];
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 relative">
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 ring-2 ring-white dark:ring-slate-900 ${
                  log.action === "APPROVED_FINAL" ? "bg-emerald-100 dark:bg-emerald-900/40" :
                  log.action === "REJECTED" ? "bg-red-100 dark:bg-red-900/40" :
                  log.action === "RETURNED" ? "bg-amber-100 dark:bg-amber-900/40" :
                  log.action === "DELEGATED" ? "bg-purple-100 dark:bg-purple-900/40" :
                  log.action === "FORWARDED" ? "bg-indigo-100 dark:bg-indigo-900/40" :
                  "bg-primary/10 dark:bg-primary/30"
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.actor.name}</span>
                    <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                    {log.delegatedTo && (
                      <span className="text-[10px] text-purple-500 font-bold">→ {log.delegatedTo.name}</span>
                    )}
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
  request, isExec, sessionId, allEmployees, onReview, onResubmit, onDelete, onRefresh,
}: {
  request: Request; isExec: boolean; sessionId: string; allEmployees: Employee[];
  onReview: (r: Request) => void; onResubmit: (r: Request) => void;
  onDelete: (id: string) => void; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[request.status];
  const priority = PRIORITY_CONFIG[request.priority];
  const StatusIcon = status.icon;

  const isOwner = request.createdBy ? request.createdBy.id === sessionId : true;
  const canDelete = isExec || (isOwner && ["PENDING", "RETURNED"].includes(request.status));
  const canReview = isExec && request.status === "PENDING";
  const hasDetails = !!(request.body || request.fileUrl || request.reviewNote || request.logs.length > 0);

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
              <StatusIcon className="w-3 h-3" />{status.label}
            </span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}`}>
              {priority.label}
            </span>
          </div>

          {request.category && (() => {
            const cat = CATEGORIES.find(c => c.key === request.category);
            return cat ? (
              <span className={`inline-flex mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color} ${cat.border}`}>
                {cat.label}
              </span>
            ) : null;
          })()}
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
              <span className="flex items-center gap-1 text-primary/80 font-bold">
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

        {/* أزرار */}
        <div className="flex items-center gap-1 shrink-0">
          {hasDetails && (
            <button onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
              title={expanded ? "إخفاء" : "عرض التفاصيل"}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          {canReview && (
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

      {/* التفاصيل المنسدلة */}
      {expanded && (
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
              className="flex items-center gap-2 text-xs font-bold text-primary dark:text-primary/60 hover:underline bg-primary/10 dark:bg-primary/20 rounded-xl px-3 py-2">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" /> فتح الملف المرفق
            </a>
          )}
          {request.reviewNote && (
            <div className={`rounded-xl p-3 ${
              request.status === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/20" :
              request.status === "RETURNED" ? "bg-amber-50 dark:bg-amber-900/20" :
              request.status === "DELEGATED" ? "bg-purple-50 dark:bg-purple-900/20" :
              "bg-red-50 dark:bg-red-900/20"}`}>
              <p className={`text-xs font-bold mb-1 flex items-center gap-1 ${
                request.status === "APPROVED" ? "text-emerald-700 dark:text-emerald-400" :
                request.status === "RETURNED" ? "text-amber-700 dark:text-amber-400" :
                request.status === "DELEGATED" ? "text-purple-700 dark:text-purple-400" :
                "text-red-700 dark:text-red-400"}`}>
                <MessageSquare className="w-3 h-3" />
                {request.status === "APPROVED" ? "ملاحظات الاعتماد" :
                 request.status === "RETURNED" ? "ملاحظات الإرجاع" :
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
  const router = useRouter();
  const [requests, setRequests] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [resubmitReq, setResubmitReq] = useState<Request | null>(null);
  const [reviewingReq, setReviewingReq] = useState<Request | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("ALL");
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => { router.refresh(); });
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;
    try { await deleteRequest(id); refresh(); } catch (e: any) { alert(e.message); }
  }

  const filtered = filterStatus === "ALL" ? requests : requests.filter(r => r.status === filterStatus);

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    RETURNED: requests.filter(r => r.status === "RETURNED").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
    DELEGATED: requests.filter(r => r.status === "DELEGATED").length,
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-primary dark:text-primary/60" />
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
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
          <Plus className="w-3.5 h-3.5" /> طلب جديد
        </button>
      </div>

      {/* فلاتر الحالة */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: "ALL", label: "الكل" },
          { key: "PENDING", label: "قيد المراجعة" },
          { key: "RETURNED", label: "مرجع" },
          { key: "APPROVED", label: "معتمد" },
          { key: "DELEGATED", label: "محوّل" },
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
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-primary/80 hover:underline font-bold">
              ارفع طلبك الأول
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <RequestCard key={r.id} request={r} isExec={isExec} sessionId={sessionId}
              allEmployees={allEmployees}
              onReview={setReviewingReq} onResubmit={setResubmitReq}
              onDelete={handleDelete} onRefresh={refresh} />
          ))}
        </div>
      )}

      {showForm && <RequestForm onClose={() => setShowForm(false)} onDone={refresh} />}
      {resubmitReq && (
        <RequestForm initial={resubmitReq} requestId={resubmitReq.id} isResubmit
          onClose={() => setResubmitReq(null)} onDone={refresh} />
      )}
      {reviewingReq && (
        <ReviewModal request={reviewingReq} allEmployees={allEmployees}
          onClose={() => setReviewingReq(null)} onDone={refresh} />
      )}
    </div>
  );
}
