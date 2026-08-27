"use client";

import { uploadFiles } from "@/lib/clientUpload";
import { ACCEPT_ATTRIBUTE, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import { useState, useTransition } from "react";
import { X, Send, Link2, FileText, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { createRequest, resubmitRequest } from "@/app/actions/approvals";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; icon: string }> = {
  URGENT: { label: "عاجل",    color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/20",      border: "border-red-400 dark:border-red-600",    icon: "🚨" },
  HIGH:   { label: "عالية",   color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20",border: "border-orange-400 dark:border-orange-600", icon: "🔴" },
  MEDIUM: { label: "متوسطة",  color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-400 dark:border-amber-600",  icon: "🟡" },
  LOW:    { label: "منخفضة",  color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-50 dark:bg-slate-800",     border: "border-slate-300 dark:border-slate-600",  icon: "🟢" },
};

// Resolved once from the shared table, so the label the user reads and the
// check the code runs can never disagree the way the old "50MB" text and the
// server's 25MB limit did.
const MAX_BYTES = maxBytesFor("approval_attachment");
const MAX_LABEL = maxLabelFor("approval_attachment");

export default function RequestForm({
  initial, onClose, onDone, isResubmit, requestId,
}: {
  initial?: any; onClose: () => void; onDone: () => void;
  isResubmit?: boolean; requestId?: string;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [body, setBody] = useState(initial?.body || "");
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl || "");
  const [attachments, setAttachments] = useState<any[]>(Array.isArray(initial?.attachments) ? initial.attachments : (initial?.attachments ? JSON.parse(initial.attachments) : []));
  const [priority, setPriority] = useState<Priority>(initial?.priority || "MEDIUM");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Oversized files are no longer filtered out with the rest uploaded anyway:
    // that dropped attachments behind a single alert() that was easy to miss,
    // and the request went out incomplete. Nothing uploads unless every file
    // is acceptable.
    const tooBig = files.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) {
      setError(`تجاوز الحد (${MAX_LABEL}): ${tooBig.map((f) => f.name).join("، ")}`);
      return;
    }
    if (!files.length) return;

    setIsUploading(true);
    setError("");

    try {
      // Straight to Cloudinary. This used to POST to /api/upload, so the bytes
      // crossed a serverless function whose request body the platform caps at a
      // few megabytes — the 50MB this form promised was fiction, even a 6MB file
      // failed, and the real reason never reached the user.
      const uploaded = await uploadFiles(files, "approval_attachment", (p) =>
        setUploadStatus(
          p.total > 1
            ? `جارٍ رفع ${p.index} من ${p.total}: ${p.fileName}${p.percent !== null ? ` — ${p.percent}%` : ""}`
            : `جارٍ الرفع${p.percent !== null ? ` — ${p.percent}%` : ""}`
        )
      );
      setAttachments([
        ...attachments,
        ...uploaded.map((u) => ({ name: u.name, url: u.url, publicId: u.publicId, size: u.size })),
      ]);
    } catch (err) {
      // The precise reason from Cloudinary, not a generic "upload failed".
      setError(err instanceof Error ? err.message : "فشل رفع الملف");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!title.trim()) { setError("العنوان مطلوب"); return; }
    setError("");
    startTransition(async () => {
      try {
        if (isResubmit && requestId) {
          await resubmitRequest({ requestId, title, category, body, fileUrl, attachments, priority });
        } else {
          await createRequest({ title, category, body, fileUrl, attachments, priority });
        }
        onDone(); onClose();
      } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
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
              <Link2 className="w-3 h-3" /> المرفقات (بحد أقصى {MAX_LABEL} للملف)
            </label>
            <div className="space-y-2">
              <input type="file" multiple accept={ACCEPT_ATTRIBUTE} onChange={handleFileUpload} disabled={isUploading || isPending}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors cursor-pointer" />
              {isUploading && (
                <p className="text-xs text-primary animate-pulse">{uploadStatus || "جاري الرفع..."}</p>
              )}
              
              {attachments.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-medium truncate" title={att.name}>{att.name}</span>
                        {att.size && <span className="text-[10px] text-slate-400 shrink-0">({(att.size / 1024 / 1024).toFixed(2)} MB)</span>}
                      </div>
                      <button type="button" onClick={() => removeAttachment(i)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">إلغاء</button>
          <button onClick={handleSubmit} disabled={isPending || isUploading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
        </div>
      </div>
    </div>
  );
}
