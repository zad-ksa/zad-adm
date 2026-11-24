/**
 * منطقُ طلبات إنشاء وثائق المشاريع — أحوالُها وتنظيفُ مدخلاتها وإعدادُها.
 *
 * **ومدخلاتُ الطلب مدخلاتُ المنشئ** (`ProjectBuilderValues`): الجمعيةُ تكتب ما
 * كان موظّفُ زادٍ يكتبه عنها، فيفتح الموظّفُ الطلبَ ويُنشئ منه بلا نقلٍ بيده.
 *
 * **ومنطقٌ خالصٌ يُختبر**: الأحوالُ وما يجوز في كلٍّ منها هي ما يُخطئ — لا
 * الاستعلام. وتقرؤه الشاشتان معاً، فلا تُظهر إحداهما زرّاً يردّه الفعل.
 */

export const DOC_REQUEST_SETTINGS_KEY = "doc_requests_settings";

export type DocRequestStatus = "PENDING" | "AWAITING_REVIEW" | "RETURNED" | "COMPLETED";

export const DOC_REQUEST_STATUSES: readonly {
  value: DocRequestStatus;
  label: string;
  /** ما يُقال للجمعية في بطاقتها. */
  charityHint: string;
  tone: "brand" | "warn" | "good" | "danger" | "neutral";
}[] = [
  {
    value: "PENDING",
    label: "قيد التنفيذ",
    charityHint: "وصل الطلب، ويكتب فريق زاد الوثيقة.",
    tone: "brand",
  },
  {
    value: "AWAITING_REVIEW",
    label: "بانتظار تعميدكم",
    charityHint: "سلم الملف النهائي — راجعوه ثم عمدوه.",
    tone: "warn",
  },
  {
    value: "RETURNED",
    label: "أعيد بملاحظات",
    charityHint: "فريق زاد يحتاج تعديلا أو بيانا — أكملوه وأعيدوا الإرسال.",
    tone: "danger",
  },
  {
    value: "COMPLETED",
    label: "معمد",
    charityHint: "اعتمدتم الوثيقة، وهي جاهزة للتنزيل.",
    tone: "good",
  },
];

export function docRequestStatusOf(value: string): DocRequestStatus {
  return DOC_REQUEST_STATUSES.some((s) => s.value === value)
    ? (value as DocRequestStatus)
    : "PENDING";
}

export function docRequestStatusLabel(value: string): string {
  return DOC_REQUEST_STATUSES.find((s) => s.value === docRequestStatusOf(value))!.label;
}

export function docRequestStatusTone(value: string) {
  return DOC_REQUEST_STATUSES.find((s) => s.value === docRequestStatusOf(value))!.tone;
}

export function docRequestStatusHint(value: string): string {
  return DOC_REQUEST_STATUSES.find((s) => s.value === docRequestStatusOf(value))!.charityHint;
}

/**
 * ما يجوز فعلُه بالطلب في حاله.
 *
 * **وقاعدةٌ واحدةٌ للشاشتين**: الشاشةُ تُخفي الزرَّ بها، والفعلُ يفحصها من
 * جديد — فإخفاءُ زرٍّ ليس تصريحاً.
 */
export function docRequestCan(status: string) {
  const s = docRequestStatusOf(status);
  return {
    /** الكتابةُ والإعادةُ تُفتحان ما دام الطلبُ في الدور. */
    generate: s === "PENDING",
    deliver: s === "PENDING",
    returnToCharity: s === "PENDING",
    /** الجمعيةُ تُعمّد ما سُلّم إليها وحدَه. */
    approve: s === "AWAITING_REVIEW",
    /** وتُعيد الإرسالَ بعد ردِّ زادٍ وحدَه. */
    resubmit: s === "RETURNED",
    /** وتُعدّل ما لم يُسلَّم بعد: الوثيقةُ لم تُكتب على مدخلاتٍ ثابتة. */
    edit: s === "PENDING" || s === "RETURNED",
  };
}

// ── نوعُ الطلب ومرفقاته ───────────────────────────────────────────────────

/** إنشاءُ وثيقةٍ من فكرة، أو مراجعةُ وثيقةٍ كتبتها الجمعية. */
export type DocRequestKind = "CREATE" | "REVIEW";

export function docRequestKindOf(value: unknown): DocRequestKind {
  return value === "REVIEW" ? "REVIEW" : "CREATE";
}

export const DOC_REQUEST_KINDS: readonly { value: DocRequestKind; label: string; hint: string }[] = [
  { value: "CREATE", label: "طلب إنشاء وثيقة", hint: "اكتب فكرة المبادرة، ويكتب فريق زاد وثيقتها." },
  { value: "REVIEW", label: "طلب مراجعة وثيقة", hint: "أرفق وثيقتك، ويراجعها فريق زاد ويعيدها إليك." },
];

export function docRequestKindLabel(value: unknown): string {
  return DOC_REQUEST_KINDS.find((k) => k.value === docRequestKindOf(value))!.label;
}

/** مرفقٌ من مرفقات الجمعية. */
export type DocAttachment = { url: string; name: string; size: number | null };

export const MAX_ATTACHMENTS = 5;

/** مرفقاتٌ مقروءةٌ من JSON أو من الطلب — ما لا يصلح منها يُسقط. */
export function docAttachmentsOf(value: unknown): DocAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      url: typeof a.url === "string" ? a.url.trim() : "",
      name: typeof a.name === "string" ? a.name.trim().slice(0, MAX_SHORT) : "",
      size: typeof a.size === "number" && Number.isFinite(a.size) ? a.size : null,
    }))
    .filter((a) => a.url && a.name)
    .slice(0, MAX_ATTACHMENTS);
}

export const MAX_IDEA = 4000;
export const MAX_SHORT = 200;
export const MAX_NOTE = 1000;

export type DocRequestInput = {
  kind?: DocRequestKind;
  attachments?: DocAttachment[] | null;
  programName?: string | null;
  programIdea?: string | null;
  beneficiariesCount?: string | null;
  programDuration?: string | null;
  targetCategory?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetInclude?: boolean;
  budgetTotal?: string | null;
  note?: string | null;
};

export type CleanDocRequest = {
  kind: DocRequestKind;
  attachments: DocAttachment[] | null;
  programName: string | null;
  programIdea: string;
  beneficiariesCount: string | null;
  programDuration: string | null;
  targetCategory: string | null;
  startDate: string | null;
  endDate: string | null;
  budgetInclude: boolean;
  budgetTotal: string | null;
  note: string | null;
};

const short = (value: string | null | undefined): string | null => {
  const text = (value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SHORT);
  return text || null;
};

/** `YYYY-MM-DD` أو لا شيء — ولا يُصدَّق نصٌّ آخر. */
export function cleanDocDate(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

/**
 * تنظيفُ الطلب وفحصُ إلزامِه.
 *
 * **والفكرةُ وحدَها إلزاميّة**: هي ما لا تُكتب الوثيقةُ بدونه، وما عداها
 * يُحسّنها ولا يَلزمها — فطلبٌ بسطرٍ واحدٍ أحسنُ من لا طلب.
 */
export function cleanDocRequest(
  input: DocRequestInput
): { ok: true; value: CleanDocRequest } | { ok: false; error: string } {
  const kind = docRequestKindOf(input.kind);
  const attachments = docAttachmentsOf(input.attachments);
  const note = (input.note ?? "").trim().slice(0, MAX_NOTE) || null;

  // **والمراجعةُ إلزامُها المرفق**: الوثيقةُ هي موضوعُ الطلب، وما سواها
  // ملاحظاتٌ اختياريّة — فلا يُطلب فيها فكرةٌ ولا حقولُ مبادرة.
  if (kind === "REVIEW") {
    if (attachments.length === 0) return { ok: false, error: "أرفق الوثيقة المراد مراجعتها" };
    return {
      ok: true,
      value: {
        kind,
        attachments,
        programName: null,
        programIdea: "",
        beneficiariesCount: null,
        programDuration: null,
        targetCategory: null,
        startDate: null,
        endDate: null,
        budgetInclude: false,
        budgetTotal: null,
        note,
      },
    };
  }

  const programIdea = (input.programIdea ?? "").trim().slice(0, MAX_IDEA);
  if (!programIdea) return { ok: false, error: "اكتب فكرة المبادرة أو البرنامج" };

  const startDate = cleanDocDate(input.startDate);
  const endDate = cleanDocDate(input.endDate);
  // وتاريخُ نهايةٍ قبل بدايةٍ خبرٌ متناقض، ويُردّ عند الكتابة لا بعدها.
  if (startDate && endDate && endDate < startDate) {
    return { ok: false, error: "تاريخ النهاية قبل تاريخ البداية" };
  }

  const budgetInclude = input.budgetInclude === true;

  return {
    ok: true,
    value: {
      kind,
      attachments: attachments.length ? attachments : null,
      programName: short(input.programName),
      programIdea,
      beneficiariesCount: short(input.beneficiariesCount),
      programDuration: short(input.programDuration),
      targetCategory: short(input.targetCategory),
      startDate,
      endDate,
      budgetInclude,
      // والمبلغُ لا يُحفظ إن لم تُضمَّن الميزانية: رقمٌ معلَّقٌ بلا بندٍ يُقرأ
      // خطأً في كلِّ شاشةٍ بعدها.
      budgetTotal: budgetInclude ? short(input.budgetTotal) : null,
      note,
    },
  };
}

// ── الإعدادات ──────────────────────────────────────────────────────────────

export type DocQueueMode = "QUEUE" | "PARALLEL";

export const DOC_QUEUE_MODES: readonly { value: DocQueueMode; label: string; hint: string }[] = [
  {
    value: "QUEUE",
    label: "بالدور",
    hint: "طلبات الجمعية الواحدة تنفذ واحدا تلو الآخر، وموعد كل طلب يبدأ حيث ينتهي سابقه.",
  },
  {
    value: "PARALLEL",
    label: "في وقت واحد",
    hint: "كل طلب يأخذ مهلته من يوم رفعه، ولا ينتظر ما قبله.",
  },
];

export type DocRequestSettings = {
  /** أيامُ العمل الافتراضيةُ للطلب الواحد. */
  defaultWorkingDays: number;
  /** هل تصطفُّ طلباتُ الجمعية الواحدة أم تمضي معاً؟ */
  queueMode: DocQueueMode;
};

export const DEFAULT_DOC_REQUEST_SETTINGS: DocRequestSettings = {
  defaultWorkingDays: 5,
  queueMode: "QUEUE",
};

export const MIN_DOC_DAYS = 1;
export const MAX_DOC_DAYS = 60;

/**
 * قراءةُ الإعداد من `GlobalSetting` — وما فسد منه يعود إلى الافتراضيّ.
 *
 * فالصفُّ JSON يُحرَّر بيدٍ أحياناً، وإعدادٌ فاسدٌ لا يجوز أن يمنع رفعَ طلب.
 */
export function normalizeDocRequestSettings(raw: unknown): DocRequestSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<DocRequestSettings>;
  const days = Number(r.defaultWorkingDays);
  return {
    defaultWorkingDays: Number.isFinite(days)
      ? Math.min(MAX_DOC_DAYS, Math.max(MIN_DOC_DAYS, Math.round(days)))
      : DEFAULT_DOC_REQUEST_SETTINGS.defaultWorkingDays,
    queueMode: r.queueMode === "PARALLEL" ? "PARALLEL" : "QUEUE",
  };
}

export function docQueueModeLabel(mode: DocQueueMode): string {
  return DOC_QUEUE_MODES.find((m) => m.value === mode)!.label;
}
