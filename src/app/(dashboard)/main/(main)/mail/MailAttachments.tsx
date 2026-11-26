import { Download, Paperclip } from "lucide-react";
import { cx, MONO } from "@/components/console/ui";

export type MailAttachmentItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
};

/**
 * مرفقاتُ رسالةٍ كما تُقرأ — بطاقةُ تنزيلٍ واحدةٌ في كل موضع.
 *
 * وكانت مكتوبةً بيدها في صفحة الرسالة وفي البوّابة، فاختلف المقاسُ واللونُ
 * والمقاسُ المكتوب تحت الاسم. وموضعُ قراءةٍ ثالث («بانتظار التعميد») كان
 * سيُكتب بيده كذلك — فجُمعت في عنصرٍ واحد.
 */
export function MailAttachments({
  attachments,
  className,
}: {
  attachments: MailAttachmentItem[];
  className?: string;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="mb-3 flex items-center gap-2 text-meta font-medium text-slate-600 dark:text-slate-300">
        <Paperclip className="size-3.5" />
        المرفقات ({attachments.length})
      </h3>
      <div className="flex flex-wrap gap-3">
        {attachments.map((att) => (
          <a
            key={att.id}
            href={att.fileUrl}
            target="_blank"
            rel="noreferrer"
            className={cx(
              "group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors",
              "hover:border-primary/30 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500 transition-colors group-hover:text-primary dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-teal-300">
              <Download className="size-4" />
            </span>
            <span className="block">
              <span className="block max-w-[200px] truncate text-body font-medium text-slate-900 dark:text-slate-100">
                {att.fileName}
              </span>
              {att.fileSize ? (
                <span className={cx(MONO, "mt-0.5 block text-caption text-slate-500 dark:text-slate-400")}>
                  {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                </span>
              ) : null}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
