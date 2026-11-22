"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Coins, KeyRound } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SearchField,
  SortTh,
  StatStrip,
  TableShellCards,
  Th,
  tableFrameClass,
  tbodyClass,
  tdClass,
  theadRowClass,
  type SortDir,
} from "@/components/console/layout";
import { Badge, MONO, btn, cx } from "@/components/console/ui";
import MultiSelect from "@/components/console/MultiSelect";
import { CopyButton, SecretValue } from "@/components/console/Copy";
import { notify } from "@/components/console/toastBus";
import AccountSheet from "./AccountSheet";
import type { PortalDonorRow } from "@/lib/portalFundraising";

type Column = "name" | "status" | "date" | "grants";

/**
 * جدولُ الجهات المانحة في بوّابة الجمعية.
 *
 * **والتاريخُ عمودٌ واحدٌ لا عمودان**: المفتوحُ يُسأل عن موعد إغلاقه، والمغلقُ
 * عن موعد فتحه — وعمودان أحدُهما فارغٌ دائماً في كلِّ صفٍّ عرضٌ لا خبر.
 *
 * **وكلمةُ المرور تُنسخ قبل أن تُكشف**: الحاجةُ الغالبةُ لصقُها في بوّابة
 * الجهة، وكشفُها على شاشةٍ مفتوحةٍ لا يلزم لذلك — فالنسخُ أوّلاً والكشفُ لمن
 * احتاجه.
 *
 * **والفرزُ بالنقر على الرأس** كشاشات زاد: الرأسُ هو المكانُ الذي يبحث فيه
 * القارئُ عن الفرز، ولا تُكتب له قائمةٌ منسدلةٌ تُنسى عند إضافة عمود.
 */
export default function DonorsClient({
  charityId,
  charityName,
  donors,
}: {
  charityId: string;
  charityName: string;
  donors: PortalDonorRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  // و«لها حساب» مُرشِّحٌ كالبطاقة التي تعدّه: نصفُ الشريط كان تفاعليّاً.
  const [onlyAccount, setOnlyAccount] = useState(false);
  const [pickedTags, setPickedTags] = useState<string[]>([]);
  // والترتيبُ الافتراضيُّ بالحالة والمفتوحُ أوّلاً: السؤالُ الأوّلُ في هذه
  // الصفحة «أين أرفع الآن؟»، لا «أين الجهةُ في المعجم؟».
  const [column, setColumn] = useState<Column>("status");
  const [dir, setDir] = useState<SortDir>("asc");
  const [editing, setEditing] = useState<PortalDonorRow | null>(null);
  const [busy, start] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim();
    const text = (a: string, b: string) => a.localeCompare(b, "ar");
    const rank = (status: string) => (status === "OPEN" ? 0 : 1);
    const sign = dir === "asc" ? 1 : -1;
    const list = donors.filter(
      (d) =>
        (!onlyOpen || d.intakeStatus === "OPEN") &&
        (!onlyAccount || d.username !== null) &&
        (pickedTags.length === 0 || pickedTags.some((t) => d.fieldTags.includes(t))) &&
        // والبحثُ يشمل المجالاتِ والوسوم: السطرُ تحت الاسم يعرضها، ومن
        // بحث عن «تعليم» يريد الجهةَ التي تموّله لا الجهةَ التي تُسمّى به.
        (q === "" ||
          d.name.includes(q) ||
          d.fields.some((f) => f.name.includes(q)) ||
          d.fieldTags.some((t) => t.includes(q)) ||
          (d.legacyFields ?? "").includes(q))
    );
    list.sort((a, b) => {
      switch (column) {
        case "status":
          // بالرتبة لا بالحروف: «CLOSED» يسبق «OPEN» في المعجم، والمقصودُ
          // صاعداً أن يُقدَّم المفتوح.
          return sign * (rank(a.intakeStatus) - rank(b.intakeStatus)) || text(a.name, b.name);
        case "grants":
          return sign * (a.grants - b.grants) || text(a.name, b.name);

        case "date":
          // وبلا موعدٍ تُدفع إلى الآخر في الاتّجاهين: «لا شيء» ليس أقدمَ تاريخ.
          if (!a.nextDate && !b.nextDate) return text(a.name, b.name);
          if (!a.nextDate) return 1;
          if (!b.nextDate) return -1;
          return sign * text(a.nextDate, b.nextDate);
        default:
          return sign * text(a.name, b.name);
      }
    });
    return list;
  }, [donors, query, onlyOpen, onlyAccount, pickedTags, column, dir]);

  const openCount = donors.filter((d) => d.intakeStatus === "OPEN").length;
  const withAccount = donors.filter((d) => d.username).length;
  // ووسومُ الجهات كلِّها مرّةً: مُرشِّحٌ لا يعرض وسماً لا جهةَ له.
  const allTags = useMemo(
    () => [...new Set(donors.flatMap((d) => d.fieldTags))].sort((a, b) => a.localeCompare(b, "ar")),
    [donors]
  );

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        notify("error", res.error ?? "تعذرت العملية");
        return;
      }
      notify("ok", "حُفظ الحساب.");
      setEditing(null);
      router.refresh();
    });

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        icon={<Coins className="size-6" />}
        title="تنمية الموارد المالية"
        description="الجهات المانحة وحسابات جمعيتك عندها، ومجالات المنح في كل جهة."
      />

      {/* الأعدادُ بطاقاتٌ كشاشات زاد لا سطرَ نصٍّ في الوصف: تُمسح بنظرة. */}
      <StatStrip
        items={[
          {
            label: "الجهات المانحة",
            value: donors.length,
            // ونقرةٌ على الكلِّ تمسح المُرشِّحات: مخرجٌ ظاهرٌ من أيِّ تصفية.
            onClick: () => {
              setOnlyOpen(false);
              setOnlyAccount(false);
              setPickedTags([]);
            },
            selected: !onlyOpen && !onlyAccount && pickedTags.length === 0,
          },
          {
            label: "مفتوحة للرفع الآن",
            value: openCount,
            dot: openCount > 0 ? "active" : "muted",
            // والرقمُ يُنقر فيُرشِّح: من قرأ «١٢ مفتوحة» أراد رؤيتَها، فلا
            // يُطلب منه أن يبحث عن زرٍّ ثانٍ يقول ما قاله الرقم.
            onClick: () => setOnlyOpen((v) => !v),
            selected: onlyOpen,
          },
          {
            label: "لها حساب مسجل",
            value: withAccount,
            hint: `من ${donors.length} جهة`,
            onClick: () => setOnlyAccount((v) => !v),
            selected: onlyAccount,
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          label="بحث في الجهات"
          placeholder="ابحث باسم الجهة…"
          className="min-w-56 flex-1"
        />
        {/* ولا زرَّ «المفتوحة فقط»: البطاقةُ أعلاه تفعل الشيءَ نفسَه، ومُرشِّحان
            لشيءٍ واحدٍ في شاشةٍ واحدةٍ يُربكان. ومكانَه مُرشِّحُ الوسوم —
            وهو ثمرةُ الوسوم: كلماتٌ تُقارَن. */}
        {allTags.length > 0 && (
          <MultiSelect
            label="الوسوم"
            placeholder="كل الوسوم"
            allLabel="كل الوسوم"
            countNoun="وسوم"
            values={pickedTags}
            onChange={setPickedTags}
            options={allTags.map((t) => ({ value: t, label: t }))}
          />
        )}
      </div>

      {shown.length === 0 ? (
        <div className={tableFrameClass}>
          <EmptyState
            icon={<Building2 className="size-4" />}
            title="لا جهات تطابق البحث"
            description="امسح البحث أو ألغ تصفية المفتوحة."
          />
        </div>
      ) : (
        <TableShellCards
          footer={
            shown.length === donors.length
              ? `${donors.length} جهة`
              : `${shown.length} من ${donors.length} جهة`
          }
          cards={shown.map((donor) => (
            <div key={donor.id} className="space-y-1.5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/portal/${encodeURIComponent(charityName)}/fundraising/donors/${donor.id}`}
                  className="font-medium text-primary hover:underline dark:text-teal-300"
                >
                  {donor.name}
                </Link>
                <Badge tone={donor.intakeStatus === "OPEN" ? "good" : "neutral"}>
                  {donor.intakeStatus === "OPEN" ? "مفتوح" : "مغلق"}
                </Badge>
                {donor.deadline && (
                  <span
                    className={cx(
                      "text-meta",
                      donor.deadline.tone === "danger"
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : donor.deadline.tone === "warn"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400"
                    )}
                  >
                    {donor.deadline.text}
                  </span>
                )}
              </div>
              {(donor.fields.length > 0 || donor.legacyFields) && (
                <p className="line-clamp-2 text-meta text-slate-500 dark:text-slate-400">
                  {donor.fields.length > 0
                    ? donor.fields.map((f) => f.name).join(" · ")
                    : donor.legacyFields}
                </p>
              )}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-slate-400">
                <span>
                  {donor.username ? (
                    <>
                      الحساب: <span className={cx(MONO, "text-slate-600 dark:text-slate-300")} dir="ltr">{donor.username}</span>
                    </>
                  ) : (
                    "لا حساب مسجل"
                  )}
                </span>
                <span>المرفوع: {donor.grants}</span>
                {donor.proposals > 0 && <span>المقترح: {donor.proposals}</span>}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => setEditing(donor)} className={btn.secondary}>
                  <KeyRound className="size-4" />
                  {donor.username ? "تعديل الحساب" : "إضافة حساب"}
                </button>
                {donor.password && <SecretValue value={donor.password} />}
              </div>
            </div>
          ))}
        >
          <thead>
            <tr className={theadRowClass}>
              <SortTh id="name" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                الجهة
              </SortTh>
              <SortTh id="status" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                الحالة
              </SortTh>
              <SortTh id="date" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                الموعد
              </SortTh>
              {/* الحسابُ عمودٌ واحد: الاسمُ وكلمتُه يُستعملان معاً دائماً ولا
                  يُقارن بهما بين الصفوف، فعمودان يُطيلان الجدول بلا فائدة. */}
              <Th>الحساب</Th>
              <SortTh id="grants" active={column} dir={dir} onSort={(c, d) => { setColumn(c); setDir(d); }}>
                المرفوع
              </SortTh>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {shown.map((donor) => (
              <tr key={donor.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>
                  <Link
                    href={`/portal/${encodeURIComponent(charityName)}/fundraising/donors/${donor.id}`}
                    className="text-primary transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
                  >
                    {donor.name}
                  </Link>
                  {donor.proposals > 0 && (
                    <span className="ms-2 text-meta text-slate-400">{donor.proposals} مشروع مقترح</span>
                  )}
                  {/* ومجالاتُ الجهة سطرٌ تحت اسمها كأنّها وصفُها: الاسمُ وحدَه
                      لا يقول فيمَ تُنفق، وعددٌ مجرَّدٌ لا يقوله أيضاً. وحيث لم
                      تُنقل المجالاتُ إلى صفوفٍ بعدُ يُقرأ نصُّها القديم. */}
                  {donor.fields.length > 0 ? (
                    <p className="mt-0.5 text-meta font-normal leading-5 text-slate-500 dark:text-slate-400">
                      {donor.fields.slice(0, 4).map((f, i) => (
                        <span key={f.id}>
                          {i > 0 && " · "}
                          {/* والرابطُ ينزل على المجال نفسِه في ملفِّ الجهة. */}
                          <Link
                            href={`/portal/${encodeURIComponent(charityName)}/fundraising/donors/${donor.id}#field-${f.id}`}
                            className="transition-colors hover:text-primary hover:underline dark:hover:text-teal-300"
                          >
                            {f.name}
                          </Link>
                        </span>
                      ))}
                      {donor.fields.length > 4 && ` · و${donor.fields.length - 4} غيرها`}
                    </p>
                  ) : donor.legacyFields ? (
                    <p className="mt-0.5 line-clamp-2 text-meta font-normal leading-5 text-slate-400 dark:text-slate-500">
                      {donor.legacyFields}
                    </p>
                  ) : null}
                </td>
                <td className={tdClass}>
                  <Badge tone={donor.intakeStatus === "OPEN" ? "good" : "neutral"}>
                    {donor.intakeStatus === "OPEN" ? "مفتوح" : "مغلق"}
                  </Badge>
                </td>
                <td className={tdClass}>
                  {donor.nextDate ? (
                    <span className="block">
                      <span className={cx(MONO, "text-body text-slate-600 dark:text-slate-300")}>
                        {donor.nextDate}
                      </span>
                      {/* والنسبةُ تحت التاريخ: بها يُرتَّب العملُ، وبالتاريخ
                          يُخطَّط له. واللونُ للقُرب لا للحالة. */}
                      {donor.deadline && (
                        <span
                          className={cx(
                            "mt-0.5 block text-meta",
                            donor.deadline.tone === "danger"
                              ? "font-semibold text-rose-600 dark:text-rose-400"
                              : donor.deadline.tone === "warn"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-400"
                          )}
                        >
                          {donor.deadline.text}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500" title={donor.intakeReason}>
                      بلا موعد معلن
                    </span>
                  )}
                </td>
                <td className={tdClass}>
                  {donor.username ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cx(MONO, "text-body text-slate-700 dark:text-slate-200")} dir="ltr">
                          {donor.username}
                        </span>
                        <CopyButton value={donor.username} title="نسخ اسم المستخدم" />
                      </span>
                      <span className="border-s border-slate-200 ps-2 dark:border-slate-800">
                        {/* ولا زرَّ نسخٍ هنا: `SecretValue` تحمل الكشفَ والنسخَ معاً. */}
                        <SecretValue value={donor.password} />
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">لا حساب</span>
                  )}
                </td>

                <td className={cx(tdClass, MONO, "text-slate-600 dark:text-slate-300")}>
                  {donor.grants > 0 ? (
                    <Link
                      href={`/portal/${encodeURIComponent(charityName)}/fundraising/grants?donor=${donor.id}`}
                      className="text-primary hover:underline dark:text-teal-300"
                    >
                      {donor.grants}
                    </Link>
                  ) : (
                    donor.grants
                  )}
                </td>
                <td className={cx(tdClass, "whitespace-nowrap")}>
                  <button type="button" onClick={() => setEditing(donor)} className={btn.secondary}>
                    <KeyRound className="size-4" />
                    {donor.username ? "تعديل الحساب" : "إضافة حساب"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShellCards>
      )}

      {editing && (
        <AccountSheet
          charityId={charityId}
          donor={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onRun={run}
        />
      )}
    </div>
  );
}
