# عُدّة لوحات الإدارة (`console`)

اللغة الرسمية لشاشات لوحة زاد. من احتاج زرّاً أو حواراً أو جدولاً فليأخذه من هنا،
ولا يكتبه بيده — **كل عنصرٍ له تطبيقٌ واحد**، وهذا شرط أن يبقى الموقع شاشةً واحدة
لا عشرين شاشة متشابهة.

> القياس الذي أوجب هذه العُدّة: ١٠٤ أزرارٍ مكتوبة يدوياً، و٥٨ ملفاً فيها دائرة
> انتظار مرسومة، و٣١ ملفاً بقائمة `<select>` أصلية، وحوارا تأكيدٍ وتنبيهان
> متوازيان. انظر [تقرير تبويبات لوحة زاد](../../../docs/تقرير-تبويبات-لوحة-زاد.md).

## ما فيها

| الملف | العناصر |
|---|---|
| `ui.tsx` | `btn` · `field` · `Badge` · `Avatar` · `AvatarStack` · `CheckMark` · `IconTile` · `SectionHeader` · `Field` · `OptionRow` · `SelectAll` · `Note` · `NameList` · `Count` · `Dot` · `MONO` · `cx` |
| | **الجديد:** `Spinner` · `Skeleton` · `SkeletonRows` · `MetricCard` · `NavCard` · `RecordCard` |
| `layout.tsx` | `PageHeader` · `StatStrip` · `Tabs` · `Segmented` · `SearchField` · `TableShell` · `Th` · `EmptyState` |
| `overlays.tsx` | `Sheet` · `ConfirmDialog` · `useToast`/`Toast` · `RowMenu` · `MenuItem` · `FooterStatus` |
| `controls.tsx` | `Pagination` |
| `Select.tsx` | `Select` — قائمة منسدلة بصيغتين |
| `fonts.ts` | `consoleFontClass` — Geist للأرقام واللاتيني، Cairo للعربي |

## قواعد

**١. الأحجام بالبكسل صراحةً.** `text-sm` و`text-xs` كلاهما ١١ بكسل في
`globals.css`، فلا تدرّج فيهما. المقاييس المستعملة هنا: ١٢ للتسميات، و١٣ للنصّ
والجداول، و١٥ لعناوين البطاقات، و٢٦ لعنوان الصفحة.

**٢. الزوايا.** `rounded-md` للأزرار والحقول، و`rounded-lg` للأيقونات والقوائم،
و`rounded-xl` للبطاقات والحاويات. ولا `rounded-3xl` في اللوحة — تُترك للواجهة
العامة.

**٣. اللون دلالةٌ لا زينة.** الهوية للتمييز، والذهبي للانتباه، و`good`/`warn`/`bad`
في `MetricCard` و`NavCard` للحالات وحدها. بطاقةٌ بنفسجية لأن التي قبلها خضراء
مرفوضة — هذا ما جعل «الرئيسية» و«لوحة التحكم» تبدوان من مشروعين.

**٤. حلقة التركيز ليست اختيارية.** كل عنصرٍ تفاعليٍّ جديد يحمل
`focus-visible:ring-2 ring-primary/40` — مسألة وصولٍ لا ذوق. وهي مضمّنةٌ في `btn`
و`field` و`NavCard`، فمن استعملها ورثها.

**٥. الاتجاه منطقيٌّ لا يمين/يسار.** `ms/me/ps/pe/start/end` لا `ml/mr/pl/pr`.

**٦. عنوان الصفحة `PageHeader` لا `<h1>` مكتوباً بيده.** كان في أقسام اللوحة
سبعة مقاساتٍ لهذا العنصر نفسه وثلاثة أوزان؛ والمقاس الآن ٢٦ بكسل في كل قسم.
و`crumbs` اختياري — صفحةٌ بلا أبٍ لا يُخترع لها مسار، وصفحةٌ لها أبٌ يُغني
مسارُها عن زرّ عودةٍ منفصل. و`icon` للأيقونة التي يُعرَف بها القسم.

## أنماط جاهزة

**صفحة قائمة:**

```tsx
<PageHeader crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "…" }]} title="…" actions={<button className={btn.primary}>…</button>} />
<StatStrip items={[…]} />
<TableShell empty={<EmptyState … />}>…</TableShell>
<Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onChange={setPage} />
```

**جدولٌ يعمل على الهاتف** — الجدول للشاشة الكبيرة، والبطاقات لما دونها:

```tsx
<div className="hidden sm:block"><TableShell>…</TableShell></div>
<div className="space-y-2 sm:hidden">
  {rows.map((r) => <RecordCard key={r.id} title={r.name} fields={[{ label: "الجوال", value: r.phone }]} />)}
</div>
```

**انتظار:** `SkeletonRows` داخل الجدول، و`Spinner` للأزرار والأفعال القصيرة.

**قائمة منسدلة:** `<Select variant="console" … />` في اللوحة، و`variant="soft"` في
البريد والبوابة حيث الزوايا أوسع.
