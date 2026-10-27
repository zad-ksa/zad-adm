"use client";

import { useState, useTransition } from "react";
import { FileText, Link2, Paperclip, Trash2, Upload } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { FooterStatus } from "@/components/console/overlays";
import { Spinner, btn, cx, field } from "@/components/console/ui";
import { uploadFiles, type UploadProgress } from "@/lib/clientUpload";
import { maxLabelFor } from "@/lib/uploadPurposes";
import { setInitiativeMarketing } from "@/app/actions/strategyOperational";

export type MarketingValue = {
  kind: string | null;
  url: string | null;
  fileName: string | null;
};

/**
 * الملف التسويقي للمبادرة: رابطٌ خارجي أو ملفٌ مرفوع.
 *
 * والحالتان تنتهيان إلى رابطٍ يُفتح، فالفرق في أصله لا في استعماله. ولذلك
 * الزرّ في الصفحة يفتح الرابط إن كان محفوظاً، ويفتح هذه النافذة إن لم يكن —
 * فأوّل نقرةٍ تُعبّئ، وما بعدها يفتح.
 *
 * ويُرفع الملف من المتصفح إلى Cloudinary مباشرةً بتذكرةٍ موقَّعة، كما يفعل كل
 * رفعٍ في الموقع — فلا تمرّ البايتات بدالّةٍ على الخادم لها سقفٌ لحجم الطلب.
 */
export function MarketingFileDialog({
  initiativeId,
  current,
  onClose,
  onSaved,
}: {
  initiativeId: string;
  current: MarketingValue;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const hasFile = current.kind === "FILE" && !!current.url;
  const [mode, setMode] = useState<"LINK" | "FILE">(hasFile ? "FILE" : "LINK");
  const [url, setUrl] = useState(current.kind === "LINK" ? (current.url ?? "") : "");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const working = busy || uploading;

  const save = () => {
    setError(null);

    if (mode === "LINK") {
      if (!url.trim()) return setError("اكتب الرابط أو اختر ملفاً");
      start(async () => {
        const res = await setInitiativeMarketing(initiativeId, { kind: "LINK", url });
        if (res.error) return setError(res.error);
        onSaved?.();
        onClose();
      });
      return;
    }

    // ملفٌ جديد اختاره المستخدم: يُرفع ثم يُحفظ عنوانه.
    if (file) {
      setUploading(true);
      (async () => {
        try {
          const [uploaded] = await uploadFiles([file], "initiative_marketing", setProgress);
          const res = await setInitiativeMarketing(initiativeId, {
            kind: "FILE",
            url: uploaded.url,
            publicId: uploaded.publicId,
            resourceType: uploaded.resourceType,
            fileName: uploaded.name,
          });
          if (res.error) {
            setError(res.error);
            return;
          }
          onSaved?.();
          onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : "تعذّر رفع الملف");
        } finally {
          setUploading(false);
          setProgress(null);
        }
      })();
      return;
    }

    if (hasFile) return onClose(); // ملفٌ قائمٌ ولم يُختَر بديل: لا تغيير.
    setError("اختر ملفاً للرفع");
  };

  const remove = () =>
    start(async () => {
      setError(null);
      const res = await setInitiativeMarketing(initiativeId, { kind: "NONE" });
      if (res.error) return setError(res.error);
      onSaved?.();
      onClose();
    });

  return (
    <Dialog
      title="الملف التسويقي للمبادرة"
      description="رابطٌ خارجي، أو ملفٌ يُرفع ويُفتح من زرّ المبادرة."
      icon={<FileText className="size-5" />}
      size="md"
      onClose={onClose}
      busy={working}
      closeOnBackdrop={false}
      onSubmit={save}
      footer={
        <>
          <FooterStatus error={error}>
            {progress ? `جارٍ الرفع… ${progress.percent ?? 0}%` : <span />}
          </FooterStatus>
          <div className="flex items-center gap-2">
            {(current.kind === "LINK" || hasFile) && (
              <button type="button" onClick={remove} disabled={working} className={btn.iconDanger} aria-label="إزالة الملف التسويقي" title="إزالة">
                <Trash2 className="size-4" />
              </button>
            )}
            <button type="button" onClick={onClose} disabled={working} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={working} className={btn.primary}>
              {working && <Spinner size={16} tone="onPrimary" />}
              حفظ
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <ModeTab active={mode === "LINK"} onClick={() => setMode("LINK")} icon={<Link2 className="size-4" />}>
            رابط
          </ModeTab>
          <ModeTab active={mode === "FILE"} onClick={() => setMode("FILE")} icon={<Paperclip className="size-4" />}>
            ملف مرفوع
          </ModeTab>
        </div>

        {mode === "LINK" ? (
          <label className="block">
            <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
              رابط الملف التسويقي
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              dir="ltr"
              placeholder="https://drive.google.com/…"
              className={cx(field, "text-start")}
            />
            <span className="mt-1 block text-caption text-slate-400 dark:text-slate-500">
              يُقبل http و https وحدهما.
            </span>
          </label>
        ) : (
          <div className="space-y-2">
            {hasFile && !file && (
              <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-body text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <Paperclip className="size-4 shrink-0" />
                <span className="truncate">{current.fileName || "ملفٌ مرفوع"}</span>
                <span className="mr-auto shrink-0 text-caption text-slate-400">اختر ملفاً لاستبداله</span>
              </p>
            )}

            <label
              className={cx(
                "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-body font-medium transition-colors",
                "border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary",
                "dark:border-slate-700 dark:text-slate-400 dark:hover:text-teal-300"
              )}
            >
              <Upload className="size-4" />
              {file ? file.name : "اختر الملف…"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
              />
            </label>

            <p className="text-caption text-slate-400 dark:text-slate-500">
              الحدّ الأقصى {maxLabelFor("initiative_marketing")}. والاستبدال يحذف الملف السابق.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border text-body font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary/30 bg-primary/[0.08] text-primary dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
