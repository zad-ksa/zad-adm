"use client";

import { useState } from "react";
import Select from "@/components/console/Select";
import { X, Copy, CheckCircle2 } from "lucide-react";

function buildMessage(charityName: string, scheduleTitle: string, link: string): string {
  return `السادة / جمعية ${charityName} المحترمين

السلام عليكم ورحمة الله وبركاته،

نأمل من سعادتكم التكرم باختيار الموعد المناسب لكم لعقد اجتماع "${scheduleTitle}" من خلال الرابط التالي، حيث يمكنكم استعراض الأوقات المتاحة وحجز ما يناسبكم منها مباشرة:

${link}

وتفضلوا بقبول فائق الاحترام والتقدير،،،

شركة زاد التنموية`;
}

export default function CopyMessageModal({
  schedule,
  charities,
  onClose,
}: {
  schedule: { slug: string; title: string };
  charities: { id: string; name: string }[];
  onClose: () => void;
}) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/book-meeting/${schedule.slug}` : "";

  const [charityId, setCharityId] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSelectCharity = (id: string) => {
    setCharityId(id);
    const name = charities.find((c) => c.id === id)?.name || "";
    setMessage(name ? buildMessage(name, schedule.title, link) : "");
  };

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">نسخ نص رسالة رسمية</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">الجمعية</label>
            <Select
              variant="soft"
              value={charityId}
              onSelect={handleSelectCharity}
              placeholder="اختر الجمعية…"
              options={charities.map((c) => ({ value: c.id, label: c.name }))}
              className="w-full [&>button]:w-full [&>button]:justify-between"
            />
          </div>

          {message && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">نص الرسالة (قابل للتعديل)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={9}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm leading-relaxed resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!message}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-sm active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {copied ? (
              <><CheckCircle2 className="w-4 h-4" /> تم النسخ</>
            ) : (
              <><Copy className="w-4 h-4" /> نسخ النص</>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
