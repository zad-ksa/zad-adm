"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Scale } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  Rail,
  RailItem,
  SearchField,
  Segmented,
  StatStrip,
  Tabs,
} from "@/components/console/layout";
import { Badge, Highlight, MONO, btn, card, cx } from "@/components/console/ui";
import Accordion from "@/components/console/Accordion";
import {
  GUIDE_SIZE_COOKIE,
  filterPractices,
  filterProofs,
  guideTotals,
  shortIndicatorTitle,
  shortStandardTitle,
  type GuideSizeId,
  type GuideStandard,
} from "@/lib/governanceGuide";

type Mode = "PRACTICES" | "PROOFS";

/**
 * دليلُ الحوكمة كما تقرؤه الجمعية: معاييرُه ومؤشّراتُه وشواهدُه.
 *
 * **وهو وثيقةٌ تُقرأ لا شاشةُ عمل**: لا يُحفظ فيها شيءٌ ولا يُرسل، والنصُّ
 * منقولٌ من الأدلّة الاسترشادية للمركز الوطني كما هو. فالعملُ هنا تنقّلٌ
 * وبحثٌ وطيّ.
 *
 * **والمؤشّرُ يُطوى ولا يُفتح كلُّه**: دليلُ الجمعيات الكبيرة مئةٌ وستّةٌ
 * وسبعون سؤالاً في عشرين مؤشّراً، وصفحةٌ تعرضها كلَّها لا تُقرأ. فالعناوينُ
 * تُمسح بالعين، ويُفتح المطلوب.
 *
 * **والبحثُ يفتح ما وافق**: من بحث يريد ما وجده لا عنوانَ ما وجده — فتُفتح
 * المؤشّراتُ الموافقةُ ويُعلَّم فيها موضعُ الكلمة.
 */
export default function GovernanceGuide({
  charityName,
  size,
  sizeLabel,
  standards,
}: {
  charityName: string;
  size: GuideSizeId;
  sizeLabel: string;
  standards: GuideStandard[];
}) {
  const base = `/portal/${encodeURIComponent(charityName)}/governance`;
  const [activeIdx, setActiveIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("PRACTICES");
  /** ما قُلب عن حاله الافتراضي — والافتراضيُّ مفتوحٌ أثناء البحث ومطويٌّ بعده. */
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [here, setHere] = useState<string | null>(null);

  const standard = standards[activeIdx];
  const searching = query.trim() !== "";
  const totals = useMemo(() => guideTotals(standards), [standards]);

  // والحجمُ المختارُ يُحفظ في المتصفّح: من فتح الدليل غداً فتحه على حجمه،
  // ولا يُسأل في كلِّ مرّة. وملفُّ الجمعية عند زادٍ يسبقه إن كان مسجَّلاً.
  useEffect(() => {
    document.cookie = `${GUIDE_SIZE_COOKIE}_${encodeURIComponent(charityName)}=${size}; path=/; max-age=31536000; samesite=lax`;
  }, [charityName, size]);

  const practices = useMemo(
    () => filterPractices(standard?.practices ?? [], query),
    [standard, query]
  );
  const proofs = useMemo(
    () => filterProofs(standard?.detailedProofs ?? [], query),
    [standard, query]
  );

  const items = mode === "PRACTICES" ? practices : proofs.map((p, i) => ({ id: `proof-${i}`, title: p.title }));

  /** العنوانُ المرئيُّ الآن — يُعلَّم في فهرس الصفحة. */
  useEffect(() => {
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) seen.add(entry.target.id);
          else seen.delete(entry.target.id);
        }
        // والأعلى هو المقصود: عدّةٌ أقسامٍ مرئيّةٌ معاً، والقارئُ عند أوّلها.
        const first = items.find((item) => seen.has(item.id));
        if (first) setHere(first.id);
      },
      { rootMargin: "-96px 0px -60% 0px" }
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, mode, items.length, items.map((i) => i.id).join("|")]);

  const isOpen = (id: string) => (flipped.has(id) ? !searching : searching);

  const toggle = (id: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const goTo = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      // والفهرسُ يفتح ما قصده: نقرةٌ تنزل على عنوانٍ مطويٍّ تترك القارئ
      // أمام سطرٍ مغلق.
      if (!isOpen(id)) next.add(id);
      return next;
    });
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const switchStandard = (idx: number) => {
    setActiveIdx(idx);
    setFlipped(new Set());
    setHere(null);
    setMode(standards[idx]?.detailedProofs?.length ? mode : "PRACTICES");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const search = (value: string) => {
    setQuery(value);
    // وتُنسى النقراتُ عند كلِّ بحثٍ جديد: الافتراضيُّ تبدّل، فما قُلب عنه
    // لم يعد له معنى.
    setFlipped(new Set());
  };

  if (!standard) {
    return (
      <EmptyState
        icon={<Scale className="size-4" />}
        title="لا معايير مسجلة لهذا الحجم"
        description="اختر حجما آخر من صفحة الدليل."
      />
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        crumbs={[{ label: "دليل الحوكمة", href: base }, { label: `الجمعيات ${sizeLabel}` }]}
        icon={<Scale className="size-6" />}
        title="الممارسات والشواهد"
        description="ما يسأل عنه المقيم في كل مؤشر، والشاهد الذي يطلبه عليه."
        actions={
          <Link href={`${base}?change=1`} className={btn.secondary}>
            تغيير الحجم
          </Link>
        }
      />

      <StatStrip
        items={[
          { label: "المعايير", value: totals.standards },
          { label: "المؤشرات", value: totals.indicators },
          { label: "أسئلة التقييم", value: totals.questions },
          ...(totals.proofs > 0 ? [{ label: "شواهد تفصيلية", value: totals.proofs }] : []),
        ]}
      />

      <Tabs
        label="معايير الحوكمة"
        value={String(activeIdx)}
        onChange={(id) => switchStandard(Number(id))}
        tabs={standards.map((s, idx) => ({
          id: String(idx),
          label: shortStandardTitle(s.title),
          count: s.practices.length,
        }))}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={search}
          label="بحث في الدليل"
          placeholder="ابحث في المؤشرات والأسئلة والشواهد…"
          className="min-w-56 flex-1"
        />
        {standard.detailedProofs && standard.detailedProofs.length > 0 && (
          <Segmented
            label="طريقة العرض"
            value={mode}
            onChange={setMode}
            options={[
              { id: "PRACTICES", label: "الممارسات" },
              { id: "PROOFS", label: "الشواهد التفصيلية" },
            ]}
          />
        )}
      </div>

      <section className={`${card.static} p-5`}>
        <p className="text-caption font-semibold tracking-wide text-primary dark:text-teal-300">
          المعيار {activeIdx + 1} من {standards.length}
        </p>
        <h2 className="mt-1 text-section font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {shortStandardTitle(standard.title)}
        </h2>
        <p className="mt-1.5 max-w-3xl text-body leading-6 text-slate-500 dark:text-slate-400">
          {standard.description}
        </p>
      </section>

      {searching && (
        <p className="text-meta text-slate-500 dark:text-slate-400">
          {mode === "PRACTICES"
            ? `${practices.length} من ${standard.practices.length} مؤشرا`
            : `${proofs.length} من ${standard.detailedProofs?.length ?? 0} شاهدا`}
          {" يطابق البحث."}
        </p>
      )}

      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          {items.length === 0 ? (
            <EmptyState
              icon={<Scale className="size-4" />}
              title="لا نتائج مطابقة"
              description="جرب كلمة أقصر، أو ابحث في معيار آخر."
            />
          ) : mode === "PRACTICES" ? (
            practices.map((practice, idx) => (
              <Accordion
                key={practice.id}
                id={practice.id}
                open={isOpen(practice.id)}
                onToggle={() => toggle(practice.id)}
                meta={`${practice.questions.length} سؤالا`}
                title={
                  <span className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className={cx(
                        MONO,
                        "mt-px flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-caption font-semibold text-primary dark:bg-teal-400/10 dark:text-teal-300"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="min-w-0 text-title font-semibold leading-6 text-slate-900 dark:text-slate-100">
                      <Highlight text={shortIndicatorTitle(practice.title)} query={query} />
                    </span>
                  </span>
                }
              >
                {practice.description && (
                  <p className="mb-3 text-body leading-6 text-slate-500 dark:text-slate-400">
                    <Highlight text={practice.description} query={query} />
                  </p>
                )}
                <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {practice.questions.map((q, qIdx) => (
                    <li key={qIdx} className="p-3">
                      <p className="text-body leading-6 text-slate-800 dark:text-slate-200">
                        <span className={cx(MONO, "me-1.5 font-semibold text-slate-400")}>
                          {qIdx + 1}.
                        </span>
                        <Highlight text={q.question} query={query} />
                      </p>
                      {/* والشاهدُ تحت سؤاله لا خلف نقرة: هو جوابُ «بم أثبت؟»،
                          وسؤالٌ بلا جوابه نصفُ خبر. */}
                      <p className="mt-1.5 flex items-start gap-2 text-meta leading-5 text-slate-500 dark:text-slate-400">
                        <FileText aria-hidden className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                        <span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            الشاهد:
                          </span>{" "}
                          <Highlight text={q.proof} query={query} />
                        </span>
                      </p>
                    </li>
                  ))}
                </ol>
              </Accordion>
            ))
          ) : (
            proofs.map((proof, idx) => (
              <Accordion
                key={idx}
                id={`proof-${idx}`}
                open={isOpen(`proof-${idx}`)}
                onToggle={() => toggle(`proof-${idx}`)}
                meta={`${proof.requirements.length} متطلبا`}
                title={
                  <span className="text-title font-semibold text-slate-900 dark:text-slate-100">
                    <Highlight text={proof.title} query={query} />
                  </span>
                }
              >
                <ul className="space-y-2">
                  {proof.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-body leading-6 text-slate-600 dark:text-slate-300"
                    >
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary dark:bg-teal-400" />
                      <span>
                        <Highlight text={req} query={query} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Accordion>
            ))
          )}

          {/* وذيلُ الصفحة ينقل إلى المعيار الذي يليه: من بلغ آخرها فقد فرغ
              من معياره، والعودةُ إلى التبويب في أعلاها رحلةٌ لا داعيَ لها. */}
          {standards.length > 1 && (
            <nav
              aria-label="المعيار السابق والتالي"
              className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800"
            >
              {activeIdx > 0 ? (
                <button type="button" onClick={() => switchStandard(activeIdx - 1)} className={btn.ghost}>
                  → {shortStandardTitle(standards[activeIdx - 1].title)}
                </button>
              ) : (
                <span />
              )}
              {activeIdx < standards.length - 1 ? (
                <button type="button" onClick={() => switchStandard(activeIdx + 1)} className={btn.ghost}>
                  {shortStandardTitle(standards[activeIdx + 1].title)} ←
                </button>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>

        {/* فهرسُ الصفحة — عمودٌ يبقى تحت العين، والمقروءُ منه مُعلَّم. */}
        {items.length > 1 && (
          <div className="sticky top-4 hidden max-h-[calc(100vh-2rem)] shrink-0 self-start overflow-y-auto lg:block">
            <p className="px-3 pb-1.5 text-caption font-semibold text-slate-400">في هذه الصفحة</p>
            <Rail label="فهرس الدليل">
              {items.map((item) => (
                <RailItem
                  key={item.id}
                  label={shortIndicatorTitle(item.title)}
                  active={here === item.id}
                  onClick={() => goTo(item.id)}
                />
              ))}
            </Rail>
          </div>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-2 text-meta text-slate-400">
        <Badge tone="neutral">المصدر</Badge>
        الأدلة الاسترشادية للتقييم الذاتي، المركز الوطني لتنمية القطاع غير الربحي.
      </p>
    </div>
  );
}
