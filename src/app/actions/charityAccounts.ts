"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import {
  GRANTABLE_CHARITY_PERMISSION_IDS,
  sanitizeCharityPermissions,
} from "@/lib/charityPermissions";
import { logAudit } from "@/lib/auditLog";
import { CharityUserTitle } from "@prisma/client";
import { hashPassword, normalizeEmail, validateCredentialPair } from "@/lib/password";

export async function addCharityClientAccount(data: {
  name: string;
  phone: string;
  title: string;
  charityIds: string[];
  /**
   * Optional email login. Left blank, the account signs in with phone + OTP
   * like every account did before, and its owner can set these themselves
   * later from the portal. Supplying one without the other is refused.
   */
  email?: string | null;
  password?: string;
  /**
   * Makes the account an administrator of every charity it is linked to here.
   *
   * This is how a charity gets its FIRST administrator — nobody inside it can
   * appoint one before one exists. It used to be implied by the SYSTEM_ADMIN
   * title, which sat on the account and therefore applied everywhere at once;
   * the flag is written per link instead, so each charity can revoke it without
   * touching the others.
   */
  isAdmin?: boolean;
  /**
   * What the account may do inside every charity it is linked to here.
   *
   * Ignored when isAdmin is set: an administrator already passes every
   * permission check by standing, and storing a copy of the whole list
   * beside that would be a second source of truth — one that silently falls
   * behind the day a new permission is added to the catalogue.
   */
  permissions?: string[];
  /**
   * خدماتُ زادٍ التي يُفوَّض بها الحسابُ في كلِّ جمعيةٍ يُربط بها هنا.
   *
   * ولم تكن تُرسل أصلاً، فيُنشأ الحسابُ بصلاحيّاتٍ بلا تفويضٍ — وصلاحيّةُ الخدمة
   * لا تعمل إلا والخدمةُ مفوَّضة. فكان حسابٌ يُنشأ من هنا ويبقى لا يرى شيئاً حتى
   * تُفوِّضه جمعيتُه.
   */
  services?: string[];
}) {
  try {
    const session = await getSession();
    const canManage = hasPermission(session?.role || "", session?.permissions || [], "manage_charity_accounts");
    
    if (!canManage) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    if (!data.name || !data.phone || !data.title || !data.charityIds || data.charityIds.length === 0) {
      return { success: false, error: "جميع الحقول مطلوبة" };
    }

    // Re-checked here rather than trusted from the form: the client sends
    // whatever it likes regardless of which checkboxes it drew.
    //
    // وبـ`GRANTABLE` لا بكلِّ المعرّفات: كانت تُقبل المتقاعدةُ والمخفيّةُ بعلَمٍ
    // وتبويباتُ البوّابة — فيُخزَّن من هذا الباب ما لا تمنحه شاشةُ الجمعية ولا
    // تستطيع سحبَه، وما لا يعمل أصلاً.
    const requested = data.isAdmin === true ? [] : sanitizeCharityPermissions(data.permissions ?? []);
    const unknown = requested.filter((x) => !GRANTABLE_CHARITY_PERMISSION_IDS.includes(x));
    if (unknown.length > 0) {
      return { success: false, error: "صلاحية غير معروفة" };
    }
    const permissions = [...new Set(requested)];

    // Check if phone already exists in CharityUser
    const existing = await prisma.charityUser.findUnique({
      where: { phone: data.phone }
    });

    if (existing) {
      return { success: false, error: "رقم الجوال مسجل مسبقاً" };
    }

    const pairProblem = validateCredentialPair(data.email, data.password);
    if (pairProblem) return { success: false, error: pairProblem };

    const email = data.email?.trim() ? normalizeEmail(data.email) : null;

    if (email) {
      const emailTaken = await prisma.charityUser.findUnique({ where: { email } });
      if (emailTaken) {
        return { success: false, error: "البريد الإلكتروني مسجل مسبقاً" };
      }
    }

    // وتفويضُ الخدمات بأسمائها، ولا يُفوَّض بما لا تُقدّمه الجمعية: لكلِّ جمعيةٍ
    // صفوفُها. والحسابُ الرسميُّ يُفوَّض بخدماتها كلِّها.
    const offeredRows = await prisma.service.findMany({
      where: { charityId: { in: data.charityIds } },
      select: { charityId: true, name: true },
    });
    const offeredBy = new Map<string, string[]>();
    for (const row of offeredRows) {
      const list = offeredBy.get(row.charityId) ?? [];
      if (!list.includes(row.name)) list.push(row.name);
      offeredBy.set(row.charityId, list);
    }
    const wantedServices = [...new Set((data.services ?? []).map((s) => s.trim()).filter(Boolean))];
    const servicesFor = (charityId: string) => {
      const offered = offeredBy.get(charityId) ?? [];
      return data.isAdmin === true ? offered : offered.filter((name) => wantedServices.includes(name));
    };

    const newAccount = await prisma.charityUser.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email,
        password: email ? await hashPassword(data.password!.trim()) : null,
        // وحسابُ الجمعية مسمّاه «حساب الجمعية»: لا يُكتب له مسمّىً وظيفيٌّ لم يكن
        // له يوماً — وهو العمودُ الذي يُقرأ منه الوسمُ في كلِّ شاشة.
        title: (data.isAdmin === true ? "SYSTEM_ADMIN" : data.title) as CharityUserTitle,
        isActive: true,
        charities: {
          create: data.charityIds.map(id => ({
            charityId: id,
            isAdmin: data.isAdmin === true,
            permissions,
            services: { create: servicesFor(id).map((serviceName) => ({ serviceName })) },
          }))
        }
      },
      include: {
        charities: {
          include: {
            charity: { select: { id: true, name: true } },
            services: { select: { serviceName: true } },
          },
        },
      }
    });

    revalidatePath("/main/charity-accounts");

    return { 
      success: true, 
      account: {
        id: newAccount.id,
        name: newAccount.name,
        phone: newAccount.phone,
        title: newAccount.title,
        charityNames: newAccount.charities.map(c => c.charity.name),
        // والعضويّاتُ بتفاصيلها: الشاشةُ تُدرج الصفَّ الجديد كما تقرأ غيرَه، فلا
        // يبقى صفٌّ ناقصٌ لا يُفتح له لوحُ الصلاحيات حتى تُحدَّث الصفحة.
        memberships: newAccount.charities.map((c) => ({
          charityId: c.charityId,
          charityName: c.charity.name,
          isOfficial: c.isAdmin,
          isActive: c.isActive,
          permissions: c.permissions as string[],
          services: c.services.map((s) => s.serviceName),
        })),
        createdAt: newAccount.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    console.error("Error creating charity account:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء إنشاء الحساب" };
  }
}

export async function deleteCharityClientAccount(accountId: string) {
  try {
    const session = await getSession();
    const canManage = hasPermission(session?.role || "", session?.permissions || [], "manage_charity_accounts");
    
    if (!canManage) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    await prisma.charityUser.delete({
      where: { id: accountId }
    });

    revalidatePath("/main/charity-accounts");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting charity account:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء الحذف" };
  }
}

/**
 * تعديلُ وصولِ حسابٍ في جمعيةٍ بعينها: خدماتُه المفوَّضة، وصلاحيّاتُه، وكونُه
 * حسابَ الجمعية الرسميَّ.
 *
 * **ولمَ من زاد**: لم يكن للصلاحيات بابُ تعديلٍ من هنا أصلاً — إنشاءٌ وحذفٌ
 * فقط. فما كُتب عند الإنشاء يَثبُت، وحسابٌ أُنشئ بصلاحيّةٍ زائدةٍ لا تُسحب إلا
 * بحذفه. وجمعيةٌ بلا حسابٍ رسميٍّ لا تستطيع تصحيحَ شيءٍ بنفسها.
 *
 * وتُكتب في سجلّ التدقيق: منحُ صلاحيّةٍ بلا أثرٍ يُسأل عنه كان ملاحظةَ الفحص.
 */
export async function setCharityAccountAccess(input: {
  accountId: string;
  charityId: string;
  isOfficial: boolean;
  permissions: string[];
  services: string[];
}) {
  try {
    const session = await getSession();
    if (!hasPermission(session?.role || "", session?.permissions || [], "manage_charity_accounts")) {
      return { success: false as const, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    const link = await prisma.charityUserCharity.findUnique({
      where: {
        charityUserId_charityId: { charityUserId: input.accountId, charityId: input.charityId },
      },
      select: { id: true, isAdmin: true, user: { select: { name: true } }, charity: { select: { name: true } } },
    });
    if (!link) return { success: false as const, error: "لا عضويّةَ لهذا الحساب في هذه الجمعية" };

    // حسابُ الجمعية يحمل كلَّ شيءٍ محسوباً، فلا تُخزَّن له مصفوفةٌ تتخلّف عن
    // الكتالوج يومَ تُزاد صلاحيّة.
    const permissions = input.isOfficial
      ? []
      : [...new Set(sanitizeCharityPermissions(input.permissions))];
    const unknown = permissions.filter((p) => !GRANTABLE_CHARITY_PERMISSION_IDS.includes(p));
    if (unknown.length > 0) return { success: false as const, error: "صلاحية غير معروفة" };

    // ولا تُفوَّض خدمةٌ لا تُقدَّم لهذه الجمعية: تفويضٌ باسمٍ ليس في صفوفها يجعل
    // العضوَ «مفوَّضاً» بما لا وجود له.
    const wanted = [...new Set((input.services ?? []).map((s) => s.trim()).filter(Boolean))];
    const offered = await prisma.service.findMany({
      where: { charityId: input.charityId },
      select: { name: true },
      distinct: ["name"],
    });
    const offeredNames = new Set(offered.map((s) => s.name));
    // والحسابُ الرسميُّ يُفوَّض بخدمات الجمعية كلِّها.
    const services = input.isOfficial ? [...offeredNames] : wanted.filter((s) => offeredNames.has(s));
    const rejected = input.isOfficial ? [] : wanted.filter((s) => !offeredNames.has(s));
    if (rejected.length > 0) {
      return { success: false as const, error: `خدمة غير مشمولة للجمعية: ${rejected[0]}` };
    }

    // والمسمّى يتبع الصفة: مَن عُلِّم حسابَ الجمعية يُكتب مسمّاه «حساب الجمعية»،
    // ومن رُفعت عنه ولم يُكتب له مسمّىً يعود موظّفاً بدوامٍ كامل — فلا يبقى
    // وسمُ شيءٍ لم يعد هو. ويُمَسُّ العمودُ وهذه عضويّتُه الوحيدةُ فقط: المسمّى
    // على الحساب، ومشتركٌ مع كلِّ جمعيةٍ يخدمها.
    const soleMembership =
      (await prisma.charityUserCharity.count({ where: { charityUserId: input.accountId } })) === 1;
    const retitle =
      soleMembership && input.isOfficial !== link.isAdmin
        ? input.isOfficial
          ? "SYSTEM_ADMIN"
          : "FULL_TIME"
        : null;

    await prisma.$transaction([
      ...(retitle
        ? [
            prisma.charityUser.update({
              where: { id: input.accountId },
              data: { title: retitle as CharityUserTitle },
            }),
          ]
        : []),
      prisma.charityUserCharity.update({
        where: { id: link.id },
        data: { isAdmin: input.isOfficial, permissions },
      }),
      prisma.charityMemberService.deleteMany({ where: { membershipId: link.id } }),
      ...(services.length > 0
        ? [
            prisma.charityMemberService.createMany({
              data: services.map((serviceName) => ({ membershipId: link.id, serviceName })),
            }),
          ]
        : []),
    ]);

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session!.id,
      actorName: session!.name,
      action: "PERMISSION_CHANGE",
      targetType: "CharityUserCharity",
      targetId: link.id,
      metadata: {
        charity: link.charity.name,
        account: link.user.name,
        isOfficial: input.isOfficial,
        permissions,
        services,
      },
    });

    revalidatePath("/main/charity-accounts");
    return { success: true as const };
  } catch (error: any) {
    console.error("setCharityAccountAccess failed", error);
    return { success: false as const, error: error.message || "تعذّر حفظ الصلاحيات" };
  }
}
