import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader, StatStrip } from "@/components/console/layout";
import { SectionHeader, card, cx } from "@/components/console/ui";

/**
 * مركَّباتُ قسم الموارد البشرية — وكلُّها اليوم من عُدّة اللوحة.
 *
 * **وكان هنا نظامُ تصميمٍ ثانٍ كامل**: سلّمُ خطٍّ بـ`clamp()` من سبع درجات،
 * وشبكةُ مسافاتٍ من ستّ خطوات، وأسطحُ تدرّجٍ رأسيّ، وظلالٌ ملوَّنةٌ بحلقاتٍ
 * داخلية، وزرٌّ بتدرّجٍ من ثلاث محطّات — موصوفٌ كلُّه في `.hr-ui` في
 * `globals.css`. فكان القسمُ يُقرأ كأنّه موقعٌ آخر داخل الموقع.
 *
 * **وما بقي هنا أسماءٌ لا تصميم**: كلُّ ما تحت نداءٌ لعنصرٍ من العدّة بأسماء
 * هذا القسم، لئلّا تُمسّ أربعُ مئةِ موضعٍ في ثلاثَ عشرةَ شاشةً دفعةً واحدة.
 * وهي مرشَّحةٌ للذوبان في العدّة شاشةً شاشة.
 */

export function HrCard({
  children,
  className = "",
  interactive = false,
  sunk = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  /** سطحٌ غائر — صار خلفيّةً هادئةً لا تدرّجاً رأسيّاً. */
  sunk?: boolean;
}) {
  return (
    <div
      className={cx(
        interactive ? card.interactive : card.static,
        sunk && "bg-slate-50/70 dark:bg-slate-950/40",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * ترويسةُ الصفحة — `PageHeader` من العدّة.
 *
 * و`eyebrow` كان سطراً فوق العنوان يقول القسم؛ وهو في العدّة حلقةُ مسار:
 * «الموارد البشرية / الموظفون» تقول ما كان يقوله السطر وتعود به.
 */
export function HrPageHeader({
  icon: Icon,
  eyebrow,
  title,
  context,
  actions,
  href,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  context: string;
  actions?: ReactNode;
  /** مسارُ صفحة القسم الأولى — تُجعل حلقةُ المسار قابلةً للنقر. */
  href?: string;
}) {
  return (
    <PageHeader
      crumbs={[{ label: eyebrow, href }, { label: title }]}
      icon={<Icon className="size-6" />}
      title={title}
      description={context}
      actions={actions}
    />
  );
}

/** عنوانُ قسمٍ داخل بطاقة — `SectionHeader` من العدّة. */
export function SectionHead({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <SectionHeader
      icon={Icon ? <Icon className="size-4" /> : undefined}
      title={title}
      description={hint}
      action={action}
    />
  );
}

/**
 * رقمٌ واحدٌ في بطاقة — `StatStrip` من العدّة بعنصرٍ واحد.
 *
 * وشريطُ العدّة يرسم عدّةَ أرقامٍ في شبكةٍ واحدة، وهذه تُنادى مفردةً داخل
 * شبكاتِ الشاشات القائمة — حتى تُجمع تلك الشبكاتُ في شريطٍ واحد.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "primary" | "warn" | "danger";
}) {
  const dot =
    tone === "warn" ? "warn" : tone === "danger" ? "danger" : tone === "primary" ? "active" : undefined;
  return <StatStrip label={label} items={[{ label, value, hint, dot }]} />;
}

/** حقلٌ بتسميته — تسميةٌ فوق، وتلميحٌ تحت. */
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block space-y-1.5", className)}>
      <span className="block text-body font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="block text-meta text-slate-500">{hint}</span>}
    </label>
  );
}
