"use client";

// مشاركةُ المحضر PDF بالبريد الداخلي: يُولَّد الملفُّ على الخادم بالكليشة،
// ويُرفع مرفقاً، ثم تُفتح نافذةُ رسالةٍ جديدةٍ والمرفقُ فيها — والمستلمون
// والنصُّ على المرسِل.

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { notify } from "@/components/console/toastBus";
import { uploadFile } from "@/lib/clientUpload";
import { getMailRecipients } from "@/app/actions/mail";
import ComposeModal from "../../mail/ComposeModal";
import type { Meeting } from "../MeetingsClient";

type Prepared = {
  subject: string;
  attachments: { fileUrl: string; fileName: string; fileSize: number }[];
  employees: Awaited<ReturnType<typeof getMailRecipients>>;
};

export default function ShareMeetingPdf({
  meeting,
  meetingNumber,
  sessionId,
  className = "",
  iconClassName = "w-3 h-3",
}: {
  meeting: Pick<Meeting, "id" | "title">;
  meetingNumber?: number;
  sessionId: string;
  className?: string;
  iconClassName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);

  const share = async () => {
    setBusy(true);
    try {
      const [res, employees] = await Promise.all([
        fetch("/api/meetings/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId: meeting.id, meetingNum: meetingNumber }),
        }),
        getMailRecipients(),
      ]);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "تعذّر إنشاء ملف PDF للمحضر");
      }
      const num = meetingNumber ? `ZAD_M_${String(meetingNumber).padStart(3, "0")} - ` : "";
      const safeTitle = meeting.title.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
      const file = new File([await res.blob()], `${num}${safeTitle || "محضر"}.pdf`, { type: "application/pdf" });
      const uploaded = await uploadFile(file, "mail_attachment");
      setPrepared({
        subject: `محضر اجتماع: ${meeting.title}`,
        attachments: [{ fileUrl: uploaded.url, fileName: file.name, fileSize: file.size }],
        employees,
      });
    } catch (e) {
      notify("error", e instanceof Error && e.message ? e.message : "تعذّرت مشاركة المحضر");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className={className}
        title={busy ? "جارٍ تجهيز PDF…" : "مشاركة PDF بالبريد"}
      >
        {busy ? <Loader2 className={`${iconClassName} animate-spin`} /> : <Send className={iconClassName} />}
      </button>
      {prepared && (
        <ComposeModal
          isOpen
          onClose={() => setPrepared(null)}
          employees={prepared.employees}
          currentUserId={sessionId}
          preset={{ subject: prepared.subject, attachments: prepared.attachments }}
          onSuccess={(result) => {
            setPrepared(null);
            notify("ok", result?.pending ? "أُرسلت الرسالة للاعتماد قبل وصولها." : "أُرسل المحضر بالبريد.");
          }}
        />
      )}
    </>
  );
}
