"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Inbox, Link2, RefreshCw, Trash2 } from "lucide-react";
import { EmptyState, PageHeader, StatStrip, TableShell, Th, rowClass, tbodyClass, tdClass, theadRowClass } from "@/components/console/layout";
import { Badge, MONO, btn, card, cx } from "@/components/console/ui";
import { CopyButton } from "@/components/console/Copy";
import { Sheet } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { COMMITMENT_GROUPS, READINESS_STATEMENTS, RATING_LABELS, ratingAverage } from "@/lib/planSurvey";
import { deletePlanSurveyResponse, rotatePlanSurveyToken, setPlanSurveyOpen } from "@/app/actions/planSurvey";

export type ResponseView = {
  id: string;
  department: string;
  role: string;
  submittedAt: string;
  initiatives: string[];
  extraInitiatives: string[];
  commitment: { average: number | null; answered: number; total: number };
  readiness: { average: number | null; answered: number; total: number };
  ratings: Record<string, number>;
  tasks: {
    stepId: string | null;
    initiativeName: string;
    taskTitle: string;
    plannedEnd: string | null;
    status: string;
    progress: number | null;
    expectedEnd: string | null;
  }[];
  pace: string;
  causes: string[];
  causeOther: string | null;
  topCauses: string[];
  blockers: { subject: string; description: string; cause: string; solution: string; proposedEnd: string | null }[];
  outlook: string;
  achievements: string | null;
  neededAction: string | null;
  suggestions: string | null;
};

/** متوسطٌ من خمسٍ بنجمةٍ واحدةٍ مكتوبة — الجدولُ لا يتّسع لخمس. */
const avg = (v: number | null) => (v === null ? "—" : v.toFixed(2));

export default function PlanSurveyAdminClient({
  charityName,
  surveyUrl,
  isOpen,
  responses,
}: {
  charityName: string;
  /** الرابطُ كاملاً — مبنيٌّ في الخادم من ترويسة الطلب. */
  surveyUrl: string;
  isOpen: boolean;
  responses: ResponseView[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<ResponseView | null>(null);


  const summary = useMemo(() => {
    const all = responses.flatMap((r) => Object.entries(r.ratings).map(([k, v]) => [k, v] as const));
    const merged: Record<string, number[]> = {};
    for (const [k, v] of all) (merged[k] ??= []).push(v);
    const mean = (ids: readonly number[]) => {
      const values = ids.flatMap((id) => merged[String(id)] ?? []);
      return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null;
    };
    const commitmentIds = COMMITMENT_GROUPS.flatMap((g) => g.statements.map((s) => s.id));
    return {
      commitment: mean(commitmentIds),
      readiness: mean(READINESS_STATEMENTS.map((s) => s.id)),
      departments: new Set(responses.map((r) => r.department)).size,
      blockers: responses.reduce((n, r) => n + r.blockers.length, 0),
    };
  }, [responses]);

  const act = (run: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setBusy(true);
    void (async () => {
      const res = await run();
      setBusy(false);
      if (!res.ok) {
        notify("error", res.error ?? "تعذّر التنفيذ");
        return;
      }
      notify("ok", okText);
      startTransition(() => router.refresh());
    })();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[
          { label: "الجمعيات", href: "/main/charities" },
          { label: charityName, href: `/main/strategy/${encodeURIComponent(charityName)}` },
          { label: "الخطة التشغيلية", href: `/main/strategy/${encodeURIComponent(charityName)}/operational` },
          { label: "الاستبانة" },
        ]}
        icon={<ClipboardList className="size-6" />}
        title="استبانة تنفيذ الخطة"
        description="رابطٌ واحدٌ خاصٌّ بهذه الجمعية، يُرسل لمنفّذي الخطة ويُجيب عليه كلُّ من كُلِّف بمهمة."
        actions={
          <>
            <Badge tone={isOpen ? "good" : "neutral"}>{isOpen ? "مفتوحة" : "مغلقة"}</Badge>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => setPlanSurveyOpen(charityName, !isOpen), isOpen ? "أُغلق الرابط." : "فُتح الرابط.")}
              className={btn.secondary}
            >
              {isOpen ? "إغلاق الاستقبال" : "فتح الاستقبال"}
            </button>
          </>
        }
      />

      <section className={cx(card.static, "space-y-3 p-4")}>
        <div className="flex items-center gap-2">
          <Link2 aria-hidden className="size-4 shrink-0 text-slate-400" />
          <code dir="ltr" className={cx(MONO, "min-w-0 flex-1 truncate text-body text-slate-700 dark:text-slate-200")}>
            {surveyUrl}
          </code>
          <CopyButton value={surveyUrl} label="نسخ الرابط" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-meta leading-5 text-slate-500">
            الرابطُ يفتح الاستبانة باسم هذه الجمعية، ويقرأ إداراتها ومبادراتها وخطواتها من خطتها التشغيلية.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (
                !(await confirmAction({
                  title: "تجديد الرابط؟",
                  message: "يتوقّف الرابطُ القديم عن العمل فوراً، والإجاباتُ المجموعةُ تبقى كما هي.",
                  confirmLabel: "تجديد",
                  tone: "danger",
                }))
              ) {
                return;
              }
              act(() => rotatePlanSurveyToken(charityName), "جُدّد الرابط.");
            }}
            className={btn.ghost}
          >
            <RefreshCw className="size-3.5" /> تجديد الرابط
          </button>
        </div>
      </section>

      <StatStrip
        items={[
          { label: "الإجابات", value: responses.length },
          { label: "إدارات مُجيبة", value: summary.departments },
          { label: "متوسط الالتزام", value: avg(summary.commitment), unit: "من ٥" },
          { label: "متوسط الجاهزية", value: avg(summary.readiness), unit: "من ٥" },
          { label: "متعثرات مُسجَّلة", value: summary.blockers, dot: summary.blockers > 0 ? "warn" : "muted" },
        ]}
      />

      {responses.length === 0 ? (
        <div className={card.static}>
          <EmptyState
            icon={<Inbox className="size-4" />}
            title="لا إجاباتٍ بعد"
            description="انسخ الرابط وأرسِله لمديري المبادرات ومسؤولي التنفيذ."
          />
        </div>
      ) : (
        <TableShell footer={`${responses.length} إجابة`}>
          <thead>
            <tr className={theadRowClass}>
              <Th>الإدارة</Th>
              <Th>الدور</Th>
              <Th>المبادرات</Th>
              <Th className="w-[90px]">المهام</Th>
              <Th className="w-[100px]">الالتزام</Th>
              <Th className="w-[100px]">الجاهزية</Th>
              <Th>سير التنفيذ</Th>
              <Th className="w-[110px]">التاريخ</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {responses.map((r) => (
              <tr key={r.id} className={rowClass} onClick={() => setReading(r)}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{r.department}</td>
                <td className={cx(tdClass, "text-slate-600 dark:text-slate-300")}>{r.role}</td>
                <td className={cx(tdClass, "max-w-[260px] text-slate-600 dark:text-slate-300")}>
                  <span className="line-clamp-2">
                    {[...r.initiatives, ...r.extraInitiatives.map((n) => `${n} (خارج الخطة)`)].join(" · ") || "—"}
                  </span>
                </td>
                <td className={cx(tdClass, MONO)}>{r.tasks.length}</td>
                <td className={cx(tdClass, MONO)}>{avg(r.commitment.average)}</td>
                <td className={cx(tdClass, MONO)}>{avg(r.readiness.average)}</td>
                <td className={cx(tdClass, "text-slate-600 dark:text-slate-300")}>{r.pace}</td>
                <td className={cx(tdClass, MONO, "text-slate-500")}>{r.submittedAt}</td>
                <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !(await confirmAction({
                          title: "حذف هذه الإجابة؟",
                          message: "لا تُستردّ.",
                          confirmLabel: "حذف",
                          tone: "danger",
                        }))
                      ) {
                        return;
                      }
                      act(() => deletePlanSurveyResponse(charityName, r.id), "حُذفت الإجابة.");
                    }}
                    aria-label="حذف"
                    className={btn.iconDanger}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {reading && <ResponseSheet response={reading} onClose={() => setReading(null)} />}
    </div>
  );
}

/** إجابةٌ واحدةٌ كاملة — أقسامُها السبعة كما أُجيبت. */
function ResponseSheet({ response, onClose }: { response: ResponseView; onClose: () => void }) {
  const r = response;
  const line = "text-body leading-7 text-slate-700 dark:text-slate-200";
  const head = "text-body font-semibold text-slate-900 dark:text-slate-100";

  return (
    <Sheet title={r.department} subtitle={`${r.role} · ${r.submittedAt}`} onClose={onClose}>
      <div className="space-y-6">
        <section className="space-y-1">
          <h3 className={head}>المبادرات</h3>
          <ul className="space-y-1">
            {r.initiatives.map((n) => (
              <li key={n} className={line}>
                {n}
              </li>
            ))}
            {r.extraInitiatives.map((n) => (
              <li key={n} className="flex items-center gap-2">
                <Badge tone="gold">خارج الخطة</Badge>
                <span className={line}>{n}</span>
              </li>
            ))}
            {r.initiatives.length === 0 && r.extraInitiatives.length === 0 && <li className={line}>—</li>}
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className={head}>
            الالتزام بالخطة — {avg(r.commitment.average)} من ٥
            <span className="ms-2 text-meta font-normal text-slate-400">
              ({r.commitment.answered}/{r.commitment.total})
            </span>
          </h3>
          {COMMITMENT_GROUPS.map((g) => {
            const groupAvg = ratingAverage(r.ratings, g.statements.map((s) => s.id));
            return (
              <div key={g.title} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="mb-1.5 flex items-center justify-between gap-2 text-meta text-slate-500">
                  <span>{g.title}</span>
                  <span className={MONO}>{avg(groupAvg.average)}</span>
                </p>
                <ul className="space-y-0.5">
                  {g.statements.map((s) => (
                    <li key={s.id} className="flex items-baseline justify-between gap-3 text-meta">
                      <span className="text-slate-600 dark:text-slate-300">
                        {s.id}. {s.text}
                      </span>
                      <span className={cx(MONO, "shrink-0 text-slate-700 dark:text-slate-200")}>
                        {r.ratings[String(s.id)] ? `${r.ratings[String(s.id)]} — ${RATING_LABELS[r.ratings[String(s.id)]]}` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <h3 className={head}>المهام — {r.tasks.length}</h3>
          {r.tasks.length === 0 ? (
            <p className={line}>لم تُسجَّل مهام.</p>
          ) : (
            <TableShell>
              <thead>
                <tr className={theadRowClass}>
                  <Th>المبادرة</Th>
                  <Th>المهمة</Th>
                  <Th>المخطَّط</Th>
                  <Th>الحالة</Th>
                  <Th>النسبة</Th>
                  <Th>المتوقَّع</Th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {r.tasks.map((t, i) => (
                  <tr key={i}>
                    <td className={cx(tdClass, "text-slate-600 dark:text-slate-300")}>{t.initiativeName}</td>
                    <td className={cx(tdClass, "text-slate-700 dark:text-slate-200")}>{t.taskTitle}</td>
                    <td className={cx(tdClass, MONO, "text-slate-500")}>{t.plannedEnd ?? "—"}</td>
                    <td className={tdClass}>{t.status}</td>
                    <td className={cx(tdClass, MONO)}>{t.progress === null ? "—" : `${t.progress}٪`}</td>
                    <td className={cx(tdClass, MONO, "text-slate-500")}>{t.expectedEnd ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
          <p className={line}>
            <span className="text-slate-500">سير التنفيذ: </span>
            {r.pace}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className={head}>المتعثرات</h3>
          <p className={line}>
            <span className="text-slate-500">الأسباب: </span>
            {[...r.causes, r.causeOther ? `أخرى: ${r.causeOther}` : null].filter(Boolean).join(" · ") || "—"}
          </p>
          {r.topCauses.length > 0 && (
            <ol className="space-y-0.5">
              {r.topCauses.map((c, i) => (
                <li key={c} className={line}>
                  {i + 1}. {c}
                </li>
              ))}
            </ol>
          )}
          {r.blockers.map((b, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-body font-medium text-slate-900 dark:text-slate-100">{b.subject || "—"}</p>
              {b.description && <p className={line}>{b.description}</p>}
              {b.cause && (
                <p className={line}>
                  <span className="text-slate-500">السبب: </span>
                  {b.cause}
                </p>
              )}
              {b.solution && (
                <p className={line}>
                  <span className="text-slate-500">الحلّ: </span>
                  {b.solution}
                </p>
              )}
              {b.proposedEnd && (
                <p className={cx(line, "text-slate-500")}>الموعد المقترح: {b.proposedEnd}</p>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h3 className={head}>
            الجاهزية — {avg(r.readiness.average)} من ٥
          </h3>
          <ul className="space-y-0.5">
            {READINESS_STATEMENTS.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 text-meta">
                <span className="text-slate-600 dark:text-slate-300">
                  {s.id}. {s.text}
                </span>
                <span className={cx(MONO, "shrink-0 text-slate-700 dark:text-slate-200")}>
                  {r.ratings[String(s.id)] ? `${r.ratings[String(s.id)]} — ${RATING_LABELS[r.ratings[String(s.id)]]}` : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className={line}>
            <span className="text-slate-500">توقّع الإنجاز: </span>
            {r.outlook}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className={head}>أسئلة مفتوحة</h3>
          {(
            [
              ["ما أبرز ما تحقق", r.achievements],
              ["الإجراء الأهم المطلوب", r.neededAction],
              ["مقترحات التحسين", r.suggestions],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="text-meta text-slate-500">{label}</p>
              <p className={line}>{value || "—"}</p>
            </div>
          ))}
        </section>
      </div>
    </Sheet>
  );
}
