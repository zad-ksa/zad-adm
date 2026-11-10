import type { Prisma } from "@prisma/client";
import { hasPermission } from "./permissions.ts";

/**
 * نطاقُ «الاستبيانات المخصصة»: ما يراه الموظف منها وما يُحرّره.
 *
 * درجتان:
 * - `manage_surveys`: الاستبياناتُ كلُّها — إنشاءً وتحريراً وحذفاً وقراءةَ ردود.
 * - `manage_own_surveys`: **ما أنشأه حاملُها وحدَه** — يراه ويحرّره ويقرأ ردوده،
 *   ولا يرى غيره ولا يُحرّكه. والأولى تحمل الثانيةَ (`IMPLIES`)، فلا تُمنحان
 *   معاً بيد أحد، ولا يُفحص في الكود إلا الأدنى حيث يكفي أيُّهما.
 *
 * **والاستبياناتُ التي أُنشئت قبل عمود المالك لا مالكَ لها**، فلا يراها إلا من
 * يرى الجميع. وهو الصواب: من حمل «ما أنشأه وحده» لم يُنشئ شيئاً بعد.
 *
 * وحسابُ الجمعية (`CHARITY_USER`) خارجُ هذا كلِّه — المستجيبُ يصل إلى
 * الاستبيان برابطه لا بصلاحية.
 *
 * وليس ملف "use server": تستدعيه المسارات المحروسة، ولو صُدّر من ملف أفعال
 * لصار مدخلاً HTTP بلا حارس.
 */

export type SurveySession = {
  id: string;
  role: string;
  permissions?: string[];
  userType?: string;
};

export type SurveyScope = {
  /** يرى التبويب وشيئاً من الاستبيانات. */
  canView: boolean;
  /** يرى استبياناتِ الجميع ويُحرّرها. */
  seesAll: boolean;
  /** صاحبُ الجلسة — مالكُ ما يُنشئه. */
  employeeId: string | null;
};

const CLOSED: SurveyScope = { canView: false, seesAll: false, employeeId: null };

export function getSurveyScope(session: SurveySession | null | undefined): SurveyScope {
  if (!session?.id || session.userType === "CHARITY_USER") return CLOSED;
  const perms = session.permissions || [];
  // الأدنى وحدَه يُفحص: `hasPermission` يُطبّق IMPLIES، فحاملُ «الجميع» يمرّ به.
  const canView = hasPermission(session.role, perms, "manage_own_surveys");
  if (!canView) return CLOSED;
  return {
    canView: true,
    seesAll: hasPermission(session.role, perms, "manage_surveys"),
    employeeId: session.id,
  };
}

/**
 * شرطُ الاستبيانات التي يراها — يُضمّ إلى `where` في الاستعلام.
 *
 * ولا يُستعمل مع نطاقٍ مغلق: `canView` يُفحص قبله، فإن مرّ مغلقٌ هنا كان
 * الشرطُ مُعرِّفاً لا يُطابق شيئاً بدل أن يكون شرطاً فارغاً يُطابق الكلّ —
 * فخطأُ النسيان يُغلق ولا يفتح.
 */
export function surveyScopeWhere(scope: SurveyScope): Prisma.CustomSurveyWhereInput {
  // مُعرِّفٌ لا يُشبه UUID، فلا يُطابق صفّاً.
  if (!scope.canView) return { createdById: "__none__" };
  if (scope.seesAll) return {};
  return { createdById: scope.employeeId };
}

/** هل يملك هذا الاستبيانَ بعينه: يراه ويُحرّره ويقرأ ردوده؟ */
export function maySeeSurvey(scope: SurveyScope, createdById: string | null | undefined): boolean {
  if (!scope.canView) return false;
  if (scope.seesAll) return true;
  return !!createdById && createdById === scope.employeeId;
}
