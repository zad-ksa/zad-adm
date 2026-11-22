/**
 * قراءةُ مراحل الخدمة: أين بلغت، وكم بقي، وما حالُها.
 *
 * **والمرحلتان نوعان**: متتابعةٌ لها ترتيبٌ وتنتهي، ودائمةٌ (`isContinuous`)
 * تعمل ولا تنتهي — خدمةُ استشارةٍ تُقدَّم طول السنة. فلا تدخل الدائمةُ في
 * حساب التقدّم: نسبةُ إنجازٍ على ما لا ينتهي خبرٌ كاذب.
 *
 * **ولمَ المنطقُ هنا لا في الشاشة**: ثلاثُ شاشاتٍ كانت تحسب «المرحلة
 * الحالية» كلٌّ على حدةٍ بسلسلةِ احتياطات — فاختلفت الشاشتان في الجواب على
 * الخدمة نفسِها.
 */

export type StageStep = {
  id: string;
  name: string;
  isDone?: boolean;
  order: number;
};

export type ServiceStage = {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  isCurrent?: boolean;
  isDone?: boolean;
  isContinuous?: boolean;
  isActive?: boolean;
  isComingSoon?: boolean;
  steps?: StageStep[];
};

export type StageGroups = {
  /** المتتابعةُ مرتَّبةً — هي المسار. */
  sequential: ServiceStage[];
  /** الدائمةُ مرتَّبةً — تعمل بجانب المسار لا فيه. */
  continuous: ServiceStage[];
};

const byOrder = (a: ServiceStage, b: ServiceStage) => a.order - b.order;

export function groupStages(stages: readonly ServiceStage[] = []): StageGroups {
  return {
    sequential: stages.filter((s) => !s.isContinuous).slice().sort(byOrder),
    continuous: stages.filter((s) => s.isContinuous).slice().sort(byOrder),
  };
}

export function sortedSteps(stage: ServiceStage | null | undefined): StageStep[] {
  return (stage?.steps ?? []).slice().sort((a, b) => a.order - b.order);
}

/**
 * «قريباً»: مرحلةٌ مُعلَّمةٌ بذلك، أو اسمُها يقوله.
 *
 * والاسمُ يُقرأ لأنّ العَلَم حديثٌ وأكثرُ الصفوف كُتبت قبله — «التخطيط
 * (قريباً)» مكتوبةٌ في القاعدة بلا علَم.
 */
export function isComingSoon(stage: ServiceStage | null | undefined): boolean {
  if (!stage) return false;
  return stage.isComingSoon === true || stage.name.includes("قريب");
}

/**
 * المرحلةُ التي عندها الخدمةُ الآن.
 *
 * والترتيبُ: ما عُلِّم `isCurrent`، فإن لم يكن فأوّلُ ما لم يُنجَز، فإن أُنجِز
 * الكلُّ فآخرُها — فالخدمةُ المنتهيةُ تقف عند آخر مراحلها لا عند لا شيء.
 */
export function currentStage(stages: readonly ServiceStage[] = []): ServiceStage | null {
  const { sequential } = groupStages(stages);
  if (sequential.length === 0) return null;
  return (
    sequential.find((s) => s.isCurrent) ??
    sequential.find((s) => !s.isDone) ??
    sequential[sequential.length - 1]
  );
}

/** الخطوةُ التي عندها المرحلةُ الحالية — أوّلُ ما لم يُنجَز منها. */
export function currentStep(stages: readonly ServiceStage[] = []): StageStep | null {
  const stage = currentStage(stages);
  if (!stage || stage.isDone) return null;
  return sortedSteps(stage).find((s) => !s.isDone) ?? null;
}

export type ServiceProgress = {
  done: number;
  total: number;
  percent: number;
  /** رقمُ المرحلة الحالية من واحد — صفرٌ إن لم يكن للخدمة مسار. */
  at: number;
};

/**
 * تقدّمُ الخدمة في مسارها المتتابع.
 *
 * **والمُنجَزُ ما قبل الحالية ومعها إن أُنجزت**: مرحلةٌ جاريةٌ ليست نصفَ
 * إنجاز، والشريطُ يقول ما تمّ لا ما بُدئ.
 */
export function serviceProgress(stages: readonly ServiceStage[] = []): ServiceProgress {
  const { sequential } = groupStages(stages);
  const total = sequential.length;
  if (total === 0) return { done: 0, total: 0, percent: 0, at: 0 };

  const here = currentStage(stages);
  const index = here ? sequential.findIndex((s) => s.id === here.id) : -1;
  const done = sequential.filter((s, i) => s.isDone || (index > -1 && i < index)).length;

  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
    at: index + 1,
  };
}

export type ServiceState = "EMPTY" | "SOON" | "RUNNING" | "DONE";

/**
 * حالُ الخدمة بكلمةٍ واحدة: بلا مسار، أو قريباً، أو جارية، أو منتهية.
 *
 * و«قريباً» تسبق «جارية»: مرحلةٌ لم تُبدأ بعدُ ليست عملاً يجري.
 */
export function serviceState(stages: readonly ServiceStage[] = []): ServiceState {
  const { sequential, continuous } = groupStages(stages);
  if (sequential.length === 0) return continuous.length > 0 ? "RUNNING" : "EMPTY";
  if (isComingSoon(currentStage(stages))) return "SOON";
  const { done, total } = serviceProgress(stages);
  return done >= total ? "DONE" : "RUNNING";
}

/**
 * حالُ خدمةٍ بصفِّها: علَمُ «قريباً» على الخدمة نفسِها يسبق مراحلَها.
 *
 * وزادٌ تُعلِّمه حين تُسند الخدمةُ ولمّا تُبدأ، فلها مراحلُ مرسومةٌ لا يجري
 * منها شيء — وقراءةُ المراحل وحدَها تقول «جارية» وهي لم تُبدأ.
 */
export function serviceStateOf(service: {
  isComingSoon?: boolean;
  stages?: readonly ServiceStage[];
}): ServiceState {
  if (service.isComingSoon) return "SOON";
  return serviceState(service.stages ?? []);
}

export const SERVICE_STATE_LABEL: Record<ServiceState, string> = {
  EMPTY: "بلا مراحل",
  SOON: "قريبا",
  RUNNING: "جارية",
  DONE: "اكتملت",
};
