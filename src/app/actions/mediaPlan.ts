"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getMediaScope, mayManageCharityMedia } from "@/lib/mediaPlanAccess";
import {
  MEDIA_STATUS,
  can,
  isSafeLink,
  platformKeyFrom,
  toStatus,
  type MediaAction,
  type MediaSnapshot,
} from "@/lib/mediaPlan";
import {
  cleanMediaInput as cleanInput,
  dayValue,
  parseBaseline,
  snapshotOfBaseline,
  type MediaPostFields,
} from "@/lib/mediaPostInput";
import { APPLY_FIELDS, applyMediaAction, baseKindOf } from "@/lib/mediaPostApply";
import { publishingPlanValue } from "@/lib/publishingPlan";
import { mediaNotice, portalMediaLink } from "@/lib/mediaPlanNotices";
import { notifyCharityMembers } from "@/lib/notifyInbox";
import { logAudit } from "@/lib/auditLog";
import { toISODate } from "@/lib/calendarGrid";
import {
  MEDIA_FIELDS_MISSING,
  hasPostDetailColumns,
  toMediaPostView,
} from "@/lib/mediaPostFields";

/**
 * أفعالُ الخطّة الإعلاميّة من جهة زاد.
 *
 * وكلُّ دالّةٍ مُصدَّرةٍ هنا مدخلٌ HTTP حقيقيّ، فتحرس نفسَها: الصلاحيةُ ثمّ
 * الإسنادُ ثمّ الخدمة (`mayManageCharityMedia`)، ثمّ **جوازُ الفعل في حالة
 * المنشور** (`can` في `lib/mediaPlan.ts`) — وهو الفحصُ الذي لا تُغني عنه شاشةٌ
 * تُخفي زرّاً.
 *
 * وأفعالُ الجمعية في ملفٍّ آخر (`mediaPlanPortal.ts`): حارسُها عضويّةٌ لا
 * صلاحيةُ موظَّف، وخلطُهما في ملفٍّ واحدٍ يجعل حارساً واحداً ناقصاً فتحةً
 * للطرفين.
 */

export type MediaPostInput = MediaPostFields & { charityId: string };

async function requireMediaSession() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") return null;
  return session;
}

/**
 * أعمدةُ البنود شرطٌ في كلِّ فعل: فعلٌ يُقبل ثمّ يُخفق في القاعدة أسوأُ من منعٍ
 * يقول سببَه. ويُسأل مرّةً واحدةً في عمر العملية.
 */
async function missingFields(): Promise<string | null> {
  return (await hasPostDetailColumns()) ? null : MEDIA_FIELDS_MISSING;
}

/** المنشورُ ومعه إذنُ الموظَّف فيه — أو رسالةُ منعٍ تُعرض كما هي. */
async function loadPostForZad(postId: string) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" as const };
  const missing = await missingFields();
  if (missing) return { error: missing };

  const post = await prisma.mediaPost.findUnique({ where: { id: postId }, select: APPLY_FIELDS });
  if (!post) return { error: "المنشور غير موجود" as const };
  if (!(await mayManageCharityMedia(session, post.charityId))) {
    return { error: "لا صلاحية لك على الخطة الإعلامية لهذه الجمعية" as const };
  }
  return { session, post, status: toStatus(post.status) };
}

function revalidateCharity(charityName: string) {
  revalidatePath(`/main/media/${encodeURIComponent(charityName)}`);
}

/**
 * إشعارُ الجمعية بما فعله زادٌ — بعد نجاح الفعل لا قبله.
 *
 * ويُرسل إلى من يرى التبويبَ في تلك الجمعية وحدَهم (`view_media_plan`)، لا إلى
 * كلِّ عضوٍ فيها: إشعارٌ ينقُره صاحبُه فيُمنَع أسوأُ من لا إشعار.
 */
async function tellCharity(
  kind: Parameters<typeof mediaNotice>[0],
  charityId: string,
  charityName: string,
  day: Date | string,
  note?: string | null
) {
  const notice = mediaNotice(kind, {
    charityName,
    day: typeof day === "string" ? day : toISODate(day),
    note,
  });
  if (!notice || notice.to !== "CHARITY") return;
  await notifyCharityMembers(charityId, "edit_media_plan", {
    title: notice.title,
    message: notice.message,
    link: portalMediaLink(charityName),
  });
}

/** المنشورُ كما تقرؤه الشاشة — في العدة، فتقرؤه جهةُ الجمعية كذلك. */
export type { MediaPostView } from "@/lib/mediaPostFields";

export type MediaEventView = {
  id: string;
  kind: string;
  actorSide: string;
  actorName: string | null;
  note: string | null;
  at: string;
  before: MediaSnapshot | null;
};

const POST_FIELDS = {
  id: true,
  scheduledOn: true,
  scheduledAt: true,
  title: true,
  content: true,
  description: true,
  platforms: true,
  imageUrl: true,
  imagePublicId: true,
  linkUrl: true,
  attachments: true,
  status: true,
  createdByName: true,
  finalizedBy: true,
  finalizedSide: true,
} as const;

/**
 * منشوراتُ مدىً من الأيام — وهو ما تعرضه الشاشةُ لا أكثر.
 *
 * فخطّةُ جمعيةٍ تكبُر سنةً بعد سنة، وشبكةُ الشهر تعرض ستّةَ أسابيع: جلبُ
 * الكلِّ ليُرمى أكثرُه هو ما يُبطئ الصفحةَ بعد عامين لا اليوم.
 */
export async function listMediaPosts(charityId: string, fromISO: string, toISO: string) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
  const missing = await missingFields();
  if (missing) return { error: missing };
  if (!(await mayManageCharityMedia(session, charityId))) return { error: "لا صلاحية" };

  const from = dayValue(fromISO);
  const to = dayValue(toISO);
  if (!from || !to) return { error: "مدىً غير صحيح" };

  const posts = await prisma.mediaPost.findMany({
    where: { charityId, scheduledOn: { gte: from, lte: to } },
    orderBy: [{ scheduledOn: "asc" }, { scheduledAt: "asc" }],
    select: POST_FIELDS,
  });
  return { posts: posts.map(toMediaPostView) };
}

/** أصلُ التعديل المعلَّق كما تقرؤه الشاشة: نوعُه ولقطتُه للمقارنة. */
export type MediaPendingBase = { kind: "FINAL" | "DRAFT"; snapshot: MediaSnapshot };

/** المنشورُ وأصلُ تعديله المعلَّق إن كان — للوح التفاصيل. */
export async function getMediaPostDetail(postId: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };

  const post = await prisma.mediaPost.findUnique({ where: { id: postId }, select: POST_FIELDS });
  if (!post) return { error: "المنشور غير موجود" };

  const base = parseBaseline(loaded.post.baseline);
  return {
    post: toMediaPostView(post),
    base: base ? ({ kind: base.kind, snapshot: snapshotOfBaseline(base) } satisfies MediaPendingBase) : null,
  };
}

export async function createMediaPost(input: MediaPostInput) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
  const missing = await missingFields();
  if (missing) return { error: missing };
  if (!(await mayManageCharityMedia(session, input.charityId))) {
    return { error: "لا صلاحية لك على الخطة الإعلامية لهذه الجمعية" };
  }

  const cleaned = cleanInput(input);
  if ("error" in cleaned) return { error: cleaned.error };

  const charity = await prisma.charity.findUnique({
    where: { id: input.charityId },
    select: { name: true },
  });
  if (!charity) return { error: "الجمعية غير موجودة" };

  const post = await prisma.mediaPost.create({
    data: {
      charityId: input.charityId,
      ...cleaned.data,
      status: MEDIA_STATUS.PENDING_CHARITY,
      createdById: session.id,
      createdByName: session.name ?? null,
      events: {
        create: {
          kind: "CREATED",
          actorSide: "ZAD",
          actorId: session.id,
          actorName: session.name ?? null,
        },
      },
    },
    select: { id: true },
  });

  await tellCharity("CREATED", input.charityId, charity.name, cleaned.data.scheduledOn);

  revalidateCharity(charity.name);
  return { success: true, id: post.id };
}

/**
 * تعديلُ زادٍ للمنشور — ويقرّر `transition` ما يصير إليه: المعتمدُ ينتظر
 * الجمعية مقابل أصله، والجديدُ يبقى جديداً، وتعديلٌ ثانٍ على طلبٍ قائمٍ يبقى
 * طلباً واحداً لا يُنبَّه به مرّتين.
 */
export async function updateMediaPost(postId: string, input: MediaPostInput, note?: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };
  const { session, post } = loaded;

  // و`charityId` المُرسَلُ مع المُدخَل لا يُقرأ هنا أصلاً: جمعيةُ المنشور صفُّه.
  const cleaned = cleanInput(input);
  if ("error" in cleaned) return { error: cleaned.error };

  const result = await applyMediaAction({
    post,
    side: "ZAD",
    action: "EDIT",
    actor: { id: session.id, name: session.name ?? null },
    input: cleaned.data,
    note,
  });
  if ("error" in result) return { error: result.error };

  if (result.notify) {
    await tellCharity(result.kind, post.charityId, post.charity.name, cleaned.data.scheduledOn, note);
  }
  revalidateCharity(post.charity.name);
  return { success: true };
}

/** اعتمادُ زادٍ لتعديل الجمعية — وبه يصير المنشورُ معتمداً من الطرفين. */
export async function certifyMediaPost(postId: string, note?: string) {
  return decide(postId, "CERTIFY", note);
}

/** ردُّ تعديل الجمعية إلى أصله. */
export async function rejectMediaEdit(postId: string, note?: string) {
  return decide(postId, "REJECT", note);
}

async function decide(postId: string, action: Extract<MediaAction, "CERTIFY" | "REJECT">, note?: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };
  const { session, post } = loaded;

  const result = await applyMediaAction({
    post,
    side: "ZAD",
    action,
    actor: { id: session.id, name: session.name ?? null },
    note,
  });
  if ("error" in result) return { error: result.error };

  if (result.notify) {
    await tellCharity(result.kind, post.charityId, post.charity.name, post.scheduledOn, note);
  }
  revalidateCharity(post.charity.name);
  return { success: true };
}

export async function deleteMediaPost(postId: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };
  const { post, status } = loaded;

  if (!can("DELETE", status, "ZAD", baseKindOf(post))) {
    return { error: "المنشور المعتمد لا يحذف" };
  }

  await prisma.mediaPost.delete({ where: { id: post.id } });
  revalidateCharity(post.charity.name);
  return { success: true };
}

// ── المنصّات ────────────────────────────────────────────────────────────────

/**
 * إضافةُ منصّة. والمفتاحُ يُشتقّ مرّةً واحدةً عند الإضافة ولا يتغيّر بعدها:
 * هو المخزَّنُ في المنشورات، فتغييرُه يُفرِّغها من منصّاتها.
 */
export async function createMediaPlatform(input: { name: string; color?: string | null; logoUrl?: string | null }) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
  const scope = await mayManageCharityMediaAny(session);
  if (!scope) return { error: "لا صلاحية لك على الخطة الإعلامية" };

  const name = (input.name ?? "").trim();
  if (!name) return { error: "اسم المنصة مطلوب" };

  const existing = await prisma.mediaPlatform.findMany({ select: { key: true, name: true } });
  if (existing.some((p) => p.name === name)) return { error: "المنصة موجودة مسبقا" };

  const key = platformKeyFrom(name, existing.map((p) => p.key));
  const sortOrder = (await prisma.mediaPlatform.count()) + 1;

  await prisma.mediaPlatform.create({
    data: {
      key,
      name,
      color: (input.color ?? "").trim() || null,
      logoUrl: (input.logoUrl ?? "").trim() || null,
      sortOrder,
    },
  });
  return { success: true };
}

/** تعطيلُ منصّةٍ لا حذفُها: منشوراتٌ قديمةٌ تحمل مفتاحَها. */
export async function setMediaPlatformActive(id: string, isActive: boolean) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
  if (!(await mayManageCharityMediaAny(session))) return { error: "لا صلاحية لك على الخطة الإعلامية" };

  await prisma.mediaPlatform.update({ where: { id }, data: { isActive } });
  return { success: true };
}

/** هل له خطّةٌ إعلاميّةٌ في جمعيةٍ ما أصلاً؟ — شرطُ إدارة المنصّات. */
async function mayManageCharityMediaAny(session: { id: string; role: string; permissions?: string[] }) {
  const scope = await getMediaScope(session);
  return scope.canManage;
}

// ── حساباتُ الجمعية في المنصّات ─────────────────────────────────────────────

/** رابطٌ كُتب بلا بروتوكول («x.com/zad») يُكمَّل بـhttps، وما سوى http(s) يُردّ. */
function normalizeAccountUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return isSafeLink(withScheme) ? withScheme : null;
}

/**
 * حفظُ روابط حسابات الجمعية دفعةً واحدة: `{ مفتاحُ المنصّة: رابط }`، والفارغُ
 * يحذف رابطَ منصّته.
 */
export async function saveCharityMediaAccounts(charityId: string, accounts: Record<string, string>) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
  if (!(await mayManageCharityMedia(session, charityId))) {
    return { error: "لا صلاحية لك على الخطة الإعلامية لهذه الجمعية" };
  }

  const known = new Set((await prisma.mediaPlatform.findMany({ select: { key: true } })).map((p) => p.key));
  // الموقعُ الإلكترونيُّ ليس منصّةَ نشر، ومفتاحُه محجوزٌ هنا (`WEBSITE` في CharityAccounts).
  known.add("website");
  const upserts: { platformKey: string; url: string }[] = [];
  const removals: string[] = [];
  for (const [platformKey, raw] of Object.entries(accounts ?? {})) {
    if (!known.has(platformKey)) continue;
    if (!String(raw ?? "").trim()) {
      removals.push(platformKey);
      continue;
    }
    const url = normalizeAccountUrl(String(raw));
    if (!url) return { error: `رابطٌ غير صالح: ${raw}` };
    upserts.push({ platformKey, url });
  }

  await prisma.$transaction([
    prisma.charityMediaAccount.deleteMany({ where: { charityId, platformKey: { in: removals } } }),
    ...upserts.map(({ platformKey, url }) =>
      prisma.charityMediaAccount.upsert({
        where: { charityId_platformKey: { charityId, platformKey } },
        create: { charityId, platformKey, url },
        update: { url },
      })
    ),
  ]);

  const charity = await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } });
  if (charity) revalidateCharity(charity.name);

  const saved = await prisma.charityMediaAccount.findMany({
    where: { charityId },
    select: { platformKey: true, url: true },
  });
  return { success: true, accounts: saved };
}

/**
 * إشعالُ تبويب «الخطة الإعلامية» في بوّابة الجمعية أو إطفاؤه.
 *
 * **وبيد زادٍ وحدَها**: حارسُه `mayManageCharityMedia` — صلاحيةٌ وإسنادٌ وخدمة —
 * فالجمعيةُ لا تفتح على نفسها تبويباً، ولا يفتحه موظَّفٌ لجمعيةٍ ليست له.
 *
 * ويُكتب في سجلّ التدقيق: فتحُ تبويبٍ لجمعيةٍ أو إغلاقُه قرارٌ يُسأل عنه.
 */
export async function setCharityMediaPlanEnabled(charityId: string, enabled: boolean) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
  if (!(await mayManageCharityMedia(session, charityId))) {
    return { error: "لا صلاحية لك على الخطة الإعلامية لهذه الجمعية" };
  }

  const charity = await prisma.charity.findUnique({
    where: { id: charityId },
    select: { name: true },
  });
  if (!charity) return { error: "الجمعية غير موجودة" };

  try {
    await prisma.charity.update({ where: { id: charityId }, data: { mediaPlanEnabled: enabled } });
  } catch (error) {
    console.error("setCharityMediaPlanEnabled", error);
    // والسببُ الأغلب: العمودُ لم يُنشأ بعد. ويُقال صريحاً لا «حدث خطأ».
    return { error: "تعذّر الحفظ — لم يُطبَّق prisma/sql/media-plan-toggle.sql بعد" };
  }

  await logAudit({
    actorType: "EMPLOYEE",
    actorId: session.id,
    actorName: session.name ?? null,
    action: "PERMISSION_CHANGE",
    targetType: "Charity",
    targetId: charityId,
    metadata: { charity: charity.name, mediaPlanEnabled: enabled },
  });

  revalidateCharity(charity.name);
  revalidatePath(`/portal/${encodeURIComponent(charity.name)}/media`);
  return { success: true };
}

/**
 * كتابةُ خطّة النشر لجمعية — من زادٍ وحدَها.
 *
 * والجمعيةُ تقرؤها ولا تكتبها: هي قولُ الفريقِ في منهج النشر، كما أنّ المنشورَ
 * يضعه زادٌ وتعتمده الجمعية. فحارسُها حارسُ الصفحة نفسُه
 * (`mayManageCharityMedia`): الصلاحيةُ والإسنادُ والخدمة.
 *
 * ويُكتب في سجلّ التدقيق بطول ما كُتب لا بمتنِه: المتنُ يُقرأ في الصفحة، والسجلُّ
 * يُجيب «متى تغيّرت ومَن غيّرها».
 */
export async function setCharityPublishingPlan(charityId: string, text: string) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
  if (!(await mayManageCharityMedia(session, charityId))) {
    return { error: "لا صلاحية لك على الخطة الإعلامية لهذه الجمعية" };
  }

  const charity = await prisma.charity.findUnique({
    where: { id: charityId },
    select: { name: true },
  });
  if (!charity) return { error: "الجمعية غير موجودة" };

  const value = publishingPlanValue(text);

  try {
    await prisma.charity.update({ where: { id: charityId }, data: { publishingPlan: value } });
  } catch (error) {
    console.error("setCharityPublishingPlan", error);
    // والسببُ الأغلب: العمودُ لم يُنشأ بعد. ويُقال صريحاً لا «حدث خطأ».
    return { error: "تعذر الحفظ — لم يطبق prisma/sql/media-publishing-plan.sql بعد" };
  }

  await logAudit({
    actorType: "EMPLOYEE",
    actorId: session.id,
    actorName: session.name ?? null,
    action: "UPDATE",
    targetType: "Charity",
    targetId: charityId,
    metadata: { charity: charity.name, publishingPlan: value ? value.length : 0 },
  });

  revalidateCharity(charity.name);
  revalidatePath(`/portal/${encodeURIComponent(charity.name)}/media`);
  return { success: true, plan: value };
}
