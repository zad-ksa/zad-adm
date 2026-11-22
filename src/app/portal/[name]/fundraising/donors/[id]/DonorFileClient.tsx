"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, FileText, KeyRound, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, PageHeader, StatStrip } from "@/components/console/layout";
import { Badge, MONO, Note, btn, cx, field } from "@/components/console/ui";
import { CopyButton, SecretValue } from "@/components/console/Copy";
import Select from "@/components/console/Select";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import {
  addPortalProposal,
  deletePortalProposal,
  updatePortalProposal,
} from "@/app/actions/charityFundraising";
import { proposalStatusLabel, proposalStatusTone } from "@/lib/donorFields";
import type { DeadlineNote } from "@/lib/donorOrg";
import AccountSheet from "../../AccountSheet";
import type {
  PortalFieldRow,
  PortalInitiativeOption,
  PortalProposalRow,
} from "@/lib/portalFundraising";

type Donor = {
  id: string;
  name: string;
  url: string | null;
  legacyFields: string | null;
  notes: string | null;
  intakeStatus: string;
  intakeReason: string;
  opensAt: string | null;
  closesAt: string | null;
  deadline: DeadlineNote | null;
  grants: number;
  username: string | null;
  password: string | null;
};

const OUTSIDE = "__outside__";

/**
 * ملفُّ الجهة كما تراه الجمعية.
 *
 * **والمشروعُ المقترحُ من الخطة أو من خارجها**: القائمةُ مبادراتُ خططها
 * التشغيلية، وفيها خيارُ «مشروع من خارج الخطة» يفتح حقلَ كتابة — فالخطةُ هي
 * الأصل، والخروجُ عنها بابٌ لا طريقٌ أوّل.
 *
 * **وما يُكتب هنا يقرؤه فريقُ زاد** في ملف الجهة عنده: هو اقتراحٌ يُبنى عليه،
 * لا منحةٌ رُفعت — والمرفوعُ يُقرأ في «المنح المرفوعة».
 */
export default function DonorFileClient({
  charityId,
  charityName,
  donor,
  fields,
  initiatives,
  usedInitiativeIds,
}: {
  charityId: string;
  charityName: string;
  donor: Donor;
  fields: PortalFieldRow[];
  initiatives: PortalInitiativeOption[];
  /** مبادراتٌ اقتُرحت عند هذه الجهة — تُعلَّم في القائمة فلا تُقترح مرّتين. */
  usedInitiativeIds: string[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  // والحسابُ يُحرَّر من هنا لا بالرجوع إلى الجدول: رحلةُ صفحتين لتصحيح
  // كلمةِ مرورٍ عملٌ زائد، واللوحةُ هي هي (`AccountSheet` المشتركة).
  const [editingAccount, setEditingAccount] = useState(false);
  const base = `/portal/${encodeURIComponent(charityName)}/fundraising`;
  const proposals = fields.reduce((sum, f) => sum + f.proposals.length, 0);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        notify("error", res.error ?? "تعذرت العملية");
        return;
      }
      done?.();
      router.refresh();
    });

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[
          { label: "تنمية الموارد المالية", href: base },
          { label: donor.name },
        ]}
        icon={<Building2 className="size-6" />}
        title={donor.name}
        // والوصفُ ملاحظةُ الجهة وحدَها: نصُّ المجالات القديمُ يُقرأ هنا وتُقرأ
        // المجالاتُ صفوفاً أسفلَه، فيُفهم أنّهما خبران وهما واحد.
        description={donor.notes ?? undefined}
        actions={
          <>
            {donor.url && (
              <a href={donor.url} target="_blank" rel="noreferrer" className={btn.secondary}>
                <ExternalLink className="size-4" /> موقع الجهة
              </a>
            )}

          </>
        }
      />

      {/* أربعُ بطاقاتٍ لا خمس: «يُفتح» و«يُغلق» سؤالٌ واحدٌ — متى تتبدّل
          الحال؟ — فبطاقةٌ تتبدّل تسميتُها بحال الجهة تكفي. */}
      <StatStrip
        items={[
          {
            label: "حالة الرفع",
            value: donor.intakeStatus === "OPEN" ? "مفتوح" : "مغلق",
            hint: donor.intakeReason,
            dot: donor.intakeStatus === "OPEN" ? "active" : "muted",
          },
          {
            // والخانةُ مقاسُها رقم: التاريخُ فيها، والعبارةُ («يغلق بعد ٣
            // أيام» أو «بلا موعد») في سطر التلميح — ونصٌّ في خانة رقمٍ
            // بمقاس ٢٨px يلتفّ ويُقرأ عنواناً مكسوراً.
            label: donor.intakeStatus === "OPEN" ? "يغلق" : "يفتح",
            value: (donor.intakeStatus === "OPEN" ? donor.closesAt : donor.opensAt) ?? "—",
            hint: donor.deadline?.text ?? "بلا موعد معلن",
          },
          {
            label: "المشاريع المرفوعة",
            value: donor.grants,
            // ورقمٌ يُسأل عنه يُفتح: «ماذا رفعنا لهذه الجهة؟» كان عدداً لا
            // سبيلَ إلى قائمته، وصفحةُ المنح لا تُرشَّح بالجهة.
            href: donor.grants > 0 ? `${base}/grants?donor=${donor.id}` : undefined,
          },
          { label: "المشاريع المقترحة", value: proposals },
        ]}
      />

      {/* حسابُ الجمعية عند الجهة: يُقرأ ويُحرَّر في مكانه، وكلمةُ المرور
          تُنسخ قبل أن تُكشف. */}
      <section className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-caption text-slate-500 dark:text-slate-400">اسم المستخدم</p>
          {donor.username ? (
            <span className="inline-flex items-center gap-1.5">
              <span className={cx(MONO, "text-body text-slate-800 dark:text-slate-100")} dir="ltr">
                {donor.username}
              </span>
              <CopyButton value={donor.username} title="نسخ اسم المستخدم" />
            </span>
          ) : (
            <span className="text-body text-slate-400">لا حساب مسجل</span>
          )}
        </div>
        <div>
          <p className="text-caption text-slate-500 dark:text-slate-400">كلمة المرور</p>
          {/* و`SecretValue` تحمل الكشفَ والنسخَ معاً — فلا زرَّ ثانٍ بجانبها. */}
          <SecretValue value={donor.password} emptyLabel="—" />
        </div>
        <button
          type="button"
          onClick={() => setEditingAccount(true)}
          className={cx(btn.secondary, "ms-auto")}
        >
          <KeyRound className="size-4" />
          {donor.username ? "تعديل الحساب" : "إضافة حساب"}
        </button>
      </section>

      {/* ── مجالاتُ المنح ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-section font-semibold tracking-tight">
            <Layers className="size-4 text-primary dark:text-teal-300" />
            مجالات المنح
          </h2>
          <p className="mt-0.5 text-body text-slate-500 dark:text-slate-400">
            تضيفها زاد في ملف الجهة. ارفع تحت كل مجال مشاريعك المقترحة فيه.
          </p>
        </div>

        {fields.length === 0 ? (
          <div className="space-y-3">
            <EmptyState
              icon={<Layers className="size-4" />}
              title="لا مجالات مسجلة لهذه الجهة"
              description="تضاف المجالات من فريق زاد، ثم تظهر هنا لترفع تحتها مشاريعك."
            />
            {/* ونصُّ المجالات القديم يُعرض حتى يُنقل إلى صفوف: أكثرُ الجهات
                مجالاتُها نصٌّ عند زادٍ لم يُنقل بعد، وإخفاؤه يقول «لا مجالات»
                وهي مكتوبةٌ هناك. */}
            {donor.legacyFields && (
              <Note tone="brand">
                <span className="font-semibold">مجالات الدعم كما سجلتها زاد:</span>{" "}
                {donor.legacyFields}
              </Note>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => (
              <FieldCard
                key={f.id}
                charityId={charityId}
                field={f}
                initiatives={initiatives}
                usedInitiativeIds={usedInitiativeIds}
                deadline={donor.deadline}
                closed={donor.intakeStatus !== "OPEN"}
                busy={busy}
                run={run}
              />
            ))}
          </div>
        )}
      </section>

      {editingAccount && (
        <AccountSheet
          charityId={charityId}
          donor={{ id: donor.id, name: donor.name, username: donor.username, password: donor.password }}
          busy={busy}
          onClose={() => setEditingAccount(false)}
          onRun={(fn) =>
            run(fn, () => {
              setEditingAccount(false);
              notify("ok", "حُفظ الحساب.");
            })
          }
        />
      )}
    </div>
  );
}

function FieldCard({
  charityId,
  field: row,
  initiatives,
  usedInitiativeIds,
  deadline,
  closed,
  busy,
  run,
}: {
  charityId: string;
  field: PortalFieldRow;
  initiatives: PortalInitiativeOption[];
  usedInitiativeIds: string[];
  /** موعدُ الجهة منسوباً إلى اليوم — يُقرأ في لحظة الكتابة لا في أعلى الصفحة. */
  deadline: DeadlineNote | null;
  closed: boolean;
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  /** مقترحٌ قيد التعديل — نفسُ النموذج، فلا شكلان لعملٍ واحد. */
  const [editing, setEditing] = useState<PortalProposalRow | null>(null);

  const outside = picked === OUTSIDE;
  const reset = () => {
    setAdding(false);
    setPicked("");
    setName("");
    setNote("");
    setEditing(null);
  };

  const submit = () => {
    if (editing) {
      run(() => updatePortalProposal(editing.id, { name, note }), () => {
        reset();
        notify("ok", "حفظ المشروع المقترح.");
      });
      return;
    }
    run(
      () =>
        addPortalProposal(charityId, row.id, {
          initiativeId: outside || !picked ? null : picked,
          name: outside ? name : null,
          note,
        }),
      () => {
        reset();
        // وقولُ «أُضيف» بعد النجاح: الإغلاقُ وحدَه لا يُفرَّق عن انصرافٍ بلا حفظ.
        notify("ok", "أضيف المشروع المقترح.");
      }
    );
  };

  return (
    <article
      id={`field-${row.id}`}
      // ومرسىً لكلِّ مجال: قائمةُ الجهات تربط اسمَ المجال به، فيَنزل القارئُ
      // عليه بدل أن يبحث عنه في الصفحة.
      className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-body font-semibold text-slate-900 dark:text-slate-100">
            {row.name}
            {row.proposals.length > 0 && (
              <Badge tone="brand">{row.proposals.length} مشروع مقترح</Badge>
            )}
          </h3>
          {row.description && (
            <p className="mt-0.5 text-caption leading-5 text-slate-500 dark:text-slate-400">{row.description}</p>
          )}
          {/* وسومُ المجال كما كتبتها زاد — تُقرأ ولا تُحرَّر هنا. */}
          {row.tags.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {row.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-meta text-slate-500 dark:border-slate-700 dark:text-slate-400"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={btn.secondary}>
            <Plus className="size-4" /> مشروع مقترح
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="mt-3 space-y-2 rounded-lg border border-primary/15 bg-primary/[0.03] p-3 dark:border-teal-400/15 dark:bg-teal-400/[0.04]">
          {/* والموعدُ يُقرأ في لحظة الكتابة: حالةُ الجهة في أعلى الصفحة،
              والكاتبُ هنا — فمن يكتب لجهةٍ تُغلق بعد يومين يَعلم وهو يكتب. */}
          {!editing && (closed || deadline?.tone === "danger" || deadline?.tone === "warn") && (
            <Note tone={closed || deadline?.tone === "danger" ? "warn" : "brand"}>
              {closed
                ? `الرفع مغلق عند هذه الجهة الآن${deadline ? ` — ${deadline.text}` : ""}. والاقتراح يبقى محفوظا لفريق زاد.`
                : `${deadline?.text} — جهز المشروع قبل الموعد.`}
            </Note>
          )}

          {!editing && (
            <label className="block">
              <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
                المشروع
              </span>
              <Select
                value={picked}
                onSelect={setPicked}
                placeholder="اختر مشروعا من الخطة التشغيلية…"
                options={[
                  ...initiatives.map((i) => ({
                    value: i.id,
                    label: i.name,
                    // والمقترحُ من قبلُ يُعلَّم ولا يُمنع: قد يُقترح المشروعُ
                    // نفسُه في مجالين عن قصد، والتنبيهُ يكفي.
                    hint: usedInitiativeIds.includes(i.id)
                      ? `${i.planLabel} · اقترح عند هذه الجهة`
                      : i.planLabel,
                  })),
                  { value: OUTSIDE, label: "مشروع من خارج الخطة" },
                ]}
                className="[&>button]:w-full [&>button]:justify-between"
              />
            </label>
          )}

          {(outside || editing) && (
            <label className="block">
              <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
                اسم المشروع
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المشروع"
                className={field}
                autoFocus
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-caption font-semibold text-slate-500 dark:text-slate-400">
              <span>ملاحظة (اختياري)</span>
              <span className="font-normal text-slate-400">{note.length} / 600</span>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 600))}
              placeholder="ما يميز هذا المشروع في هذا المجال"
              className={field}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || (!editing && !picked) || ((outside || !!editing) && !name.trim())}
              onClick={submit}
              className={btn.primary}
            >
              {editing ? "حفظ" : "إضافة"}
            </button>
            <button type="button" onClick={reset} disabled={busy} className={btn.secondary}>
              إلغاء
            </button>
            {/* وسببُ القفل مكتوب: زرٌّ معطَّلٌ بلا بيانٍ طريقٌ مسدود. */}
            {!editing && !picked && (
              <span className="text-meta text-slate-400">اختر مشروعا أولا</span>
            )}
          </div>
        </div>
      )}

      {row.proposals.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {row.proposals.map((p) => (
            <li key={p.id} className="flex items-start gap-3 px-3 py-2">
              <FileText className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-body text-slate-800 dark:text-slate-100">
                  {p.name}
                  {/* ومصيرُه عند زادٍ يُقرأ هنا: الاقتراحُ بلا مصيرٍ طريقٌ
                      مسدود — تكتبه الجمعيةُ ولا تعرف أرُفع أم أُجِّل. */}
                  <Badge tone={proposalStatusTone(p.status)}>{proposalStatusLabel(p.status)}</Badge>
                  {!p.fromPlan && <Badge tone="neutral">من خارج الخطة</Badge>}
                </p>
                {p.note && (
                  <p className="mt-0.5 text-caption leading-5 text-slate-500 dark:text-slate-400">{p.note}</p>
                )}
                <p className="mt-0.5 text-meta text-slate-400">
                  {p.createdAt}
                  {p.authorName ? ` · ${p.authorName}` : ""}
                </p>
              </div>
              {/* والتعديلُ قبل الحذف: خطأٌ في حرفٍ كان يُكلّف الصفَّ كلَّه
                  — تاريخَه وكاتبَه وما ضبطته زادٌ من حاله. */}
              <button
                type="button"
                disabled={busy}
                aria-label="تعديل المشروع"
                onClick={() => {
                  setEditing(p);
                  setAdding(false);
                  setName(p.name);
                  setNote(p.note ?? "");
                }}
                className={btn.icon}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label="حذف المشروع"
                onClick={async () => {
                  if (
                    await confirmAction({
                      title: `حذف «${p.name}» من المقترحات؟`,
                      confirmLabel: "حذف",
                      tone: "danger",
                    })
                  ) {
                    run(() => deletePortalProposal(p.id));
                  }
                }}
                className={cx(btn.icon, "text-rose-500 hover:text-rose-600")}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
