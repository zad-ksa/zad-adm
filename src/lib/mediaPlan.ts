/**
 * دورةُ المنشور في الخطّة الإعلاميّة — خالصةً، بلا قاعدةٍ ولا شاشة.
 *
 * والدورةُ كما ضبطها صاحبُ الموقع:
 *
 *     زادٌ يضع ──→ [ينتظر الجمعية] ──┬── تعتمد ──────────→ [نهائيّ]
 *                                    └── تعدّل ──→ [ينتظر زاد] ──┬── يعمّد ──→ [نهائيّ]
 *                                                                └── يردّ بسببٍ ──→ [ينتظر الجمعية]
 *
 *     و[نهائيّ] ──→ يعدّله زادٌ **بسبب** ──→ [ينتظر الجمعية] + تنبيهٌ لها.
 *
 * فالنهائيُّ مقفولٌ على الجمعية ومفتوحٌ لزادٍ وحدَه، وكلُّ فتحةٍ منه تُسبَّب
 * وتعود إلى اعتماد الجمعية: لا يُنشر باسم الجمعية ما لم ترَه.
 *
 * **وموضعُ القرار واحدٌ**: `allowedActions` وحدَها تقول من يفعل ماذا ومتى،
 * فتقرؤها الشاشةُ لتعرض، ويقرؤها الحارسُ ليُجيز. وكانت هذه قسمةَ العطب في
 * الاستبيانات: شاشةٌ تُخفي زرّاً وفعلٌ يقبله لمن كتب مسارَه بيده.
 *
 * وبلا `@/` وبامتدادٍ صريحٍ لما يُستورد من `lib`: الاختباراتُ تعمل بـ
 * `node --test` لا بمُحلِّل Next.
 */

export const MEDIA_STATUS = {
  /** وضعه زادٌ، ينتظر اعتماد الجمعية. */
  PENDING_CHARITY: "PENDING_CHARITY",
  /** عدّلته الجمعيةُ، ينتظر تعميد زاد. */
  PENDING_ZAD: "PENDING_ZAD",
  /** نهائيٌّ: مقفولٌ على الجمعية، ولا يفتحه زادٌ إلا بسبب. */
  FINAL: "FINAL",
} as const;

export type MediaStatus = (typeof MEDIA_STATUS)[keyof typeof MEDIA_STATUS];

export const MEDIA_STATUSES: MediaStatus[] = [
  MEDIA_STATUS.PENDING_CHARITY,
  MEDIA_STATUS.PENDING_ZAD,
  MEDIA_STATUS.FINAL,
];

/** الحالةُ كما تُقرأ من القاعدة — ومجهولُها يُعامَل معاملةَ المنتظِر لا النهائيّ. */
export function toStatus(value: unknown): MediaStatus {
  return MEDIA_STATUSES.includes(value as MediaStatus)
    ? (value as MediaStatus)
    : MEDIA_STATUS.PENDING_CHARITY;
}

/** الجهةُ الفاعلة: زادٌ أو الجمعية. */
export type Side = "ZAD" | "CHARITY";

/** وسمُ الحالة لكل جهة: الجمعيةُ تقرأ «ينتظر اعتمادكم»، وزادٌ يقرأ «ينتظر الجمعية». */
export function statusLabel(status: MediaStatus, side: Side): string {
  if (status === MEDIA_STATUS.FINAL) return "معتمدٌ نهائيّاً";
  if (status === MEDIA_STATUS.PENDING_CHARITY) {
    return side === "CHARITY" ? "ينتظر اعتمادكم" : "ينتظر اعتماد الجمعية";
  }
  return side === "ZAD" ? "عُدِّل، ينتظر تعميدَك" : "عُدِّل، ينتظر تعميد زاد";
}

/** اللونُ معنىً لا زينة: كهرمانيٌّ لما ينتظر فعلَ قارئه، وأخضرُ للنهائيّ. */
export type MediaTone = "neutral" | "warn" | "good";

export function statusTone(status: MediaStatus, side: Side): MediaTone {
  if (status === MEDIA_STATUS.FINAL) return "good";
  const waitingOnMe =
    (status === MEDIA_STATUS.PENDING_CHARITY && side === "CHARITY") ||
    (status === MEDIA_STATUS.PENDING_ZAD && side === "ZAD");
  return waitingOnMe ? "warn" : "neutral";
}

/** الأفعالُ على المنشور. */
export type MediaAction =
  /** اعتماد الجمعية لما وضعه زاد. */
  | "APPROVE"
  /** تعديلٌ على المتن أو المنصّات أو الصورة أو الرابط أو الموعد. */
  | "EDIT"
  /** تعميدُ زادٍ لتعديل الجمعية. */
  | "CERTIFY"
  /** ردُّ زادٍ لتعديل الجمعية، واستعادةُ ما كان. */
  | "REJECT"
  | "DELETE";

/**
 * ما يجوز لهذه الجهة في هذه الحالة — ولا جواب غير هذا في الموقع كلِّه.
 *
 * والحذفُ لزادٍ وحدَه، وفي غير النهائيّ: منشورٌ اعتمدته الجمعيةُ ثم اختفى بلا
 * أثرٍ أسوأُ من منشورٍ يُفتح بسببٍ مكتوب.
 */
export function allowedActions(status: MediaStatus, side: Side): MediaAction[] {
  if (side === "CHARITY") {
    // النهائيُّ مقفولٌ عليها، وما ينتظر تعميدَ زادٍ تعديلُها هي — فلا تُعدِّله
    // مرّةً أخرى حتى يُبتَّ فيه، وإلّا فُرِّق الفرقُ الذي يقرؤه زاد.
    return status === MEDIA_STATUS.PENDING_CHARITY ? ["APPROVE", "EDIT"] : [];
  }
  if (status === MEDIA_STATUS.PENDING_ZAD) return ["CERTIFY", "REJECT", "EDIT", "DELETE"];
  if (status === MEDIA_STATUS.FINAL) return ["EDIT"];
  return ["EDIT", "DELETE"];
}

export function can(action: MediaAction, status: MediaStatus, side: Side): boolean {
  return allowedActions(status, side).includes(action);
}

/**
 * متى يلزم السبب؟
 *
 * ردُّ زادٍ لتعديل الجمعية، وفتحُه منشوراً نهائيّاً. وفي الحالتين تُحرَم الجمعيةُ
 * شيئاً اعتمدته أو كتبته، فالسببُ هو ما يجعله قراراً لا تراجعاً صامتاً.
 */
export function requiresNote(action: MediaAction, status: MediaStatus, side: Side): boolean {
  if (side !== "ZAD") return false;
  if (action === "REJECT") return true;
  return action === "EDIT" && status === MEDIA_STATUS.FINAL;
}

/** الحالةُ بعد الفعل. وتُرمى على فعلٍ غيرِ مُجاز، فلا تُستعمل قبل `can`. */
export function nextStatus(action: MediaAction, status: MediaStatus, side: Side): MediaStatus {
  if (!can(action, status, side)) {
    throw new Error("فعلٌ غير مسموحٍ في هذه الحالة");
  }
  if (action === "APPROVE" || action === "CERTIFY") return MEDIA_STATUS.FINAL;
  if (action === "REJECT") return MEDIA_STATUS.PENDING_CHARITY;
  // التعديل: من الجمعية يرفعه إلى تعميد زاد، ومن زادٍ يُعيده إلى اعتماد الجمعية
  // أيّاً كانت حالتُه — فما غيّره زادٌ لم ترَه الجمعيةُ بعد.
  if (action === "EDIT") {
    return side === "CHARITY" ? MEDIA_STATUS.PENDING_ZAD : MEDIA_STATUS.PENDING_CHARITY;
  }
  return status;
}

/** نوعُ الحدث المكتوب في السجلّ. */
export type MediaEventKind =
  | "CREATED"
  | "APPROVED_BY_CHARITY"
  | "EDITED_BY_CHARITY"
  | "CERTIFIED_BY_ZAD"
  | "REJECTED_BY_ZAD"
  | "EDITED_BY_ZAD"
  | "REOPENED_BY_ZAD";

export function eventKind(action: MediaAction, status: MediaStatus, side: Side): MediaEventKind {
  if (action === "APPROVE") return "APPROVED_BY_CHARITY";
  if (action === "CERTIFY") return "CERTIFIED_BY_ZAD";
  if (action === "REJECT") return "REJECTED_BY_ZAD";
  if (action === "EDIT") {
    if (side === "CHARITY") return "EDITED_BY_CHARITY";
    // تعديلُ نهائيٍّ ليس كتعديلِ مسوَّدة: هو فتحٌ لما أُغلق، ويُسمّى باسمه في السجلّ.
    return status === MEDIA_STATUS.FINAL ? "REOPENED_BY_ZAD" : "EDITED_BY_ZAD";
  }
  return "CREATED";
}

export const EVENT_LABELS: Record<MediaEventKind, string> = {
  CREATED: "وضعه زاد",
  APPROVED_BY_CHARITY: "اعتمدته الجمعية",
  EDITED_BY_CHARITY: "عدّلته الجمعية",
  CERTIFIED_BY_ZAD: "عمّد زادٌ التعديل",
  REJECTED_BY_ZAD: "ردّ زادٌ التعديل",
  EDITED_BY_ZAD: "عدّله زاد",
  REOPENED_BY_ZAD: "فتحه زادٌ بعد الاعتماد",
};

export function eventLabel(kind: string): string {
  return EVENT_LABELS[kind as MediaEventKind] ?? kind;
}

/** قيمُ المنشور القابلةُ للتغيير — وهي وحدَها ما يُلتقط وما يُقارن. */
export type MediaSnapshot = {
  content: string;
  platforms: string[];
  imageUrl: string | null;
  linkUrl: string | null;
  /** «YYYY-MM-DD» */
  scheduledOn: string;
  /** «HH:MM» أو لا وقت. */
  scheduledAt: string | null;
};

const FIELD_LABELS: Record<keyof MediaSnapshot, string> = {
  content: "نصّ المنشور",
  platforms: "المنصّات",
  imageUrl: "الصورة",
  linkUrl: "الرابط",
  scheduledOn: "يوم النشر",
  scheduledAt: "وقت النشر",
};

export type FieldChange = {
  field: keyof MediaSnapshot;
  label: string;
  before: string;
  after: string;
};

const EMPTY_MARK = "—";

function asText(field: keyof MediaSnapshot, value: unknown, platformName?: (key: string) => string): string {
  if (field === "platforms") {
    const list = Array.isArray(value) ? (value as string[]) : [];
    if (list.length === 0) return EMPTY_MARK;
    return list.map((key) => platformName?.(key) ?? key).join("، ");
  }
  if (value === null || value === undefined || value === "") return EMPTY_MARK;
  return String(value);
}

/**
 * ما تغيَّر بين لقطتين، حقلاً حقلاً.
 *
 * والمنصّاتُ تُقارن كمجموعةٍ لا كقائمة: إعادةُ ترتيبها ليست تعديلاً يُعرض على
 * أحدٍ ليُعمِّده.
 */
export function diffSnapshots(
  before: MediaSnapshot,
  after: MediaSnapshot,
  platformName?: (key: string) => string
): FieldChange[] {
  const out: FieldChange[] = [];
  for (const field of Object.keys(FIELD_LABELS) as (keyof MediaSnapshot)[]) {
    const a = before[field];
    const b = after[field];
    const same =
      field === "platforms"
        ? samePlatforms(a as string[], b as string[])
        : (a ?? "") === (b ?? "");
    if (same) continue;
    out.push({
      field,
      label: FIELD_LABELS[field],
      before: asText(field, a, platformName),
      after: asText(field, b, platformName),
    });
  }
  return out;
}

export function samePlatforms(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const left = [...new Set(a ?? [])].sort();
  const right = [...new Set(b ?? [])].sort();
  return left.length === right.length && left.every((value, i) => value === right[i]);
}

/**
 * وقتُ النشر: «HH:MM» أو لا شيء.
 *
 * ويُقبل «٩:٥» فيُكتب «09:05» — ومن كتب ما لا يُقرأ وقتاً، لم يُكتب له وقتٌ
 * أصلاً (والوقتُ اختياريّ، فلا يُوقف الحفظَ على خطأٍ فيه).
 */
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** «١:٠٠ م» — وقتٌ يُقرأ في بطاقةٍ ضيّقة. */
export function formatTime(value: string | null | undefined): string {
  const time = normalizeTime(value);
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "ص" : "م";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/**
 * ترتيبُ منشورات اليوم الواحد: بالوقت، وما لا وقتَ له في آخره.
 *
 * فالفارغُ يسبق كلَّ نصٍّ في المقارنة النصّيّة، فلو تُرك لها لتصدَّر المنشورُ
 * الذي لم يُحدَّد وقتُه منشوراتِ الصباح.
 */
export function compareByTime(
  a: { scheduledAt?: string | null },
  b: { scheduledAt?: string | null }
): number {
  const left = normalizeTime(a.scheduledAt);
  const right = normalizeTime(b.scheduledAt);
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

/**
 * الرابطُ المرفق: `http(s)` وحدَه.
 *
 * و`javascript:` يُرفض هنا لا في الشاشة: الرابطُ يُكتب في البوّابة ويُنقر في
 * لوحة زاد، فقبولُه بناءً على ما يرسمه المتصفّحُ ثقةٌ في مُدخِلٍ لا يُوثق به.
 */
export function isSafeLink(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** الحرفُ البديلُ لمنصّةٍ بلا شعار. */
export function platformLetter(name: string): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? [...trimmed][0] : "؟";
}

/**
 * مفتاحُ منصّةٍ تُضاف: لاتينيٌّ مختصرٌ يُشتقّ من الاسم، وعربيُّه يُترك للاسم.
 *
 * والمفتاحُ هو المخزَّنُ في المنشورات، فلا يتغيّر بعد الإنشاء — ولذلك لا
 * يُشتقّ من الاسم إلا مرّةً واحدة، عند الإضافة.
 */
export function platformKeyFrom(name: string, taken: string[] = []): string {
  const base =
    (name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "platform";
  if (!taken.includes(base)) return base;
  let index = 2;
  while (taken.includes(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}
