"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuthError, requireCharityEffective, requireCharityPermission } from "@/lib/guards";
import { charityHasService } from "@/lib/charityServices";
import { MEDIA_SERVICE } from "@/lib/mediaPlanAccess";
import { isMediaPlanEnabled } from "@/lib/mediaPlanToggle";
import { MEDIA_TEAM_LABEL, toStatus, type MediaAction } from "@/lib/mediaPlan";
import { cleanMediaInput, dayValue, parseBaseline, snapshotOfBaseline, type MediaPostFields } from "@/lib/mediaPostInput";
import { APPLY_FIELDS, applyMediaAction } from "@/lib/mediaPostApply";
import { mediaNotice, zadMediaLink } from "@/lib/mediaPlanNotices";
import { notifyEmployees } from "@/lib/notifyInbox";
import { toISODate } from "@/lib/calendarGrid";
import {
  MEDIA_FIELDS_MISSING,
  hasPostDetailColumns,
  toMediaPostView,
} from "@/lib/mediaPostFields";
import type { MediaPendingBase, MediaPostView } from "@/app/actions/mediaPlan";

/**
 * أفعالُ الخطّة الإعلاميّة من جهة الجمعية — في بوّابتها.
 *
 * **ولمَ ملفٌّ على حدة**: حارسُ هذه الأفعال عضويّةٌ في جمعيةٍ بعينها وصلاحيةُ
 * تبويبٍ فيها (`view_media_plan`)، وحارسُ أفعال زادٍ صلاحيةُ موظَّفٍ وإسنادٌ
 * وخدمة. وخلطُهما في ملفٍّ واحدٍ يجعل حارساً واحداً ناقصاً فتحةً للطرفين — ومن
 * نسي الحارسَ في فعلٍ لم يُنبِّهه شيء.
 *
 * وما تفعله الجمعيةُ محدودٌ بـ`allowedActions(status, "CHARITY")`: تعتمد ما وضعه
 * زادٌ أو تُعدِّله، ولا شيءَ غيرَ ذلك. فلا إنشاءَ ولا حذفَ ولا تعديلَ لمنشورٍ
 * نهائيٍّ ولا لمنشورٍ ينتظر تعميدَ زادٍ — وهذه الحدودُ في مِلفٍّ واحدٍ تقرؤه
 * الشاشةُ والحارسُ معاً.
 */

export type PortalMediaInput = MediaPostFields;

/** حارسُ جمعيةٍ بعينها: عضويّةٌ، فصلاحيةُ التبويب، فشمولُ الخدمة للجمعية. */
/** @param needsEdit صلاحيّةُ التحرير — تلزم للاعتماد والتعديل لا للاطّلاع. */
async function requirePortalMedia(charityId: string, needsEdit: boolean) {
  try {
    // الاطّلاعُ عضويّةٌ فقط: تقويمُ جمعيتِهم يراه كلُّ عضوٍ فيها. والاعتمادُ
    // والتعديلُ بـ«تحرير الخطة الإعلامية».
    const access = needsEdit
      ? await requireCharityPermission(charityId, "edit_media_plan")
      : await requireCharityEffective(charityId);
    // والخدمةُ شرطٌ ثالثٌ كما عند زاد: جمعيةٌ رُفعت عنها «الإعلامية» لا خطّةَ
    // لها تُعتمد، ولو بقيت الصلاحيةُ في صفِّ العضو.
    if (!(await charityHasService(charityId, MEDIA_SERVICE))) {
      return { error: `خدمة «${MEDIA_SERVICE}» غير مشمولة لهذه الجمعية` as const };
    }
    // والمفتاحُ شرطٌ رابع: تبويبٌ أطفأته زادٌ لا تعمل أفعالُه ولو نُوديت مباشرةً.
    if (!(await isMediaPlanEnabled(charityId))) {
      return { error: "لم تفعل الخطة الاعلامية لجمعيتكم" as const };
    }
    // وأعمدةُ البنود شرطٌ خامس: فعلٌ يُقبل ثمّ يُخفق في القاعدة أسوأُ من منع.
    if (!(await hasPostDetailColumns())) return { error: MEDIA_FIELDS_MISSING };
    const charity = await prisma.charity.findUnique({
      where: { id: charityId },
      select: { name: true },
    });
    if (!charity) return { error: "الجمعية غير موجودة" as const };
    return { session: access.session, charityName: charity.name };
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message || ("غير مصرح" as const) };
    throw error;
  }
}

/**
 * المنشورُ ومعه إذنُ العضو فيه.
 *
 * والجمعيةُ تُقرأ **من صفِّ المنشور** لا من مُدخَلٍ يرسله المتصفّح: معرّفٌ يُكتب
 * باليد لا يُجيز صاحبَه على منشورِ جمعيةٍ أخرى.
 */
async function loadPostForCharity(postId: string, needsEdit: boolean) {
  const post = await prisma.mediaPost.findUnique({ where: { id: postId }, select: APPLY_FIELDS });
  if (!post) return { error: "المنشور غير موجود" as const };

  const access = await requirePortalMedia(post.charityId, needsEdit);
  if ("error" in access) return { error: access.error };

  return { session: access.session, post, status: toStatus(post.status) };
}

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

function toView(row: Parameters<typeof toMediaPostView>[0]): MediaPostView {
  const post = toMediaPostView(row);
  return {
    ...post,
    // ولا اسم موظف في المعروض للجمعية: من وضع المنشور هو زاد، ومن عمده من جهتها
    // فريقها. وأسماء أعضاء الجمعية تبقى — اعتماد زميلهم يقرأ باسمه.
    createdByName: post.createdByName ? MEDIA_TEAM_LABEL : null,
    finalizedBy:
      post.finalizedSide === "ZAD" && post.finalizedBy ? MEDIA_TEAM_LABEL : post.finalizedBy,
  };
}

function revalidatePortal(charityName: string) {
  revalidatePath(`/portal/${encodeURIComponent(charityName)}/media`);
}

/**
 * من يُنبَّه عند زادٍ بفعل الجمعية: من وضع المنشورَ ومن عمل عليه من جهة زاد.
 *
 * ولا يُنبَّه كلُّ من يحمل الصلاحية: الخطّةُ لجمعيةٍ مسنَدةٍ إلى من يتابعها،
 * فإشعارٌ لكلِّ حاملِ صلاحيةٍ في زادٍ يُغرق من لا شأنَ له بهذه الجمعية. ومن
 * وضعه ومن عمل عليه هما من ينتظره فعلٌ.
 */
async function tellZad(
  kind: Parameters<typeof mediaNotice>[0],
  post: { id: string; createdById: string | null; charityId: string; scheduledOn: Date },
  charityName: string,
  note?: string | null
) {
  const notice = mediaNotice(kind, {
    charityName,
    day: toISODate(post.scheduledOn),
    note,
  });
  if (!notice || notice.to !== "ZAD") return;

  const actors = await prisma.mediaPostEvent.findMany({
    where: { postId: post.id, actorSide: "ZAD", actorId: { not: null } },
    select: { actorId: true },
    distinct: ["actorId"],
  });

  const ids = [post.createdById, ...actors.map((a) => a.actorId)].filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );

  await notifyEmployees(ids, {
    title: notice.title,
    message: notice.message,
    link: zadMediaLink(charityName),
  });
}

/** منشوراتُ مدىً من الأيام — وهو ما تعرضه الشاشةُ لا أكثر. */
export async function listPortalMediaPosts(charityId: string, fromISO: string, toISO: string) {
  const access = await requirePortalMedia(charityId, false);
  if ("error" in access) return { error: access.error };

  const from = dayValue(fromISO);
  const to = dayValue(toISO);
  if (!from || !to) return { error: "المدة غير صحيحة" };

  const posts = await prisma.mediaPost.findMany({
    where: { charityId, scheduledOn: { gte: from, lte: to } },
    orderBy: [{ scheduledOn: "asc" }, { scheduledAt: "asc" }],
    select: POST_FIELDS,
  });
  return { posts: posts.map(toView) };
}

/** المنشورُ وأصلُ تعديله المعلَّق إن كان — وفيه تقرأ الجمعيةُ ما عدّله زاد. */
export async function getPortalMediaPostDetail(postId: string) {
  const loaded = await loadPostForCharity(postId, false);
  if ("error" in loaded) return { error: loaded.error };

  const post = await prisma.mediaPost.findUnique({ where: { id: postId }, select: POST_FIELDS });
  if (!post) return { error: "المنشور غير موجود" };

  const base = parseBaseline(loaded.post.baseline);
  return {
    post: toView(post),
    base: base ? ({ kind: base.kind, snapshot: snapshotOfBaseline(base) } satisfies MediaPendingBase) : null,
  };
}

/** اعتمادُ الجمعية لما ينتظرها — منشوراً جديداً أو تعديلاً من زاد. */
export async function approvePortalMediaPost(postId: string) {
  return decide(postId, "APPROVE");
}

/** ردُّ تعديل زادٍ إلى أصله. */
export async function rejectPortalMediaEdit(postId: string) {
  return decide(postId, "REJECT");
}

async function decide(postId: string, action: Extract<MediaAction, "APPROVE" | "REJECT">) {
  const loaded = await loadPostForCharity(postId, true);
  if ("error" in loaded) return { error: loaded.error };
  const { session, post } = loaded;

  const result = await applyMediaAction({
    post,
    side: "CHARITY",
    action,
    actor: { id: session.id, name: session.name ?? null },
  });
  if ("error" in result) return { error: result.error };

  if (result.notify) await tellZad(result.kind, post, post.charity.name);
  revalidatePortal(post.charity.name);
  return { success: true };
}

/**
 * تعديلُ الجمعية — ويرفع المنشورَ إلى اعتماد زادٍ مقابل أصله. وتعديلٌ ثانٍ قبل
 * أن يُبَتَّ في الأوّل يبقى طلباً واحداً.
 */
export async function updatePortalMediaPost(postId: string, input: PortalMediaInput) {
  const loaded = await loadPostForCharity(postId, true);
  if ("error" in loaded) return { error: loaded.error };
  const { session, post } = loaded;

  const cleaned = cleanMediaInput(input);
  if ("error" in cleaned) return { error: cleaned.error };

  const result = await applyMediaAction({
    post,
    side: "CHARITY",
    action: "EDIT",
    actor: { id: session.id, name: session.name ?? null },
    input: cleaned.data,
  });
  if ("error" in result) return { error: result.error };

  if (result.notify) await tellZad(result.kind, post, post.charity.name);
  revalidatePortal(post.charity.name);
  return { success: true };
}
