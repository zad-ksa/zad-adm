"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCharitySection } from "@/lib/sectionGuard";
import { logAudit } from "@/lib/auditLog";
import {
  ALL_RATING_IDS,
  CAUSES,
  CAUSE_OTHER,
  OUTLOOK_OPTIONS,
  PACE_OPTIONS,
  ROLES,
  TASK_STATUSES,
  TOP_CAUSES_MAX,
  parseProgress,
} from "@/lib/planSurvey";

/**
 * أفعالُ استبانة الخطة التشغيلية.
 *
 * وحارسُ صفحةِ الموظف `manage_strategy` في جمعيةٍ مسنَدة — هي الصلاحيةُ التي
 * تفتح الخطة التشغيلية نفسها. وأمّا **الإرسال** فبلا جلسة: المستجيبُ موظفٌ في
 * الجمعية لا مستخدمٌ في الموقع، وحارسُه الرمزُ في الرابط وحالةُ الاستبانة.
 */
type Result = { ok: true } | { ok: false; error: string };

/** رمزُ رابطٍ لا يُخمَّن: ٢٤ حرفاً من ١٦ بايتاً. */
const newToken = () => randomBytes(16).toString("base64url");

/**
 * يُنشئ استبانةَ الجمعية إن لم تكن، ويُرجعها.
 *
 * والإنشاءُ عند أول فتحٍ للصفحة لا بزرٍّ منفصل: الاستبانةُ ليست قراراً يُتَّخذ
 * بل رابطٌ للخطة القائمة، وزرُّ «أنشئ استبانة» سؤالٌ لا جواب له إلا «نعم».
 */
export async function ensurePlanSurvey(charityName: string) {
  await requireCharitySection("manage_strategy", charityName);

  const charity = await prisma.charity.findUnique({ where: { name: charityName }, select: { id: true } });
  if (!charity) return null;

  const existing = await prisma.planSurvey.findUnique({
    where: { charityId: charity.id },
    select: { id: true, token: true, isOpen: true },
  });
  if (existing) return existing;

  return prisma.planSurvey.create({
    data: { charityId: charity.id, token: newToken() },
    select: { id: true, token: true, isOpen: true },
  });
}

export async function setPlanSurveyOpen(charityName: string, isOpen: boolean): Promise<Result> {
  const session = await requireCharitySection("manage_strategy", charityName);
  const charity = await prisma.charity.findUnique({ where: { name: charityName }, select: { id: true } });
  if (!charity) return { ok: false, error: "الجمعية غير موجودة" };

  try {
    await prisma.planSurvey.update({ where: { charityId: charity.id }, data: { isOpen } });
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: isOpen ? "OPEN" : "CLOSE",
      targetType: "PlanSurvey",
      targetId: charity.id,
      metadata: { charity: charityName },
    });
    revalidatePath(`/main/strategy/${encodeURIComponent(charityName)}/operational/survey`);
    return { ok: true };
  } catch (error) {
    console.error("Error toggling plan survey:", error);
    return { ok: false, error: "تعذّر تغيير حالة الرابط" };
  }
}

/**
 * رمزٌ جديدٌ للرابط.
 *
 * ويُبطِل القديمَ ولا يحذف ما جُمع: الرابطُ يُستبدل حين يُنشر في غير موضعه،
 * والأجوبةُ المجموعةُ ليست ذنبَ الرابط.
 */
export async function rotatePlanSurveyToken(charityName: string): Promise<Result> {
  const session = await requireCharitySection("manage_strategy", charityName);
  const charity = await prisma.charity.findUnique({ where: { name: charityName }, select: { id: true } });
  if (!charity) return { ok: false, error: "الجمعية غير موجودة" };

  try {
    await prisma.planSurvey.update({ where: { charityId: charity.id }, data: { token: newToken() } });
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ROTATE_TOKEN",
      targetType: "PlanSurvey",
      targetId: charity.id,
      metadata: { charity: charityName },
    });
    revalidatePath(`/main/strategy/${encodeURIComponent(charityName)}/operational/survey`);
    return { ok: true };
  } catch (error) {
    console.error("Error rotating plan survey token:", error);
    return { ok: false, error: "تعذّر تجديد الرابط" };
  }
}

export async function deletePlanSurveyResponse(charityName: string, responseId: string): Promise<Result> {
  const session = await requireCharitySection("manage_strategy", charityName);
  const charity = await prisma.charity.findUnique({ where: { name: charityName }, select: { id: true } });
  if (!charity) return { ok: false, error: "الجمعية غير موجودة" };

  try {
    // الحذفُ مقصورٌ على استبانة هذه الجمعية: معرّفٌ من صفحةٍ أخرى لا يُحذف
    // من هنا.
    const deleted = await prisma.planSurveyResponse.deleteMany({
      where: { id: responseId, survey: { charityId: charity.id } },
    });
    if (deleted.count === 0) return { ok: false, error: "الإجابة غير موجودة" };

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "PlanSurveyResponse",
      targetId: responseId,
      metadata: { charity: charityName },
    });
    revalidatePath(`/main/strategy/${encodeURIComponent(charityName)}/operational/survey`);
    return { ok: true };
  } catch (error) {
    console.error("Error deleting plan survey response:", error);
    return { ok: false, error: "تعذّر الحذف" };
  }
}

// ── الإرسال العامّ ──────────────────────────────────────────────────────────

export type TaskRow = {
  stepId: string | null;
  initiativeName: string;
  taskTitle: string;
  plannedEnd: string | null;
  status: string;
  progress: number | null;
  expectedEnd: string | null;
};

export type BlockerRow = {
  subject: string;
  description: string;
  cause: string;
  solution: string;
  proposedEnd: string | null;
};

export type SubmitInput = {
  token: string;
  department: string;
  role: string;
  initiativeIds: string[];
  extraInitiatives: string[];
  ratings: Record<string, number>;
  tasks: TaskRow[];
  pace: string;
  causes: string[];
  causeOther: string | null;
  topCauses: string[];
  blockers: BlockerRow[];
  outlook: string;
  achievements: string | null;
  neededAction: string | null;
  suggestions: string | null;
};

const text = (v: unknown, max = 2000) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  allowed.includes(String(value ?? "") as T) ? (String(value) as T) : null;

/**
 * إرسالُ إجابة — بلا جلسة، وحارسُه الرمزُ وحالةُ الاستبانة.
 *
 * **ويُتحقَّق من كل حقلٍ على الخادم** لا في المتصفّح وحده: الفعلُ مدخلُ HTTP
 * قائمٌ بذاته، ومن نادى عليه مباشرةً لم يمرّ بنموذجٍ يتحقّق. والقيمُ المحدودة
 * تُطابق قوائمَها، والمبادراتُ تُطابق مبادراتِ هذه الجمعية، والخطواتُ خطواتِ
 * تلك المبادرات.
 */
export async function submitPlanSurvey(input: SubmitInput): Promise<Result> {
  const token = String(input?.token ?? "").trim();
  if (!token) return { ok: false, error: "رابطٌ غير صالح" };

  const survey = await prisma.planSurvey.findUnique({
    where: { token },
    select: { id: true, isOpen: true, charityId: true },
  });
  if (!survey) return { ok: false, error: "رابطٌ غير صالح" };
  if (!survey.isOpen) return { ok: false, error: "الاستبانة مغلقة" };

  const department = text(input.department, 160);
  if (!department) return { ok: false, error: "اختر الإدارة" };

  const role = oneOf(input.role, ROLES);
  if (!role) return { ok: false, error: "اختر دورك في الخطة" };

  const pace = oneOf(input.pace, PACE_OPTIONS);
  if (!pace) return { ok: false, error: "اختر وصفَ سير التنفيذ" };

  const outlook = oneOf(input.outlook, OUTLOOK_OPTIONS);
  if (!outlook) return { ok: false, error: "اختر توقّعك لإنجاز المهام" };

  // التقييمات: ما كان مفتاحُه عبارةً معلومةً ودرجتُه بين ١ و٥.
  const ratings: Record<string, number> = {};
  for (const id of ALL_RATING_IDS) {
    const value = Number(input.ratings?.[String(id)]);
    if (Number.isInteger(value) && value >= 1 && value <= 5) ratings[String(id)] = value;
  }
  if (Object.keys(ratings).length !== ALL_RATING_IDS.length) {
    return { ok: false, error: "أكمِل تقييم العبارات كلّها" };
  }

  // المبادرات: من مبادرات هذه الجمعية وحدها.
  const planInitiatives = await prisma.initiative.findMany({
    where: { plan: { charityId: survey.charityId } },
    select: { id: true, name: true, steps: { select: { id: true, title: true } } },
  });
  const byId = new Map(planInitiatives.map((i) => [i.id, i]));
  const initiativeIds = [...new Set((input.initiativeIds ?? []).filter((id) => byId.has(id)))];
  const extraInitiatives = [...new Set((input.extraInitiatives ?? []).map((n) => text(n, 200)).filter(Boolean))] as string[];
  if (initiativeIds.length === 0 && extraInitiatives.length === 0) {
    return { ok: false, error: "اختر مبادرةً واحدةً على الأقل" };
  }

  // الخطوات: خطواتُ المبادرات المختارة وحدها.
  const allowedSteps = new Map(
    initiativeIds.flatMap((id) => (byId.get(id)?.steps ?? []).map((s) => [s.id, s.title] as const))
  );
  const tasks: TaskRow[] = [];
  for (const row of input.tasks ?? []) {
    const status = oneOf(row?.status, TASK_STATUSES);
    const title = text(row?.taskTitle, 400);
    if (!status || !title) continue;
    const stepId = row?.stepId && allowedSteps.has(row.stepId) ? row.stepId : null;
    tasks.push({
      stepId,
      initiativeName: text(row?.initiativeName, 200) ?? "",
      taskTitle: title,
      plannedEnd: text(row?.plannedEnd, 10),
      status,
      progress: parseProgress(row?.progress),
      expectedEnd: text(row?.expectedEnd, 10),
    });
  }

  const causes = [...new Set((input.causes ?? []).filter((c) => (CAUSES as readonly string[]).includes(c) || c === CAUSE_OTHER))];
  const causeOther = causes.includes(CAUSE_OTHER) ? text(input.causeOther, 400) : null;
  const topCauses = [...new Set((input.topCauses ?? []).filter((c) => causes.includes(c)))].slice(0, TOP_CAUSES_MAX);

  const blockers: BlockerRow[] = [];
  for (const row of input.blockers ?? []) {
    const subject = text(row?.subject, 300);
    const description = text(row?.description, 1200);
    if (!subject && !description) continue;
    blockers.push({
      subject: subject ?? "",
      description: description ?? "",
      cause: text(row?.cause, 600) ?? "",
      solution: text(row?.solution, 1200) ?? "",
      proposedEnd: text(row?.proposedEnd, 10),
    });
  }

  try {
    await prisma.planSurveyResponse.create({
      data: {
        surveyId: survey.id,
        department,
        role,
        initiativeIds,
        extraInitiatives,
        ratings,
        tasks,
        pace,
        causes,
        causeOther,
        topCauses,
        blockers,
        outlook,
        achievements: text(input.achievements, 4000),
        neededAction: text(input.neededAction, 4000),
        suggestions: text(input.suggestions, 4000),
      },
    });
    return { ok: true };
  } catch (error) {
    console.error("Error submitting plan survey:", error);
    return { ok: false, error: "تعذّر إرسال الإجابة" };
  }
}
