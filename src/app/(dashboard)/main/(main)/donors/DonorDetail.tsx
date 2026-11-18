"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Building2, CalendarClock, ExternalLink, FileText, KeyRound, Layers, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  Segmented,
  SortTh,
  StatStrip,
  TableShell,
  Th,
  tableFrameClass,
  tbodyClass,
  tdClass,
  theadRowClass,
  type SortDir,
} from "@/components/console/layout";
import { Badge, MONO, btn, cx, field } from "@/components/console/ui";
import { CopyButton, SecretValue } from "@/components/console/Copy";
import { Sheet } from "@/components/console/overlays";
import Select from "@/components/console/Select";
import MultiSelect from "@/components/console/MultiSelect";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { GRANT_STATUSES, grantStatusLabel } from "@/lib/donorOrg";
import {
  addDonorField,
  deleteDonorAccountRow,
  deleteDonorField,
  importLegacyDonorFields,
  moveDonorField,
  saveDonorAccount,
  updateDonorField,
} from "@/app/actions/donorOrgs";
import { updateGrantApplicationStatus } from "@/app/actions/charity";
import GrantSheet, { type EditableGrant } from "@/components/grants/GrantSheet";
import { confirmAndDeleteGrant } from "@/components/grants/deleteGrant";
import GrantStatusDialog, { type StatusTarget } from "@/components/grants/GrantStatusDialog";
import DonorSheet from "./DonorSheet";
import type { DonorAccountRow, DonorFieldRow, DonorGrantRow, DonorRow } from "./donorData";

type Charity = { id: string; name: string; isInternal: boolean };

/**
 * أعمدةُ الفرز — والفرزُ بالنقر على الرأس (`SortTh`) لا بقائمةٍ منسدلة.
 *
 * وكانت قائمةً من ستّة أسطرٍ تُكتب يداً («الأحدث أولاً»، «الأكبر مبلغاً»،
 * …)، وهي تُنسى عند إضافة عمود، وتخالف شاشةَ المنح الجامعة التي تفرز
 * برؤوسها. والرأسُ هو المكانُ الذي يبحث فيه القارئُ عن الفرز أصلاً.
 */
type GrantColumn = "charity" | "initiative" | "amount" | "status" | "date";

/** تبويباتُ الصفحة — أقسامٌ أربعةٌ متساويةُ الوزن كانت تمريراً طويلاً. */
type DonorTab = "fields" | "accounts" | "grants";

const money = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 0 });

/**
 * صفحةُ جهةٍ مانحة: حساباتُ الجمعيات عندها، ثم المنحُ المرفوعة إليها.
 *
 * وهي صفحةٌ واحدةٌ لثلاثة تبويبات (الجهات، منصة إحسان، صندوق دعم الجمعيات) لأن
 * الثلاثةَ شيءٌ واحدٌ باختلاف النوع. و`underDevelopment` يَسم التبويبين اللذين
 * لم يُصمَّما بعد.
 *
 * و`showAccounts` يُطفئ جدولَ حسابات الدخول — مُطفأٌ في «منصة إحسان» و«صندوق
 * دعم الجمعيات»: الدخولُ إليهما ليس بحسابٍ لكل جمعيةٍ كجهاتِ المنح، فجدولٌ
 * بصفوفٍ فارغةٍ لكل جمعيةٍ يَعِد بما لا يوجد. والمنحُ تبقى كما هي.
 *
 * والجمعياتُ المعروضةُ جمعياتُ الرائي المسنَدة وحدها — حساباً كانت أو منحاً.
 */
export default function DonorDetail({
  org,
  kind,
  charities,
  accounts,
  grants,
  fields,
  underDevelopment = false,
  showAccounts = true,
}: {
  org: DonorRow;
  kind: string;
  charities: Charity[];
  accounts: DonorAccountRow[];
  grants: DonorGrantRow[];
  /** مجالاتُ المنح صفوفاً — تُقرأ في بوّابة الجمعية وتُكتب هنا. */
  fields: DonorFieldRow[];
  underDevelopment?: boolean;
  showAccounts?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingOrg, setEditingOrg] = useState(false);
  const [accountFor, setAccountFor] = useState<{ charity: Charity; row: DonorAccountRow | null } | null>(null);
  const [addingGrant, setAddingGrant] = useState(false);
  const [editingGrant, setEditingGrant] = useState<EditableGrant | null>(null);
  const [statusFor, setStatusFor] = useState<{ grant: StatusTarget; next: "APPROVED" | "CLOSED" } | null>(null);

  const [pickedCharities, setPickedCharities] = useState<string[]>([]);
  // حالاتٌ لا حالة: «المقبولة والمغلقة» سؤالٌ واحد، وكان يلزمه نظرتان بمُرشِّحٍ
  // مفرد. وقائمةٌ فارغةٌ تعني «الكلّ» كمُرشِّح الجمعيات — فلا خيارَ «كل الحالات»
  // يُزاحم الحالاتِ في القائمة.
  const [pickedStatuses, setPickedStatuses] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [column, setColumn] = useState<GrantColumn>("date");
  const [dir, setDir] = useState<SortDir>("desc");
  const [tab, setTab] = useState<DonorTab>("grants");

  const onSort = (next: GrantColumn, nextDir: SortDir) => {
    setColumn(next);
    setDir(nextDir);
  };

  const accountOf = useMemo(() => new Map(accounts.map((a) => [a.charityId, a])), [accounts]);

  /**
   * الجدولُ يعرض الموجودَ وحدَه.
   *
   * وكان صفّاً لكلِّ جمعيةٍ مسنَدةٍ ولو بلا حساب: تسعُ جمعياتٍ تعني تسعةَ
   * صفوفٍ أكثرُها شُرَطٌ وزرُّ «إضافة حساب» مكرَّرٌ تسعاً — فراغٌ يُعرض كأنّه
   * بيانات. وجمعياتُ ما بلا حسابٍ تُقال في سطرٍ واحدٍ تحته، والإضافةُ فعلٌ
   * واحدٌ يختار جمعيتَه.
   */
  const withAccounts = useMemo(
    () => charities.filter((c) => accountOf.has(c.id)),
    [charities, accountOf]
  );
  const withoutAccounts = useMemo(
    () => charities.filter((c) => !accountOf.has(c.id)),
    [charities, accountOf]
  );

  /** كم منحةً في كل حالة — بعد مُرشِّح الجمعيات وحدَه. */
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of grants) {
      if (pickedCharities.length > 0 && !pickedCharities.includes(g.charityId)) continue;
      counts.set(g.status, (counts.get(g.status) ?? 0) + 1);
    }
    return counts;
  }, [grants, pickedCharities]);

  const shownGrants = useMemo(() => {
    const text = (a: string, b: string) => a.localeCompare(b, "ar");
    const q = query.trim();
    const list = grants
      .filter((g) => (pickedCharities.length === 0 ? true : pickedCharities.includes(g.charityId)))
      .filter((g) => (pickedStatuses.length === 0 ? true : pickedStatuses.includes(g.status)))
      // والبحثُ في الاسمين معاً: القارئُ يتذكّر المبادرةَ أو الجمعية، ولا
      // يعرف في أيِّ عمودٍ كُتب ما يتذكّره.
      .filter((g) => q === "" || g.initiativeName.includes(q) || g.charityName.includes(q));

    const sign = dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (column) {
        case "amount":
          return sign * (a.requestedAmount - b.requestedAmount);
        case "charity":
          return sign * text(a.charityName, b.charityName) || b.createdAtMs - a.createdAtMs;
        case "initiative":
          return sign * text(a.initiativeName, b.initiativeName) || b.createdAtMs - a.createdAtMs;
        case "status":
          return sign * text(a.status, b.status) || b.createdAtMs - a.createdAtMs;
        default:
          return sign * (a.createdAtMs - b.createdAtMs);
      }
    });
    return list;
  }, [grants, pickedCharities, pickedStatuses, query, column, dir]);

  const sumRequested = shownGrants.reduce((sum, g) => sum + g.requestedAmount, 0);
  const distinctCharities = new Set(shownGrants.map((g) => g.charityId)).size;
  const scopedCharityCount = new Set(grants.map((g) => g.charityId)).size;

  /**
   * تحويلُ حالة منحة — والمقبولةُ والمغلقةُ تسألان أوّلاً.
   *
   * فالاعتمادُ يكتب سجلّاً ماليّاً بالمبلغ المعتمد ويُجدوِل أقساطَ العقد،
   * والإغلاقُ يلزمه تاريخُه. وهما في `GrantStatusDialog` المشترك نفسِه الذي
   * يستعمله جدولُ المنح — فلا يختلف الاعتمادُ بحسب الصفحة التي جرى منها.
   */
  const changeGrantStatus = (g: DonorGrantRow, to: string) => {
    if (to === g.status) return;
    if (to === "APPROVED" || to === "CLOSED") {
      setStatusFor({
        grant: {
          id: g.id,
          charityId: g.charityId,
          charityName: g.charityName,
          initiativeName: g.initiativeName,
          requestedAmount: g.requestedAmount,
          status: g.status,
        },
        next: to,
      });
      return;
    }
    void (async () => {
      const res = await updateGrantApplicationStatus(g.id, g.charityId, to);
      if (!res.success) {
        notify("error", res.message || "تعذّر تحديث الحالة");
        return;
      }
      notify("ok", `صارت الحالةُ «${grantStatusLabel(to)}».`);
      startTransition(() => router.refresh());
    })();
  };

  /** الحذفُ في `deleteGrant` المشترك: المنحةُ تُحذف سواءً من أيِّ شاشةٍ كانت. */
  const removeGrant = (g: DonorGrantRow) => {
    void (async () => {
      if (await confirmAndDeleteGrant(g)) startTransition(() => router.refresh());
    })();
  };

  const removeAccount = (row: DonorAccountRow, charityName: string) => {
    void (async () => {
      if (
        !(await confirmAction({
          title: `حذف حساب «${charityName}»؟`,
          message: "يُحذف اسمُ المستخدم وكلمةُ المرور من الموقع. والحسابُ عند الجهة يبقى كما هو.",
          confirmLabel: "حذف",
          tone: "danger",
        }))
      ) {
        return;
      }
      const res = await deleteDonorAccountRow(row.id);
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      notify("ok", "حُذف الحساب.");
      startTransition(() => router.refresh());
    })();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        crumbs={[
          { label: "تنمية الموارد المالية" },
          ...(kind === "FOUNDATION" ? [{ label: "الجهات المانحة", href: "/main/donors" }] : []),
          { label: org.name },
        ]}
        icon={<Building2 className="size-6" />}
        title={org.name}
        // والوصفُ ما لا يُقرأ في مكانٍ آخر: كان أسماءَ المجالات مفصولةً
        // بنقاط، وهي مكرّرةٌ حرفاً بحرفٍ في بطاقة المجالات أسفلَه — فأغلى
        // مساحةٍ في الصفحة تحمل خبراً يُقرأ مرّتين. وملاحظةُ الجهة لم تكن
        // تُعرض في الصفحة أصلاً، وإنّما تُكتب في لوحة التعديل وتُنسى.
        description={
          <>
            {underDevelopment && (
              <span className="me-2 align-middle">
                <Badge tone="gold">تحت التطوير</Badge>
              </span>
            )}
            {org.notes ?? null}
          </>
        }
        actions={
          <>
            {/* ولا زرَّ معطَّلاً لرابطٍ غير مسجَّل: هدفُ نقرٍ لا يفعل شيئاً. */}
            {org.url && (
              <a href={org.url} target="_blank" rel="noreferrer" className={btn.secondary}>
                <ExternalLink className="size-4" /> زيارة الموقع
              </a>
            )}
            <button type="button" onClick={() => setEditingOrg(true)} className={btn.primary}>
              <Pencil className="size-4" /> تعديل
            </button>
          </>
        }
      />

      {/* ثلاثُ بطاقاتٍ لا خمس: «الحالة» و«يُفتح» و«يُغلق» كُنّ ثلاثاً لسؤالٍ
          واحد — أيمكن الرفعُ الآن، ومتى يتغيّر؟ فجُمعن في بطاقةٍ وبطاقةِ
          موعدها القادم، وخمسُ بطاقاتٍ تتجاوز ما يُمسح بنظرة. */}
      <StatStrip
        items={[
          {
            label: "حالة الرفع",
            value: org.intakeStatus === "OPEN" ? "مفتوح" : "مغلق",
            hint: org.intakeReason,
            dot: org.intakeStatus === "OPEN" ? "active" : "muted",
          },
          {
            label: org.intakeStatus === "OPEN" ? "يُغلق" : "يُفتح",
            value: (org.intakeStatus === "OPEN" ? org.closesAt : org.opensAt) ?? "بلا موعدٍ معلن",
          },
          {
            label: "الطلبات المرفوعة",
            value: grants.length,
            hint: `من ${scopedCharityCount} من جمعياتك`,
          },
        ]}
      />

      {org.intakeMode === "AUTO" && (
        <p className="flex items-center gap-2 text-body text-slate-500 dark:text-slate-400">
          <CalendarClock className="size-4 shrink-0" />
          الحالةُ محسوبةٌ من التاريخين: {org.intakeReason}. ولا تُضبط يدوياً ما دام لها موعدٌ مسجَّل.
        </p>
      )}

      {/* تبويبُ الأقسام: كانت أربعةً متساويةَ الوزن في تمريرٍ طويل، وصار
          لكلٍّ بابُه وعددُه ظاهرٌ عليه — فيُعرف أين الخبرُ قبل أن يُمرَّر
          إليه. وبياناتُ الجهة فوقها لا تُخبَّأ في تبويب: هي هُويّةُ الصفحة. */}
      <Segmented
        label="أقسام ملف الجهة"
        value={tab}
        onChange={setTab}
        options={[
          { id: "grants", label: `المنح (${grants.length})` },
          { id: "fields", label: `مجالات المنح (${fields.length})` },
          ...(showAccounts
            ? [{ id: "accounts" as DonorTab, label: `حسابات الدخول (${accounts.length})` }]
            : []),
        ]}
      />

      {/* ── مجالاتُ المنح ───────────────────────────────────────────────── */}
      {tab === "fields" && (
        <GrantFieldsCard org={org} fields={fields} onDone={() => startTransition(() => router.refresh())} />
      )}

      {/* ── حساباتُ الدخول ──────────────────────────────────────────────── */}
      {tab === "accounts" && showAccounts && (
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-section font-semibold tracking-tight">
              <KeyRound className="size-4 text-primary dark:text-teal-300" />
              حسابات الدخول
            </h2>
            <p className="mt-0.5 text-body text-slate-500 dark:text-slate-400">
              حساباتُ جمعياتك المسجَّلةُ عند هذه الجهة. وكلمةُ المرور تُنسخ بلا كشفٍ على الشاشة.
            </p>
          </div>
          {/* الإضافةُ فعلٌ واحدٌ يختار جمعيتَه، لا زرٌّ مكرَّرٌ في كلِّ صفٍّ فارغ. */}
          {withoutAccounts.length > 0 && (
            <Select
              placeholder="إضافة حساب لجمعية…"
              onSelect={(id) => {
                const charity = withoutAccounts.find((c) => c.id === id);
                if (charity) setAccountFor({ charity, row: null });
              }}
              options={withoutAccounts.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        </div>

        {charities.length === 0 ? (
          <div className={tableFrameClass}>
            <EmptyState
              icon={<KeyRound className="size-4" />}
              title="لا جمعياتٍ مسنَدةً إليك"
              description="تُسنَد الجمعياتُ من إدارة الموظفين، ثم تظهر صفوفُها هنا."
            />
          </div>
        ) : withAccounts.length === 0 ? (
          <div className={tableFrameClass}>
            <EmptyState
              icon={<KeyRound className="size-4" />}
              title="لا حساب مسجل لجمعياتك عند هذه الجهة"
              description="اختر جمعية من «إضافة حساب لجمعية» أعلاه لتسجيل اسم المستخدم وكلمة المرور."
            />
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr className={theadRowClass}>
                <Th>الجمعية</Th>
                <Th>اسم المستخدم</Th>
                <Th>كلمة المرور</Th>
                <Th className="w-px" />
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {withAccounts.map((c) => {
                const row = accountOf.get(c.id)!;
                return (
                  <tr key={c.id}>
                    <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>
                      {c.name}
                      {c.isInternal && <span className="ms-2 text-meta text-slate-400">كيانٌ داخلي</span>}
                    </td>
                    <td className={tdClass}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cx(MONO, "text-body text-slate-700 dark:text-slate-200")} dir="ltr">
                          {row.username}
                        </span>
                        <CopyButton value={row.username} title="نسخ اسم المستخدم" />
                      </span>
                    </td>
                    <td className={tdClass}>
                      {/* النسخُ قبل الكشف: الحاجةُ الغالبةُ لصقُها في بوّابة الجهة،
                          وكشفُها على شاشةٍ مفتوحةٍ لا يلزم لذلك. */}
                      <span className="inline-flex items-center gap-1.5">
                        <CopyButton value={row.password} title="نسخ كلمة المرور" />
                        <SecretValue value={row.password} />
                      </span>
                    </td>
                    <td className={tdClass}>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAccountFor({ charity: c, row })}
                          aria-label={`تعديل حساب ${c.name}`}
                          className={btn.icon}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAccount(row, c.name)}
                          aria-label={`حذف حساب ${c.name}`}
                          className={btn.iconDanger}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}

        {/* وما بلا حسابٍ يُقال سطراً واحداً: خبرٌ يُقرأ، لا صفوفٌ تُمرَّر. */}
        {withAccounts.length > 0 && withoutAccounts.length > 0 && (
          <p className="text-caption text-slate-500 dark:text-slate-400">
            بلا حساب مسجل ({withoutAccounts.length}):{" "}
            {withoutAccounts.map((c) => c.name).join("، ")}
          </p>
        )}
      </section>
      )}

      {/* ── المنحُ المرفوعة ─────────────────────────────────────────────── */}
      {tab === "grants" && (
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-section font-semibold tracking-tight">
              <FileText className="size-4 text-primary dark:text-teal-300" />
              المنح المرفوعة لهذه الجهة
            </h2>
            <p className="mt-0.5 text-body text-slate-500 dark:text-slate-400">
              من جمعياتك المسنَدة — تُفرز وتُفلتر بجمعيةٍ أو أكثر.
            </p>
          </div>
          {/* الإنشاءُ وحدَه مع العنوان: كان يقف بين ثلاثة مُرشِّحاتٍ في سطرٍ
              واحد، فإذا التفّ السطرُ في شاشةٍ متوسّطةٍ ضاع الفعلُ بين الأدوات.
              والرفعُ من هنا والجهةُ مثبَّتةٌ، ومن صفحة منح الجمعية والجمعيةُ
              مثبَّتة — فعلٌ واحدٌ (`addGrantApplication`) بوجهين. */}
          <button
            type="button"
            onClick={() => setAddingGrant(true)}
            disabled={charities.length === 0}
            title={charities.length === 0 ? "لا جمعياتٍ مسنَدةً إليك" : undefined}
            className={cx(btn.primary, charities.length === 0 && "pointer-events-none opacity-50")}
          >
            <Plus className="size-4" /> إضافة منحة
          </button>
        </div>

        {/* والتصفيةُ في شريطها: بحثٌ نصّيٌّ أوّلاً — هو أسرعُ من مُرشِّحين لمن
            يتذكّر اسمَ المبادرة. */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={query}
            onChange={setQuery}
            label="بحث في المنح"
            placeholder="ابحث باسم المبادرة أو الجمعية…"
            className="min-w-56 flex-1"
          />
          <MultiSelect
            label="الجمعيات"
            placeholder="كل الجمعيات"
            allLabel="كل الجمعيات"
            countNoun="جمعيات"
            values={pickedCharities}
            onChange={setPickedCharities}
            options={charities.map((c) => ({ value: c.id, label: c.name }))}
          />
          <MultiSelect
            label="الحالات"
            placeholder="كل الحالات"
            allLabel="كل الحالات"
            countNoun="حالات"
            values={pickedStatuses}
            onChange={setPickedStatuses}
            // العددُ بجوار كل حالة: كم منحةً فيها — بعد مُرشِّح الجمعيات لا
            // بعد مُرشِّح الحالات نفسِه، وإلّا صفَّرت أوّلُ نقرةٍ ما عداها.
            options={GRANT_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
              count: statusCounts.get(s.value) ?? 0,
            }))}
          />
        </div>

        <TableShell
          empty={
            shownGrants.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-4" />}
                title={grants.length === 0 ? "لم تُرفع منحةٌ لهذه الجهة بعد" : "لا منحةَ تُطابق المُرشِّحات"}
                description={grants.length === 0 ? "ارفعها من «إضافة منحة» أعلاه، أو من صفحة منح الجمعية." : undefined}
              />
            ) : undefined
          }
          footer={
            shownGrants.length === grants.length
              ? `${shownGrants.length} منحة · ${distinctCharities} جمعية · إجمالي المطلوب ${money(sumRequested)} ريال`
              : `${shownGrants.length} من ${grants.length} منحة · ${distinctCharities} جمعية · إجمالي المطلوب ${money(sumRequested)} ريال`
          }
        >
          <thead>
            <tr className={theadRowClass}>
              <SortTh id="charity" active={column} dir={dir} onSort={onSort}>
                الجمعية
              </SortTh>
              <SortTh id="initiative" active={column} dir={dir} onSort={onSort}>
                المبادرة
              </SortTh>
              {/* والوحدةُ في الرأس لا في التذييل وحدَه: رقمٌ بلا وحدةٍ يُقرأ مرّتين. */}
              <SortTh id="amount" active={column} dir={dir} onSort={onSort}>
                المبلغ المطلوب (ريال)
              </SortTh>
              <SortTh id="status" active={column} dir={dir} onSort={onSort}>
                الحالة
              </SortTh>
              <SortTh id="date" active={column} dir={dir} onSort={onSort}>
                تاريخ الرفع
              </SortTh>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {shownGrants.map((g) => (
              <tr key={g.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{g.charityName}</td>
                <td className={cx(tdClass, "text-slate-700 dark:text-slate-200")}>{g.initiativeName}</td>
                <td className={cx(tdClass, MONO)}>{money(g.requestedAmount)}</td>
                <td className={tdClass}>
                  <Badge
                    tone={
                      g.status === "APPROVED" ? "good" : g.status === "REJECTED" ? "danger" : g.status === "CLOSED" ? "neutral" : "warn"
                    }
                  >
                    {grantStatusLabel(g.status)}
                  </Badge>
                </td>
                <td className={cx(tdClass, MONO, "text-slate-500")}>{g.createdAt}</td>
                <td className={tdClass}>
                  <span className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingGrant({
                          id: g.id,
                          charityId: g.charityId,
                          charityName: g.charityName,
                          donorOrgId: org.id,
                          initiativeName: g.initiativeName,
                          requestedAmount: g.requestedAmount,
                          status: g.status,
                        })
                      }
                      aria-label={`تعديل منحة ${g.initiativeName}`}
                      className={btn.icon}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGrant(g)}
                      aria-label={`حذف منحة ${g.initiativeName}`}
                      className={cx(btn.icon, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <Select
                      onSelect={(to) => changeGrantStatus(g, to)}
                      placeholder="الحالة"
                      options={GRANT_STATUSES.filter((s) => s.value !== g.status).map((s) => ({
                        value: s.value,
                        label: s.label,
                      }))}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>
      )}

      {editingOrg && (
        <DonorSheet
          row={org}
          kind={kind}
          counts={{ charities: scopedCharityCount, grants: grants.length }}
          onClose={() => setEditingOrg(false)}
          onSaved={() => {
            setEditingOrg(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {(addingGrant || editingGrant) && (
        <GrantSheet
          grant={editingGrant ?? undefined}
          donor={{ id: org.id, name: org.name }}
          charities={charities}
          onClose={() => {
            setAddingGrant(false);
            setEditingGrant(null);
          }}
          onSaved={() => {
            setAddingGrant(false);
            setEditingGrant(null);
            startTransition(() => router.refresh());
          }}
          onDeleted={() => {
            setEditingGrant(null);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {statusFor && (
        <GrantStatusDialog
          grant={statusFor.grant}
          next={statusFor.next}
          onClose={() => setStatusFor(null)}
          onSaved={() => {
            setStatusFor(null);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {accountFor && (
        <AccountSheet
          donorOrgId={org.id}
          donorName={org.name}
          charity={accountFor.charity}
          row={accountFor.row}
          onClose={() => setAccountFor(null)}
          onSaved={() => {
            setAccountFor(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

/**
 * حسابُ جمعيةٍ عند جهة.
 *
 * وكلمةُ المرور تُعرض نصّاً في الحقل لا نقاطاً: من يفتح هذه اللوحة يُحرِّرها،
 * ومن حرَّر سِرّاً لا يراه كتبه مرّتين.
 */
function AccountSheet({
  donorOrgId,
  donorName,
  charity,
  row,
  onClose,
  onSaved,
}: {
  donorOrgId: string;
  donorName: string;
  charity: Charity;
  row: DonorAccountRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(row?.username ?? "");
  const [password, setPassword] = useState(row?.password ?? "");
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    void (async () => {
      const res = await saveDonorAccount(donorOrgId, charity.id, username, password);
      setBusy(false);
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      notify("ok", row ? "حُفظ الحساب." : "أُضيف الحساب.");
      onSaved();
    })();
  };

  return (
    <Sheet
      title={row ? `حساب ${charity.name}` : `إضافة حساب ${charity.name}`}
      subtitle={`عند ${donorName}`}
      onClose={onClose}
      onSubmit={save}
      busy={busy}
      footer={
        <>
          <button type="submit" disabled={busy} className={btn.primary}>
            حفظ
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={btn.ghost}>
            إلغاء
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">اسم المستخدم</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required dir="ltr" className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">كلمة المرور</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" className={field} />
        </label>
        <p className="text-meta leading-5 text-slate-500 dark:text-slate-400">
          تُخزَّن كلمةُ المرور مشفَّرةً في القاعدة، وتُعرض في الجدول مُغطّاةً حتى تُكشف. ولا تُكتب في سجلّ
          التغييرات.
        </p>
      </div>
    </Sheet>
  );
}

/**
 * مجالاتُ المنح: تُضاف واحداً واحداً، وتُقرأ في بوّابة الجمعية.
 *
 * **ولمَ صفوفٌ لا نصّ**: كان المجالُ جملةً في ملف الجهة تُقرأ ولا تُستعمل.
 * وبوّابةُ الجمعية تعرض تحت كلِّ مجالٍ مشاريعَها المقترحة فيه، ولا يُعلَّق
 * مشروعٌ على سطرٍ من نصّ.
 *
 * **والنصُّ القديم يبقى معروضاً حتى يُنقل**: فيه ما كُتب لهذه الجهة، ونقلُه
 * بزرٍّ يُقطّعه أسطراً وفواصلَ — ثم يُصحَّح ما قُطِّع خطأً ويُحذف، والأصلُ
 * أمام القارئ لا يُمحى.
 */
function GrantFieldsCard({
  org,
  fields,
  onDone,
}: {
  org: DonorRow;
  fields: DonorFieldRow[];
  onDone: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<DonorFieldRow | null>(null);
  const [busy, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        notify("error", res.error ?? "تعذّرت العملية");
        return;
      }
      done?.();
      onDone();
    });

  const reset = () => {
    setAdding(false);
    setEditing(null);
    setName("");
    setDescription("");
  };

  const submit = () => {
    if (editing) {
      run(() => updateDonorField(editing.id, name, description), reset);
      return;
    }
    run(() => addDonorField(org.id, name, description), reset);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-section font-semibold tracking-tight">
            <Layers className="size-4 text-primary dark:text-teal-300" />
            مجالات المنح
          </h2>
          <p className="mt-0.5 text-body text-slate-500 dark:text-slate-400">
            تظهر للجمعيات في بوابتها، وترفع تحت كل مجال مشاريعها المقترحة.
          </p>
        </div>
        {!adding && !editing && (
          <button type="button" onClick={() => setAdding(true)} className={btn.secondary}>
            <Plus className="size-4" /> إضافة مجال
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3 dark:border-teal-400/15 dark:bg-teal-400/[0.04]">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المجال — مثال: التعليم"
              className={field}
              autoFocus
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المجال (اختياري)"
              className={field}
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={!name.trim() || busy} onClick={submit} className={btn.primary}>
              {editing ? "حفظ" : "إضافة"}
            </button>
            <button type="button" onClick={reset} disabled={busy} className={btn.secondary}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {fields.length === 0 ? (
        <div className={tableFrameClass}>
          <EmptyState
            icon={<Layers className="size-4" />}
            title="لا مجالات مضافة"
            description="أضف مجالا ليظهر للجمعيات، وترفع تحته مشاريعها المقترحة."
          />
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {fields.map((f, index) => (
            <li key={f.id} className="flex items-start gap-3 bg-white px-3 py-2.5 dark:bg-slate-900">
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-slate-900 dark:text-slate-100">{f.name}</p>
                {f.description && (
                  <p className="mt-0.5 text-caption leading-5 text-slate-500 dark:text-slate-400">{f.description}</p>
                )}
                {/* ما اقترحته الجمعياتُ تحت هذا المجال من بوّابتها. */}
                {/* المقترحاتُ خبرٌ قادمٌ من جهةٍ أخرى — من الجمعية في بوّابتها —
                    فتُفصل عن وصف المجال بإطارٍ وشارةِ صاحبها، ولا تُقرأ ذيلاً له. */}
                {f.proposals.length > 0 && (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="mb-1.5 text-meta font-semibold text-slate-500 dark:text-slate-400">
                      مشاريع مقترحة من الجمعيات ({f.proposals.length})
                    </p>
                    <ul className="space-y-1.5">
                      {f.proposals.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge tone="neutral">{p.charityName}</Badge>
                          <span className="text-caption text-slate-700 dark:text-slate-200">{p.name}</span>
                          <span className="text-meta text-slate-400">
                            {p.fromPlan ? "من الخطة التشغيلية" : "من خارج الخطة"} · {p.createdAt}
                          </span>
                          {p.note && (
                            <span className="w-full text-meta text-slate-400">{p.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => run(() => moveDonorField(f.id, "up"))}
                    disabled={busy}
                    aria-label="أعلى"
                    className={btn.icon}
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                )}
                {index < fields.length - 1 && (
                  <button
                    type="button"
                    onClick={() => run(() => moveDonorField(f.id, "down"))}
                    disabled={busy}
                    aria-label="أسفل"
                    className={btn.icon}
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(f);
                    setAdding(false);
                    setName(f.name);
                    setDescription(f.description ?? "");
                  }}
                  disabled={busy}
                  aria-label="تعديل"
                  className={btn.icon}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      await confirmAction({
                        title: `حذف مجال «${f.name}»؟`,
                        message: "تبقى المشاريع المقترحة فيه محفوظة عند الجمعية، ولكن لا يظهر لها المجال.",
                        confirmLabel: "حذف",
                        tone: "danger",
                      })
                    ) {
                      run(() => deleteDonorField(f.id));
                    }
                  }}
                  disabled={busy}
                  aria-label="حذف"
                  className={cx(btn.icon, "text-rose-500 hover:text-rose-600")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* النصُّ القديم: يُعرض كما كُتب، ويُنقل بزرٍّ لا بهجرةٍ تُخمِّن. */}
      {org.fields && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="min-w-0 flex-1 text-caption leading-5 text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-300">النص القديم:</span> {org.fields}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => importLegacyDonorFields(org.id))}
            className={btn.secondary}
          >
            <Wand2 className="size-4" /> نقل الأسطر إلى مجالات
          </button>
        </div>
      )}
    </section>
  );
}
