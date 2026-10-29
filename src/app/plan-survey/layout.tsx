import { consoleFontClass } from "@/components/console/fonts";

/**
 * غلافُ الاستبانة العامّة.
 *
 * خطُّ العُدّة يُطبَّق هنا لا في كل صفحة: الاستبانةُ مبنيّةٌ بعناصر اللوحة،
 * وبغير خطّها تُرسم بخطِّ الواجهة العامّة فتختلف أرقامُها ومقاييسُها عن كل
 * جدولٍ في الموقع.
 */
export default function PlanSurveyLayout({ children }: { children: React.ReactNode }) {
  return <div className={consoleFontClass}>{children}</div>;
}
