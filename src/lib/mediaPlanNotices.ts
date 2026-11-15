import { WEEKDAY_LABELS } from "./attendanceTime.ts";
import { formatDateWithWeekday } from "./calendarGrid.ts";
import type { MediaEventKind } from "./mediaPlan.ts";

/**
 * نصوصُ إشعارات الخطّة الإعلاميّة — خالصةً، في موضعٍ واحد.
 *
 * فالإشعارُ يُكتب من فعلٍ عند زادٍ وفعلٍ في البوّابة، ولو كُتب نصُّه في كلٍّ
 * منهما لقال الطرفان للحدث الواحد اسمين. وها هنا يُقرأ الحدثُ فيُعرف **إلى من**
 * يُرسل وبأيِّ لفظ.
 *
 * و«إلى من» ليس اختياراً: الحدثُ من زادٍ يُنبَّه به الجمعيةُ، ومن الجمعية
 * يُنبَّه به زاد. فالتنبيهُ لمن ينتظره فعلٌ، لا لمن فعل.
 */

/** الجهةُ التي يُرسل إليها الإشعار. */
export type NoticeSide = "ZAD" | "CHARITY";

export type MediaNotice = {
  to: NoticeSide;
  title: string;
  message: string;
};

export type NoticeContext = {
  charityName: string;
  /** «YYYY-MM-DD» — يومُ النشر، يُكتب باسم يومه كي يُعرف بلا فتحِ الصفحة. */
  day: string;
  /** من فعل — موظَّفٌ أو عضوُ جمعية. */
  actorName?: string | null;
  /** السببُ المكتوب، إن كان الفعلُ مُسبَّباً. */
  note?: string | null;
};

const TO: Record<MediaEventKind, NoticeSide | null> = {
  CREATED: "CHARITY",
  EDITED_BY_ZAD: "CHARITY",
  REOPENED_BY_ZAD: "CHARITY",
  REJECTED_BY_ZAD: "CHARITY",
  CERTIFIED_BY_ZAD: "CHARITY",
  APPROVED_BY_CHARITY: "ZAD",
  EDITED_BY_CHARITY: "ZAD",
};

const TITLES: Record<MediaEventKind, string> = {
  CREATED: "منشور جديد بانتظار اعتمادكم",
  EDITED_BY_ZAD: "تم تعديل منشور وهو بانتظار اعتمادكم",
  REOPENED_BY_ZAD: "تم فتح منشور معتمد وهو بانتظار اعتمادكم",
  REJECTED_BY_ZAD: "تم رد تعديلكم على منشور",
  CERTIFIED_BY_ZAD: "تم اعتماد تعديلكم — المنشور نهائي",
  APPROVED_BY_CHARITY: "اعتمدت الجمعية المنشور",
  EDITED_BY_CHARITY: "عدلت الجمعية منشورا — بانتظار اعتمادك",
};

function dayText(day: string): string {
  return formatDateWithWeekday(day, WEEKDAY_LABELS);
}

/**
 * الإشعارُ عن حدثٍ — أو لا شيء، إن كان الحدثُ لا يُنبَّه به أحد.
 *
 * والرسالةُ تحمل ما يُغني عن فتح الصفحة لمعرفة «ماذا؟»: يومُ المنشور، واسمُ
 * الجمعية لمن يتابع جمعياتٍ عدّة، والسببُ إن كُتب.
 */
export function mediaNotice(kind: MediaEventKind, ctx: NoticeContext): MediaNotice | null {
  const to = TO[kind];
  if (!to) return null;

  const parts: string[] = [];
  parts.push(to === "ZAD" ? `${ctx.charityName} — منشور ${dayText(ctx.day)}` : `منشور ${dayText(ctx.day)}`);
  if (ctx.actorName) parts.push(`بيد ${ctx.actorName}`);
  const note = (ctx.note ?? "").trim();
  if (note) parts.push(`السبب: ${note}`);

  return { to, title: TITLES[kind], message: parts.join(" · ") };
}

/** صفحةُ الخطّة عند زادٍ لهذه الجمعية. */
export function zadMediaLink(charityName: string): string {
  return `/main/media/${encodeURIComponent(charityName)}`;
}

/** صفحةُ الخطّة في بوّابة الجمعية. */
export function portalMediaLink(charityName: string): string {
  return `/portal/${encodeURIComponent(charityName)}/media`;
}
