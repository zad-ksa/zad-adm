import { Download, Eye } from "lucide-react";

/**
 * زرّا ملفٍّ مرفوع: «عرض» يفتحه في تبويبٍ جديد، و«تنزيل» يحفظه مباشرةً
 * عبر `/api/files/download` — لا يُعرض قبله.
 */
export function downloadHref(url: string, name?: string) {
  const params = new URLSearchParams({ url });
  if (name) params.set("name", name);
  return `/api/files/download?${params.toString()}`;
}

export default function FileOpenDownload({
  url,
  label,
  name,
}: {
  url: string;
  /** يُكتب قبل الزرّين، كـ«المرفق 2». */
  label?: string;
  /** اسمُ الملف المحفوظ — بلا امتداد يُؤخذ امتدادُ الرابط. */
  name?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-2 text-caption font-semibold transition-colors";
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-lg border border-primary/25 bg-primary/10 text-primary dark:bg-primary/20 dark:text-teal-300">
      {label && (
        <span className="inline-flex items-center border-e border-primary/20 px-3 text-caption font-semibold">
          {label}
        </span>
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className={`${base} hover:bg-primary hover:text-white`}>
        <Eye className="size-4" />
        عرض
      </a>
      <a
        href={downloadHref(url, name)}
        download
        className={`${base} border-s border-primary/20 hover:bg-primary hover:text-white`}
      >
        <Download className="size-4" />
        تنزيل
      </a>
    </span>
  );
}
