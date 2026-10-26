"use client";

import { useMemo, useState } from "react";
import { BookMarked } from "lucide-react";
import { Sheet } from "@/components/console/overlays";
import { SearchField } from "@/components/console/layout";
import { btn } from "@/components/console/ui";
import { GLOSSARY } from "@/lib/strategyGlossary";

/**
 * قاموس المصطلحات — لوحةٌ جانبية من زرٍّ في الدليل، لا صفحةٌ منفصلة.
 *
 * المصطلحات مرجعٌ يُسأل عنه أثناء قراءة الدليل («ما القطبية؟ ما التراكمية؟»)،
 * فمكانه إلى جانبه لا في مسارٍ آخر يُنسى. وهو نفس ما فعلناه في غيره: الشرح عند
 * موضع الحاجة إليه.
 */
export default function GlossarySheet() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btn.secondary}>
        <BookMarked className="size-4" />
        المصطلحات
      </button>
    );
  }

  return <GlossaryPanel onClose={() => setOpen(false)} />;
}

function GlossaryPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");

  const terms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY;
    return GLOSSARY.filter((t) =>
      [t.term, t.definition, t.purpose, t.usage, t.example, t.note].some((v) => v.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <Sheet
      title="قاموس المصطلحات"
      subtitle={`${GLOSSARY.length} مصطلحاً من دليل الأهداف والمؤشرات المعتمد`}
      leading={
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-teal-400/10 dark:text-teal-300"
        >
          <BookMarked className="size-5" />
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <span className="text-meta text-slate-500 dark:text-slate-400">
            {terms.length === GLOSSARY.length ? `${GLOSSARY.length} مصطلحاً` : `${terms.length} من ${GLOSSARY.length}`}
          </span>
          <button type="button" onClick={onClose} className={btn.secondary}>
            إغلاق
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="ابحث في المصطلحات…"
          label="بحث في المصطلحات"
        />

        {terms.length === 0 ? (
          <p className="py-8 text-center text-body text-slate-500 dark:text-slate-400">لا مصطلح بهذا البحث.</p>
        ) : (
          <dl className="space-y-3">
            {terms.map((t) => (
              <div
                key={t.term}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <dt className="text-title font-semibold text-slate-900 dark:text-slate-100">{t.term}</dt>
                <dd className="mt-2 space-y-2 text-body leading-6 text-slate-600 dark:text-slate-300">
                  <p>{t.definition}</p>
                  {t.purpose && <Field label="الغرض">{t.purpose}</Field>}
                  {t.usage && <Field label="الاستخدام">{t.usage}</Field>}
                  {t.example && <Field label="مثال">{t.example}</Field>}
                  {t.note && <Field label="ملاحظة">{t.note}</Field>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-meta leading-6">
      <span className="font-semibold text-slate-500 dark:text-slate-400">{label}: </span>
      <span className="text-slate-600 dark:text-slate-300">{children}</span>
    </p>
  );
}
