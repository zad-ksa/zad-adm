import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  CalendarOff,
  Megaphone,
  Palette,
  Phone,
  Scale,
} from "lucide-react";
import { Badge, MONO, card, cx } from "@/components/console/ui";
import { EmptyState } from "@/components/console/layout";
import { SERVICE_STATE_LABEL } from "@/lib/serviceStages";
import {
  AGENDA_LABEL,
  isToday,
  upcoming,
  visibleTasks,
  whenLabel,
  type AgendaItem,
  type HomeTask,
} from "@/lib/portalHome";
import type { HomeContact, HomeService } from "@/lib/portalHomeData";

/**
 * كتلُ رئيسية البوّابة — معروضةٌ لا أكثر، فلا حالَ فيها ولا فعل.
 *
 * وكلُّها خادميّة: الرئيسيةُ أوّلُ ما يُفتح، وما لا يحتاج جافاسكربت في
 * المتصفّح لا يُرسل إليه.
 */

const TASK_TONE = { danger: "danger", warn: "warn", brand: "brand" } as const;

/** ما ينتظر العضوَ الآن — أوّلُ ما يُقرأ في الصفحة. */
export function WaitingOnYou({ tasks }: { tasks: HomeTask[] }) {
  const rows = visibleTasks(tasks);

  if (rows.length === 0) {
    return (
      <section className={cx(card.static, "p-5")}>
        <h2 className="text-section font-semibold tracking-tight">بانتظارك</h2>
        <p className="mt-1 text-body text-slate-500 dark:text-slate-400">
          لا شيء ينتظر ردك اليوم. وما يستجد يظهر هنا أولا.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-section font-semibold tracking-tight">بانتظارك</h2>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={row.href}
              className={cx(
                card.interactive,
                "flex items-center gap-3 p-4",
                row.tone === "danger" && "border-red-200 dark:border-red-500/25"
              )}
            >
              <span className={cx(MONO, "text-stat font-semibold text-slate-900 dark:text-slate-100")}>
                {row.count}
              </span>
              <span className="min-w-0 flex-1 text-body text-slate-600 dark:text-slate-300">
                {row.label}
              </span>
              <Badge tone={TASK_TONE[row.tone]}>افتح</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** أين بلغت خدماتُ الجمعية — ثلاثٌ وما بعدها في صفحة الخدمات. */
export function ServicesStrip({ services, base }: { services: HomeService[]; base: string }) {
  if (services.length === 0) return null;
  const shown = services.slice(0, 3);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-section font-semibold tracking-tight">أين وصلت خدماتك</h2>
        <Link href={`${base}/services`} className="text-meta font-medium text-primary hover:underline dark:text-teal-300">
          كل الخدمات ←
        </Link>
      </div>

      <ul className="grid gap-3 md:grid-cols-3">
        {shown.map((service) => (
          <li key={service.id} className={cx(card.static, "space-y-2 p-4")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 text-title font-semibold text-slate-900 dark:text-slate-100">
                {service.name}
              </h3>
              <Badge tone={service.state === "DONE" ? "good" : service.state === "SOON" ? "warn" : "brand"}>
                {SERVICE_STATE_LABEL[service.state]}
              </Badge>
            </div>

            {service.stageName ? (
              <>
                <p className="text-body text-slate-600 dark:text-slate-300">{service.stageName}</p>
                {service.stepName && (
                  <p className="text-meta text-slate-500 dark:text-slate-400">{service.stepName}</p>
                )}
                {service.total > 0 && (
                  <>
                    <div className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-primary dark:bg-teal-400"
                        style={{ width: `${service.percent}%` }}
                      />
                    </div>
                    <p className={cx(MONO, "text-meta text-slate-400")}>
                      {service.done} من {service.total} مراحل
                    </p>
                  </>
                )}
              </>
            ) : (
              <p className="text-body text-slate-400">لا مراحل مسجلة بعد</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const AGENDA_ICON = {
  DESIGN: Palette,
  DONOR: Scale,
  MEDIA: Megaphone,
  HOLIDAY: CalendarOff,
} as const;

/** مواعيدُ الأيام السبعة القادمة من الأقسام كلِّها في سطرٍ واحد. */
export function WeekAhead({ items, nowMs }: { items: AgendaItem[]; nowMs: number }) {
  const rows = upcoming(items, nowMs);

  return (
    <section className="space-y-3">
      <h2 className="text-section font-semibold tracking-tight">هذا الأسبوع</h2>
      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-4" />}
          title="لا مواعيد في الأيام القادمة"
          description="تسليمات التصاميم ومواعيد الجهات والمنشورات المجدولة تظهر هنا."
        />
      ) : (
        <ul className={cx(card.static, "divide-y divide-slate-100 dark:divide-slate-800")}>
          {rows.map((item) => {
            const Icon = AGENDA_ICON[item.kind];
            const today = isToday(item.atMs, nowMs);
            const body = (
              <>
                <Icon aria-hidden className="size-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-slate-800 dark:text-slate-200">
                    {item.title}
                  </span>
                  <span className="block text-meta text-slate-400">{AGENDA_LABEL[item.kind]}</span>
                </span>
                <span
                  className={cx(
                    "shrink-0 text-meta font-medium",
                    today ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {whenLabel(item.atMs, nowMs)}
                </span>
              </>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    {body}
                  </Link>
                ) : (
                  <span className="flex items-center gap-3 px-4 py-2.5">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** فريقُ زادٍ المسؤولُ عن أركان الجمعية — مسجَّلٌ عند زادٍ ولم يكن يُعرض. */
export function ZadContacts({ contacts }: { contacts: HomeContact[] }) {
  if (contacts.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-section font-semibold tracking-tight">فريقك في زاد</h2>
      <ul className="grid gap-2 sm:grid-cols-3">
        {contacts.map((contact) => (
          <li key={contact.role} className={cx(card.static, "p-4")}>
            <p className="text-caption text-slate-400">{contact.role}</p>
            <p className="mt-0.5 text-title font-semibold text-slate-900 dark:text-slate-100">
              {contact.name}
            </p>
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className={cx(MONO, "mt-1 inline-flex items-center gap-1.5 text-meta text-primary hover:underline dark:text-teal-300")}
                dir="ltr"
              >
                <Phone aria-hidden className="size-3.5" />
                {contact.phone}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** بطاقةُ خدمةٍ فارغةٍ حين لا خدمةَ مسندة — لئلا يُقرأ القسمُ خطأً. */
export function NoServices({ base }: { base: string }) {
  return (
    <EmptyState
      icon={<Briefcase className="size-4" />}
      title="لا خدمات مسندة بعد"
      description="ما تسنده زاد لجمعيتك يظهر هنا بمراحله."
      action={
        <Link href={`${base}/services`} className="text-meta font-medium text-primary hover:underline">
          صفحة الخدمات
        </Link>
      }
    />
  );
}
