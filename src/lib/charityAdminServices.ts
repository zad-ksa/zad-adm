/**
 * مواءمةُ تفويض مديري أنظمة الجمعيات مع خدمات جمعياتهم.
 *
 * والقاعدةُ مكتوبةٌ في `charityHr.ts`: من رُفع إلى `isAdmin` فُوِّض بخدمات
 * جمعيته كلِّها. لكنّ مجموعةَ الخدمات تتغيّر من جهةِ زاد لا من شاشة الموظفين —
 * تُضاف خدمةٌ لجمعيةٍ أو تُحذف — فينحرف التفويضُ عن المجموعة بلا أن يلمس أحدٌ
 * حساب المدير.
 *
 * فهذه الدالّةُ تُستدعى عقب كلِّ تغييرٍ لمجموعة خدمات جمعية. وهي **مُحايدةُ
 * التكرار**: تشغيلُها مرّتين كتشغيلها مرّة، فلا ضررَ في ندائها احتياطاً.
 *
 * وليست فعلاً (`"use server"`) عن قصد: تُنادى من أفعالٍ محروسةٍ أصلاً، ولو
 * صُدِّرت من ملفِّ أفعالٍ صارت مدخلاً مكشوفاً يُعيد التفويضَ لمن استدعاه.
 */

import { prisma } from "@/lib/db";

export type AdminServiceSync = {
  /** تفويضاتٌ أُضيفت. */
  added: number;
  /** تفويضاتٌ أُزيلت لأنّ خدمتها لم تبق في الجمعية. */
  removed: number;
};

/**
 * يُوائم تفويضَ مديري جمعيةٍ واحدةٍ — أو الجمعياتِ كلِّها حين لا يُمرَّر معرّف.
 *
 * ولا يمسّ تفويضَ من ليس مديراً بحال: عضوٌ عاديٌّ فُوِّض بخدمتين عن قصدٍ يبقى
 * عليهما، وإزالةُ خدمةٍ من جمعيةٍ تُزيل صفَّه هي الأخرى — لكنّ ذلك شأنُ
 * `deleteServiceFromCharity` لا شأنُ هذه الدالّة.
 */
export async function syncCharityAdminServices(charityId?: string): Promise<AdminServiceSync> {
  const admins = await prisma.charityUserCharity.findMany({
    where: {
      isAdmin: true,
      isActive: true,
      user: { isActive: true },
      ...(charityId ? { charityId } : {}),
    },
    select: {
      id: true,
      charityId: true,
      services: { select: { serviceName: true } },
    },
  });
  if (admins.length === 0) return { added: 0, removed: 0 };

  const charityIds = [...new Set(admins.map((a) => a.charityId))];
  const serviceRows = await prisma.service.findMany({
    where: { charityId: { in: charityIds } },
    select: { charityId: true, name: true },
  });

  const wanted = new Map<string, Set<string>>();
  for (const row of serviceRows) {
    if (!row.name.trim()) continue;
    if (!wanted.has(row.charityId)) wanted.set(row.charityId, new Set());
    wanted.get(row.charityId)!.add(row.name);
  }

  const toAdd: { membershipId: string; serviceName: string }[] = [];
  const toRemove: { membershipId: string; serviceName: string }[] = [];

  for (const admin of admins) {
    const want = wanted.get(admin.charityId) ?? new Set<string>();
    const held = new Set(admin.services.map((s) => s.serviceName));
    for (const name of want) if (!held.has(name)) toAdd.push({ membershipId: admin.id, serviceName: name });
    for (const name of held) if (!want.has(name)) toRemove.push({ membershipId: admin.id, serviceName: name });
  }

  if (toAdd.length === 0 && toRemove.length === 0) return { added: 0, removed: 0 };

  await prisma.$transaction(async (tx) => {
    // صفٌّ صفّاً بمفتاحه المركَّب: شرطٌ عامٌّ على الاسم قد يطال تفويضَ من ليس
    // مديراً، أو مديراً في جمعيةٍ أخرى تُقدِّم الخدمةَ فعلاً.
    for (const row of toRemove) {
      await tx.charityMemberService.deleteMany({
        where: { membershipId: row.membershipId, serviceName: row.serviceName },
      });
    }
    if (toAdd.length) {
      await tx.charityMemberService.createMany({ data: toAdd, skipDuplicates: true });
    }
  });

  return { added: toAdd.length, removed: toRemove.length };
}

/**
 * مثلُها، ولا يرفع استثناءً.
 *
 * تُنادى من أفعالٍ غايتُها شيءٌ آخر — إنشاءُ خدمةٍ أو حذفُها — فلا يجوز أن
 * يُسقِط فشلُ المواءمة العملَ الذي نجح. والانحرافُ يُصلحه نداءٌ تالٍ أو
 * `npm run grant:admin-services`.
 */
export async function syncCharityAdminServicesQuietly(charityId?: string): Promise<void> {
  try {
    await syncCharityAdminServices(charityId);
  } catch (error) {
    console.error("تعذّرت مواءمة تفويض مديري الجمعيات", charityId ?? "(الكل)", error);
  }
}
