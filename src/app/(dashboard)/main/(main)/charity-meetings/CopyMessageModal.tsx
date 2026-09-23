"use client";

import { useState } from "react";
import Select from "@/components/console/Select";
import { Copy, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

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
    <Dialog
size="lg"
title="نسخ نص رسالة رسمية"
onClose={onClose}
footer={
<>
<button
            type="button"
            onClick={onClose}
            className={btn.secondary}
          >
            إغلاق
          </button>
<button
            type="button"
            onClick={handleCopy}
            disabled={!message}
            className={btn.primary}
          >
            {copied ? (
              <><CheckCircle2 className="w-4 h-4" /> تم النسخ</>
            ) : (
              <><Copy className="w-4 h-4" /> نسخ النص</>
            )}
          </button>
</>
}
>
<div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300">الجمعية</label>
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
              <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300">نص الرسالة (قابل للتعديل)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={9}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-caption leading-relaxed resize-none"
              />
            </div>
          )}
        </div>
</Dialog>
  );
}
