"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, FileText, KeyRound, Layers, Plus, Trash2 } from "lucide-react";
import { EmptyState, PageHeader, StatStrip } from "@/components/console/layout";
import { Badge, MONO, btn, cx, field } from "@/components/console/ui";
import { CopyButton, SecretValue } from "@/components/console/Copy";
import Select from "@/components/console/Select";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { addPortalProposal, deletePortalProposal } from "@/app/actions/charityFundraising";
import AccountSheet from "../../AccountSheet";
import type { PortalFieldRow, PortalInitiativeOption } from "@/lib/portalFundraising";

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
}: {
  charityId: string;
  charityName: string;
  donor: Donor;
  fields: PortalFieldRow[];
  initiatives: PortalInitiativeOption[];
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
            <Link href={`${base}/grants`} className={btn.secondary}>
              المنح المرفوعة
            </Link>
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
            label: donor.intakeStatus === "OPEN" ? "يغلق" : "يفتح",
            value: (donor.intakeStatus === "OPEN" ? donor.closesAt : donor.opensAt) ?? "بلا موعد معلن",
          },
          { label: "المشاريع المرفوعة", value: donor.grants },
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
          {donor.password ? (
            <span className="inline-flex items-center gap-1.5">
              <CopyButton value={donor.password} title="نسخ كلمة المرور" />
              <SecretValue value={donor.password} />
            </span>
          ) : (
            <span className="text-body text-slate-400">—</span>
          )}
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
          <EmptyState
            icon={<Layers className="size-4" />}
            title="لا مجالات مسجلة لهذه الجهة"
            description="تضاف المجالات من فريق زاد، ثم تظهر هنا لترفع تحتها مشاريعك."
          />
        ) : (
          <div className="space-y-3">
            {fields.map((f) => (
              <FieldCard
                key={f.id}
                charityId={charityId}
                field={f}
                initiatives={initiatives}
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
  busy,
  run,
}: {
  charityId: string;
  field: PortalFieldRow;
  initiatives: PortalInitiativeOption[];
  busy: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const outside = picked === OUTSIDE;
  const reset = () => {
    setAdding(false);
    setPicked("");
    setName("");
    setNote("");
  };

  const submit = () =>
    run(
      () =>
        addPortalProposal(charityId, row.id, {
          initiativeId: outside || !picked ? null : picked,
          name: outside ? name : null,
          note,
        }),
      reset
    );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-body font-semibold text-slate-900 dark:text-slate-100">
            {row.name}
            {row.proposals.length > 0 && (
              <span className="text-meta font-normal text-slate-400">
                {row.proposals.length} مشروع مقترح
              </span>
            )}
          </h3>
          {row.description && (
            <p className="mt-0.5 text-caption leading-5 text-slate-500 dark:text-slate-400">{row.description}</p>
          )}
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={btn.secondary}>
            <Plus className="size-4" /> مشروع مقترح
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-3 space-y-2 rounded-lg border border-primary/15 bg-primary/[0.03] p-3 dark:border-teal-400/15 dark:bg-teal-400/[0.04]">
          <Select
            value={picked}
            onSelect={setPicked}
            placeholder="اختر مشروعا من الخطة التشغيلية…"
            options={[
              ...initiatives.map((i) => ({ value: i.id, label: i.name, hint: i.planLabel })),
              { value: OUTSIDE, label: "مشروع من خارج الخطة" },
            ]}
            className="[&>button]:w-full [&>button]:justify-between"
          />
          {outside && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المشروع"
              className={field}
              autoFocus
            />
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظة (اختياري)"
            className={field}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !picked || (outside && !name.trim())}
              onClick={submit}
              className={btn.primary}
            >
              إضافة
            </button>
            <button type="button" onClick={reset} disabled={busy} className={btn.secondary}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {row.proposals.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {row.proposals.map((p) => (
            <li key={p.id} className="flex items-start gap-3 px-3 py-2">
              <FileText className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-body text-slate-800 dark:text-slate-100">
                  {p.name}{" "}
                  {!p.fromPlan && (
                    <Badge tone="neutral">
                      <span className="text-[10px]">من خارج الخطة</span>
                    </Badge>
                  )}
                </p>
                {p.note && (
                  <p className="mt-0.5 text-caption leading-5 text-slate-500 dark:text-slate-400">{p.note}</p>
                )}
                <p className="mt-0.5 text-meta text-slate-400">
                  {p.createdAt}
                  {p.authorName ? ` · ${p.authorName}` : ""}
                </p>
              </div>
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
