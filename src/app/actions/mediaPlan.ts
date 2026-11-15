"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getMediaScope, mayManageCharityMedia } from "@/lib/mediaPlanAccess";
import {
  MEDIA_STATUS,
  can,
  eventKind,
  isSafeLink,
  nextStatus,
  platformKeyFrom,
  requiresNote,
  toStatus,
  type MediaAction,
  type MediaSnapshot,
  type MediaStatus,
} from "@/lib/mediaPlan";
import {
  cleanMediaInput as cleanInput,
  dayValue,
  snapshotOfRow as snapshotOf,
  type MediaPostFields,
} from "@/lib/mediaPostInput";
import { mediaNotice, portalMediaLink } from "@/lib/mediaPlanNotices";
import { notifyCharityMembers } from "@/lib/notifyInbox";
import { logAudit } from "@/lib/auditLog";
import { toISODate } from "@/lib/calendarGrid";

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

/** المنشورُ ومعه إذنُ الموظَّف فيه — أو رسالةُ منعٍ تُعرض كما هي. */
async function loadPostForZad(postId: string) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" as const };

  const post = await prisma.mediaPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      charityId: true,
      content: true,
      platforms: true,
      imageUrl: true,
      imagePublicId: true,
      linkUrl: true,
      scheduledOn: true,
      scheduledAt: true,
      status: true,
      createdById: true,
      charity: { select: { name: true } },
    },
  });
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
  actorName?: string | null,
  note?: string | null
) {
  const notice = mediaNotice(kind, {
    charityName,
    day: typeof day === "string" ? day : toISODate(day),
    actorName,
    note,
  });
  if (!notice || notice.to !== "CHARITY") return;
  await notifyCharityMembers(charityId, "edit_media_plan", {
    title: notice.title,
    message: notice.message,
    link: portalMediaLink(charityName),
  });
}

/** المنشورُ كما تقرؤه الشاشة — بلا كائنات `Date` ولا حقولٍ لا تُعرض. */
export type MediaPostView = {
  id: string;
  scheduledOn: string;
  scheduledAt: string | null;
  content: string;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId: string | null;
  linkUrl: string | null;
  status: MediaStatus;
  createdByName: string | null;
  finalizedBy: string | null;
  finalizedSide: string | null;
};

export type MediaEventView = {
  id: string;
  kind: string;
  actorSide: string;
  actorName: string | null;
  note: string | null;
  at: string;
  before: MediaSnapshot | null;
};

function toView(post: {
  id: string;
  scheduledOn: Date;
  scheduledAt: string | null;
  content: string;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId: string | null;
  linkUrl: string | null;
  status: string;
  createdByName: string | null;
  finalizedBy: string | null;
  finalizedSide: string | null;
}): MediaPostView {
  return { ...post, scheduledOn: toISODate(post.scheduledOn), status: toStatus(post.status) };
}

const POST_FIELDS = {
  id: true,
  scheduledOn: true,
  scheduledAt: true,
  content: true,
  platforms: true,
  imageUrl: true,
  imagePublicId: true,
  linkUrl: true,
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
  if (!(await mayManageCharityMedia(session, charityId))) return { error: "لا صلاحية" };

  const from = dayValue(fromISO);
  const to = dayValue(toISO);
  if (!from || !to) return { error: "مدىً غير صحيح" };

  const posts = await prisma.mediaPost.findMany({
    where: { charityId, scheduledOn: { gte: from, lte: to } },
    orderBy: [{ scheduledOn: "asc" }, { scheduledAt: "asc" }],
    select: POST_FIELDS,
  });
  return { posts: posts.map(toView) };
}

/** المنشورُ وسجلُّه — للوحِ التفاصيل ولعرض ما تغيَّر. */
export async function getMediaPostDetail(postId: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };

  const [post, events] = await Promise.all([
    prisma.mediaPost.findUnique({ where: { id: postId }, select: POST_FIELDS }),
    prisma.mediaPostEvent.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        actorSide: true,
        actorName: true,
        note: true,
        before: true,
        createdAt: true,
      },
    }),
  ]);
  if (!post) return { error: "المنشور غير موجود" };

  return {
    post: toView(post),
    events: events.map<MediaEventView>((e) => ({
      id: e.id,
      kind: e.kind,
      actorSide: e.actorSide,
      actorName: e.actorName,
      note: e.note,
      at: e.createdAt.toISOString(),
      before: (e.before as MediaSnapshot | null) ?? null,
    })),
  };
}

export async function createMediaPost(input: MediaPostInput) {
  const session = await requireMediaSession();
  if (!session) return { error: "غير مصرح" };
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

  await tellCharity("CREATED", input.charityId, charity.name, cleaned.data.scheduledOn, session.name);

  revalidateCharity(charity.name);
  return { success: true, id: post.id };
}

/**
 * تعديلُ زادٍ للمنشور.
 *
 * ويعود المنشورُ بعده إلى اعتماد الجمعية أيّاً كانت حالتُه — فما غيّره زادٌ لم
 * ترَه الجمعيةُ بعد. وتعديلُ **المعتمَد** يلزمه سببٌ يُعرض عليها.
 */
export async function updateMediaPost(postId: string, input: MediaPostInput, note?: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };
  const { session, post, status } = loaded;

  if (!can("EDIT", status, "ZAD")) return { error: "لا يمكن تعديل المنشور في حالته الحالية" };

  const reason = (note ?? "").trim();
  if (requiresNote("EDIT", status, "ZAD") && !reason) {
    return { error: "اكتب سبب تعديل منشور معتمد — يعرض على الجمعية" };
  }

  // و`charityId` المُرسَلُ مع المُدخَل لا يُقرأ هنا أصلاً: جمعيةُ المنشور صفُّه،
  // والتعديلُ لا ينقله — فلا سبيل إلى نقلٍ بتغيير حقل.
  const cleaned = cleanInput(input);
  if ("error" in cleaned) return { error: cleaned.error };

  const before = snapshotOf(post);
  const after: MediaStatus = nextStatus("EDIT", status, "ZAD");

  await prisma.$transaction([
    prisma.mediaPost.update({
      where: { id: post.id },
      data: {
        ...cleaned.data,
        status: after,
        // عادَ إلى الانتظار، فتعميدُه السابقُ لم يعد قائماً.
        finalizedAt: null,
        finalizedBy: null,
        finalizedSide: null,
      },
    }),
    prisma.mediaPostEvent.create({
      data: {
        postId: post.id,
        kind: eventKind("EDIT", status, "ZAD"),
        actorSide: "ZAD",
        actorId: session.id,
        actorName: session.name ?? null,
        note: reason || null,
        before,
      },
    }),
  ]);

  // عادَ إلى اعتماد الجمعية، فتُنبَّه بما صار إليه — وبسببه إن كان مُسبَّباً.
  await tellCharity(
    eventKind("EDIT", status, "ZAD"),
    post.charityId,
    post.charity.name,
    cleaned.data.scheduledOn,
    session.name,
    reason
  );

  revalidateCharity(post.charity.name);
  return { success: true };
}

/** تعميدُ زادٍ لتعديل الجمعية — وبه يصير المنشورُ نهائيّاً. */
export async function certifyMediaPost(postId: string, note?: string) {
  return decide(postId, "CERTIFY", note);
}

/** ردُّ زادٍ لتعديل الجمعية: يُستعاد ما كان، ويعود المنشورُ إلى اعتمادها. */
export async function rejectMediaEdit(postId: string, note: string) {
  return decide(postId, "REJECT", note);
}

async function decide(postId: string, action: Extract<MediaAction, "CERTIFY" | "REJECT">, note?: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };
  const { session, post, status } = loaded;

  if (!can(action, status, "ZAD")) return { error: "لا يوجد تعديل بانتظار الاعتماد" };

  const reason = (note ?? "").trim();
  if (requiresNote(action, status, "ZAD") && !reason) {
    return { error: "اكتب سبب رد التعديل — يعرض على الجمعية" };
  }

  const after = nextStatus(action, status, "ZAD");
  const before = snapshotOf(post);

  // الردُّ يستعيد ما كان قبل تعديل الجمعية: وهو لقطةُ آخر حدثٍ منها.
  let restore: Partial<MediaSnapshot> | null = null;
  if (action === "REJECT") {
    const lastCharityEdit = await prisma.mediaPostEvent.findFirst({
      where: { postId: post.id, kind: "EDITED_BY_CHARITY" },
      orderBy: { createdAt: "desc" },
      select: { before: true },
    });
    const snapshot = lastCharityEdit?.before as MediaSnapshot | null;
    if (snapshot && typeof snapshot === "object") restore = snapshot;
  }

  await prisma.$transaction([
    prisma.mediaPost.update({
      where: { id: post.id },
      data: {
        status: after,
        ...(restore
          ? {
              content: restore.content ?? post.content,
              platforms: restore.platforms ?? post.platforms,
              imageUrl: restore.imageUrl ?? null,
              linkUrl: restore.linkUrl ?? null,
              scheduledAt: restore.scheduledAt ?? null,
              ...(restore.scheduledOn && dayValue(restore.scheduledOn)
                ? { scheduledOn: dayValue(restore.scheduledOn)! }
                : {}),
            }
          : {}),
        ...(after === MEDIA_STATUS.FINAL
          ? {
              finalizedAt: new Date(),
              finalizedBy: session.name ?? null,
              finalizedSide: "ZAD",
            }
          : { finalizedAt: null, finalizedBy: null, finalizedSide: null }),
      },
    }),
    prisma.mediaPostEvent.create({
      data: {
        postId: post.id,
        kind: eventKind(action, status, "ZAD"),
        actorSide: "ZAD",
        actorId: session.id,
        actorName: session.name ?? null,
        note: reason || null,
        before,
      },
    }),
  ]);

  await tellCharity(
    eventKind(action, status, "ZAD"),
    post.charityId,
    post.charity.name,
    post.scheduledOn,
    session.name,
    reason
  );

  revalidateCharity(post.charity.name);
  return { success: true };
}

export async function deleteMediaPost(postId: string) {
  const loaded = await loadPostForZad(postId);
  if ("error" in loaded) return { error: loaded.error };
  const { post, status } = loaded;

  if (!can("DELETE", status, "ZAD")) {
    return { error: "المنشور المعتمد لا يحذف — عدله بسبب يعرض على الجمعية" };
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
