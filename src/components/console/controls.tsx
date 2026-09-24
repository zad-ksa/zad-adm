"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONO, btn, cx } from "./ui";

/**
 * ترقيم الصفحات.
 *
 * كل شاشةٍ تعرض قائمةً طويلة كتبت ترقيمها بيدها — البريد والموظفون والاعتمادات
 * ثلاثُ نسخ من الفكرة نفسها بثلاثة مظاهر. وهذه واحدة: المدى ثم الزرّان.
 *
 * والاتجاه هنا دقيقٌ في RTL: «السابق» سهمٌ يشير يميناً، و«التالي» يساراً — عكس
 * ما تكتبه المكتبات الإنجليزية، ولهذا لا تُستورد كما هي.
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
  unit = "عنصراً",
}: {
  page: number;
  totalPages: number;
  /** العدد الكلي — يُعرض مدىً مفهوماً («٢١–٤٠ من ٨٧») بدل «صفحة ٢ من ٥». */
  total?: number;
  pageSize?: number;
  onChange: (page: number) => void;
  unit?: string;
}) {
  if (totalPages <= 1) return null;

  const from = total != null && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = total != null && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2">
      <p className="text-body text-slate-500 dark:text-slate-400">
        {from != null && to != null && total != null ? (
          <>
            <span className={MONO}>
              {from}–{to}
            </span>{" "}
            من <span className={MONO}>{total}</span> {unit}
          </>
        ) : (
          <>
            صفحة <span className={MONO}>{page}</span> من <span className={MONO}>{totalPages}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={btn.icon}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={btn.icon}
          aria-label="الصفحة التالية"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    </div>
  );
}
