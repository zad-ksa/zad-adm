"use client";

import { Check } from "lucide-react";
import { cx } from "./ui";

export type ChoiceMatrixHeading = { id: string; text: string };

/**
 * جدولُ اختيار: صفٌّ لكل بند، وعمودٌ لكل خيار، وعلامةُ صحٍّ واحدةٌ في كل صف.
 * نوعٌ قائمٌ بنفسه إلى جانب «مصفوفة التقييم» (`MatrixField`) لا بديلٌ عنها.
 *
 * وهو أزرارُ راديو حقيقيةٌ باسمٍ لكل صف: «واحدٌ فقط في الصف» يضمنها المتصفح،
 * وتعمل الأسهمُ وقارئُ الشاشة بلا كود. والنقرُ على المختار يُلغيه، وإلّا فمن
 * أخطأ في سؤالٍ غير إجباريٍّ لا سبيل له إلى ترك الصف فارغاً.
 *
 * والعمودُ الأوّلُ لاصقٌ كما في `MatrixField`: من مرّر إلى آخر خيارٍ على
 * الهاتف لا يرى اسمَ البند الذي يجيب عنه.
 */
export function ChoiceMatrixField({
  rows,
  columns,
  value,
  onChange,
  rowKey,
  label,
  hint,
}: {
  rows: ChoiceMatrixHeading[];
  columns: ChoiceMatrixHeading[];
  value: Record<string, string | undefined>;
  onChange: (key: string, columnId: string | null) => void;
  /** مفتاحُ الصف — من `lib/surveyQuestions.ts` كي يتطابق مع ما يُحفظ. */
  rowKey: (rowId: string) => string;
  /** اسمُ الجدول لقارئ الشاشة. */
  label: string;
  hint?: string;
}) {
  return (
    <div>
      {hint && <p className="mb-2 text-meta text-slate-500 dark:text-slate-400">{hint}</p>}

      {/*
        **الهاتف: بطاقةٌ لكلِّ بند، وخياراتُه أزراراً تُقرأ بأسمائها.**
        فعلامةُ الصحِّ في جدولٍ يُمرَّر تلزمها رأسُ عمودٍ يُرى — ورأسُ العمود أوّلُ
        ما يغيب عند التمرير على الهاتف. فيُكتب اسمُ الخيار في زرِّه، ولا يُحتاج
        إلى رأس.
      */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => {
          const key = rowKey(row.id);
          return (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="mb-2 text-body font-medium leading-snug text-slate-700 dark:text-slate-200">{row.text}</p>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((column) => {
                  const checked = value[key] === column.id;
                  return (
                    <label
                      key={column.id}
                      className={cx(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-meta transition-colors",
                        checked
                          ? "border-primary bg-primary/10 font-semibold text-primary dark:border-teal-500 dark:bg-teal-500/10 dark:text-teal-300"
                          : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                      )}
                    >
                      <input
                        type="radio"
                        name={`${key}-mobile`}
                        value={column.id}
                        checked={checked}
                        onChange={() => onChange(key, column.id)}
                        onClick={() => {
                          if (checked) onChange(key, null);
                        }}
                        aria-label={`${row.text} — ${column.text}`}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className={cx(
                          "grid size-4 place-items-center rounded border transition-colors",
                          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
                          checked ? "border-primary bg-primary text-white" : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {checked && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      {column.text}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block dark:border-slate-700">
        <table className="w-full border-collapse" aria-label={label}>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              <th
                scope="col"
                className="sticky start-0 z-10 min-w-[140px] border-e border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
              />
              {columns.map((column) => (
                <th
                  scope="col"
                  key={column.id}
                  className="min-w-[92px] border-e border-slate-200 px-2 py-2.5 text-center text-meta font-medium leading-snug text-slate-600 last:border-e-0 dark:border-slate-700 dark:text-slate-300"
                >
                  {column.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const key = rowKey(row.id);
              return (
                <tr key={row.id} className={cx("border-t border-slate-200 dark:border-slate-700", rowIndex % 2 === 1 && "bg-slate-50/50 dark:bg-slate-800/20")}>
                  <th
                    scope="row"
                    className={cx(
                      "sticky start-0 z-10 min-w-[140px] border-e border-slate-200 px-3 py-2 text-start text-body font-medium leading-snug text-slate-700 dark:border-slate-700 dark:text-slate-200",
                      rowIndex % 2 ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-900"
                    )}
                  >
                    {row.text}
                  </th>
                  {columns.map((column) => {
                    const checked = value[key] === column.id;
                    return (
                      <td key={column.id} className="border-e border-slate-200 p-0 text-center last:border-e-0 dark:border-slate-700">
                        <label className="relative flex h-11 cursor-pointer items-center justify-center transition-colors hover:bg-primary/5">
                          <input
                            type="radio"
                            name={key}
                            value={column.id}
                            checked={checked}
                            onChange={() => onChange(key, column.id)}
                            onClick={() => {
                              if (checked) onChange(key, null);
                            }}
                            aria-label={`${row.text} — ${column.text}`}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden
                            className={cx(
                              "grid size-6 place-items-center rounded-md border transition-colors",
                              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
                              checked
                                ? "border-primary bg-primary text-white"
                                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                            )}
                          >
                            {checked && <Check className="size-4" strokeWidth={3} />}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
