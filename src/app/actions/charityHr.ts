"use server";

import { prisma } from "@/lib/db";
import { CharityUserTitle } from "@prisma/client";
import { AuthError, requireCharityPermission } from "@/lib/guards";
import {
  ALL_CHARITY_PERMISSION_IDS,
  grantableCharityPermissions,
  sanitizeCharityPermissions,
} from "@/lib/charityPermissions";
import { logAudit } from "@/lib/auditLog";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeSaudiPhone, saudiPhoneVariants } from "@/lib/phone";
import { hashPassword, normalizeEmail, validateCredentialPair } from "@/lib/password";

/**
 * Staff administration inside a single charity.
 *
 * Every exported function here is an HTTP entry point, so each one re-derives
 * the actor from the session and re-checks the permission against the charityId
 * it was given — the caller's charityId argument is untrusted input, and
 * requireCharityPermission is what turns it into a verified membership.
 */

function fail(error: string) {
  return { success: false as const, error };
}

/** Maps a thrown guard error to the standard refusal shape. */
function refuse(error: unknown, fallback: string) {
  if (error instanceof AuthError) return fail("غير مصرح لك بإجراء هذه العملية");
  console.error(fallback, error);
  return fail(fallback);
}

/**
 * خدمات هذه الجمعية بأسمائها. التفويض لا يتجاوزها: خدمةٌ ليست في الجمعية لا
 * تُفوَّض لأحد فيها، وخدمةٌ حُذفت تسقط بحذف صفوفها.
 */
async function checkCharityServices(
  charityId: string,
  names: string[]
): Promise<{ names: string[] } | { error: string }> {
  const wanted = [...new Set(names.map((n) => (n || "").trim()).filter(Boolean))];
  if (wanted.length === 0) return { names: [] };

  const rows = await prisma.service.findMany({
    where: { charityId, name: { in: wanted } },
    select: { name: true },
    distinct: ["name"],
  });
  const known = new Set(rows.map((r) => r.name));
  const missing = wanted.find((n) => !known.has(n));
  if (missing) return { error: `خدمة غير موجودة في الجمعية: ${missing}` };
  return { names: wanted };
}

/**
 * خدماتُ زاد المقدَّمةُ لهذه الجمعية — قائمةُ التفويض في شاشة الموظفين.
 *
 * وهي بعينها ما يُفوَّض به مديرُ نظام الجمعية تلقائيّاً، فلا تُكرَّر
 * الاستعلامةُ ولا يفترق المعروضُ عن المُطبَّق.
 */
async function charityServiceNames(charityId: string): Promise<string[]> {
  const rows = await prisma.service.findMany({
    where: { charityId },
    select: { name: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
  });
  return rows.map((r) => r.name).filter((n) => n.trim() !== "");
}

/** خدمات زاد المقدَّمة لهذه الجمعية — قائمة التفويض في شاشة الموظفين. */
export async function listCharityServices(charityId: string) {
  try {
    await requireCharityPermission(charityId, "manage_charity_users");
    return { success: true as const, data: await charityServiceNames(charityId) };
  } catch (error) {
    return refuse(error, "تعذّر تحميل خدمات الجمعية");
  }
}

/**
 * ما يُكتب في الصفّ بعد التحقّق — أو رسالةُ منعٍ تُعرض كما هي.
 *
 * **والمنحُ لحساب الجمعية الرسميِّ وحدَه.** وكانت القاعدةُ «تمنح ما تملك»، فمن
 * يحمل «إدارة حسابات موظفي الجمعية» يمنحها لغيره فيتوالد المانحون، وسحبُها من
 * واحدٍ لا يكفي. فمن يحملها اليومَ يُضيف موظّفاً ويُعطّله، ولا يمنح صلاحيّةً.
 *
 * وصلاحيّاتُ الخدمات تُخزَّن كما تُمنح — ولا تُسقَط كما كانت: خمودُها عند رفع
 * الخدمة يُحسب في `effectiveCharityPermissions`، فالصفُّ يحفظ ما قرّره مانحُه
 * وإعادةُ الخدمة تُعيده كما كان.
 */
function validateGrant(
  actorIsOfficial: boolean,
  requestedTitle: string,
  requestedPermissions: string[],
  requestedIsOfficial: boolean
): { permissions: string[] } | { error: string } {
  if (!Object.values(CharityUserTitle).includes(requestedTitle as CharityUserTitle)) {
    return { error: "المسمى الوظيفي غير صالح" };
  }

  // **ولا يُعيَّن حسابُ الجمعية من البوّابة أصلاً** — ولا من حساب الجمعية نفسِه:
  // هو الحسابُ الذي تُنشئه زادٌ للجمعية وتتحكّم به، فإعطاؤه لشخصٍ آخر من داخل
  // الجمعية نقلٌ لمفتاح البيت من غير صاحبه. فالعلَمُ يُكتب من شاشة زادٍ وحدَها
  // (`setCharityAccountAccess`).
  if (requestedIsOfficial) {
    return { error: "حسابُ الجمعية يُعيَّن من زاد" };
  }

  // Retired ids arrive here on every save of a membership created before the
  // retirement — the editor seeds its draft from what is stored. They are
  // dropped, not refused; only an id nobody ever defined is an error.
  const cleaned = sanitizeCharityPermissions(requestedPermissions);

  const unknown = cleaned.filter((p) => !ALL_CHARITY_PERMISSION_IDS.includes(p));
  if (unknown.length > 0) return { error: "صلاحية غير معروفة" };

  const grantable = new Set(grantableCharityPermissions(actorIsOfficial));
  const notGrantable = cleaned.filter((p) => !grantable.has(p));
  if (notGrantable.length > 0) {
    return { error: "منحُ الصلاحيات من حساب الجمعية وحدَه" };
  }

  return { permissions: cleaned };
}

export async function listCharityStaff(charityId: string) {
  try {
    await requireCharityPermission(charityId, "manage_charity_users");

    const links = await prisma.charityUserCharity.findMany({
      where: { charityId },
      include: {
        user: { select: { id: true, name: true, phone: true, title: true, isActive: true } },
        services: { select: { serviceName: true } },
      },
      orderBy: { assignedAt: "asc" },
    });

    return {
      success: true as const,
      data: links.map((l) => ({
        id: l.user.id,
        name: l.user.name,
        phone: l.user.phone,
        title: l.user.title as string,
        permissions: l.permissions,
        services: l.services.map((s) => s.serviceName),
        isAdmin: l.isAdmin,
        isActive: l.isActive,
        // Zad-level suspension, distinct from this charity's own deactivation.
        isAccountActive: l.user.isActive,
        assignedAt: l.assignedAt.toISOString(),
      })),
    };
  } catch (error) {
    return refuse(error, "تعذّر تحميل قائمة الموظفين");
  }
}

/**
 * Looks a phone up before creation so the UI can offer "this number already
 * belongs to <name> — add them to your charity?" (the flow chosen in decision 3).
 *
 * Deliberately narrow disclosure: name and phone only. Which OTHER charities the
 * person serves is not returned, because that would tell charity A's manager
 * about charity B's staffing, which is none of their business.
 *
 * Rate-limited per actor because it is, by construction, a phone-number oracle:
 * without a limit a manager could walk the number space and harvest names. The
 * limit is deliberately survivable — being blocked must degrade to "we could not
 * check", never to "you cannot add this employee", because createCharityStaff
 * re-runs the same lookup and asks for confirmation regardless.
 */
export async function lookupStaffByPhone(charityId: string, phone: string) {
  try {
    const { session } = await requireCharityPermission(charityId, "manage_charity_users");

    const rl = checkRateLimit(`charity-staff-lookup:${session.id}`, 60, 10 * 60 * 1000);
    if (!rl.allowed) {
      return fail(
        `عدد محاولات كبير، يرجى المحاولة بعد ${Math.ceil(rl.retryAfterSeconds / 60)} دقيقة`
      );
    }

    const canonical = normalizeSaudiPhone(phone);
    if (!canonical) return fail("رقم الجوال غير صحيح");

    const existing = await prisma.charityUser.findFirst({
      where: { phone: { in: saudiPhoneVariants(canonical) } },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        charities: { where: { charityId }, select: { isActive: true } },
      },
    });

    if (!existing) {
      return { success: true as const, data: { status: "AVAILABLE" as const } };
    }

    const linkHere = existing.charities[0];
    if (linkHere?.isActive) {
      return { success: true as const, data: { status: "ALREADY_IN_CHARITY" as const, name: existing.name } };
    }

    return {
      success: true as const,
      data: {
        status: linkHere ? ("DEACTIVATED_HERE" as const) : ("EXISTS_ELSEWHERE" as const),
        name: existing.name,
        phone: existing.phone,
        isAccountActive: existing.isActive,
      },
    };
  } catch (error) {
    return refuse(error, "تعذّر التحقق من رقم الجوال");
  }
}

/**
 * Creates a brand-new account, or — when the phone already exists and the caller
 * has confirmed — links the existing person to this charity.
 *
 * `confirmedExisting` must be sent by the client only after the user answered
 * "yes" to the confirmation dialog. It is not a security boundary (a crafted
 * request can set it); it exists so that an unconfirmed create never silently
 * attaches someone else's account. The actual protection is that linking grants
 * access to THIS charity only, and the linker already holds manage_charity_users
 * here.
 */
export async function createCharityStaff(
  charityId: string,
  data: {
    name: string;
    phone: string;
    title: string;
    permissions: string[];
    /** الخدمات المفوَّض لها العضو في هذه الجمعية. */
    services?: string[];
    /** Optional email login — see addCharityClientAccount. */
    email?: string | null;
    password?: string;
    isAdmin?: boolean;
    confirmedExisting?: boolean;
  }
) {
  try {
    const { session, isOfficial: actorIsOfficial } = await requireCharityPermission(
      charityId,
      "manage_charity_users"
    );

    const name = (data.name || "").trim();
    const canonical = normalizeSaudiPhone(data.phone || "");
    if (!canonical) return fail("رقم الجوال غير صحيح");

    const grant = validateGrant(
      actorIsOfficial,
      data.title,
      data.permissions || [],
      data.isAdmin === true
    );
    if ("error" in grant) return fail(grant.error);

    const checkedServices = await checkCharityServices(charityId, data.services || []);
    if ("error" in checkedServices) return fail(checkedServices.error);
    // والموظَّفُ الذي يُنشأ من البوّابة عضوٌ دائماً: حسابُ الجمعية يُعيَّن من زاد
    // (`setCharityAccountAccess`)، فلا ترقيةَ من هنا ولا تفويضَ مفروضاً بها.
    const services = checkedServices.names;

    const existing = await prisma.charityUser.findFirst({
      where: { phone: { in: saudiPhoneVariants(canonical) } },
      select: {
        id: true,
        name: true,
        charities: { where: { charityId }, select: { id: true, isActive: true } },
      },
    });

    // --- existing person -----------------------------------------------
    if (existing) {
      const linkHere = existing.charities[0];
      if (linkHere?.isActive) return fail("هذا الموظف مضاف بالفعل إلى الجمعية");
      if (!data.confirmedExisting) return fail("يلزم تأكيد إضافة الحساب المسجّل مسبقاً");

      // The account's own name/title belong to the person, not to this charity,
      // so they are left untouched here — a second charity must not be able to
      // rename someone else's account. Only membership and this charity's own
      // permissions and administrator flag are written.
      const link = linkHere
        ? await prisma.charityUserCharity.update({
            where: { id: linkHere.id },
            data: { isActive: true, permissions: grant.permissions, isAdmin: false },
          })
        : await prisma.charityUserCharity.create({
            data: {
              charityUserId: existing.id,
              charityId,
              permissions: grant.permissions,
              isAdmin: false,
            },
          });

      // التفويض في هذه الجمعية وحدها — استبدالاً لا إضافة.
      await prisma.charityMemberService.deleteMany({ where: { membershipId: link.id } });
      if (services.length > 0) {
        await prisma.charityMemberService.createMany({
          data: services.map((serviceName) => ({ membershipId: link.id, serviceName })),
        });
      }

      await logAudit({
        actorType: "CHARITY_USER",
        actorId: session.id,
        actorName: session.name,
        action: linkHere ? "CHARITY_STAFF_REACTIVATED" : "CHARITY_STAFF_LINKED",
        targetType: "CharityUser",
        targetId: existing.id,
        metadata: { charityId, permissions: grant.permissions },
      });

      return {
        success: true as const,
        data: { id: existing.id, name: existing.name, linked: true, linkId: link.id },
      };
    }

    // --- new person ------------------------------------------------------
    if (!name) return fail("الاسم مطلوب");

    // Only on the new-person branch: the existing-person branch above
    // deliberately writes nothing to the account itself, because that account
    // belongs to the person and to whatever other charity they serve.
    const pairProblem = validateCredentialPair(data.email, data.password);
    if (pairProblem) return fail(pairProblem);

    const email = data.email?.trim() ? normalizeEmail(data.email) : null;
    if (email) {
      const emailTaken = await prisma.charityUser.findUnique({ where: { email } });
      if (emailTaken) return fail("البريد الإلكتروني مسجل مسبقاً");
    }

    const created = await prisma.charityUser.create({
      data: {
        name,
        phone: canonical,
        email,
        password: email ? await hashPassword(data.password!.trim()) : null,
        title: data.title as CharityUserTitle,
        isActive: true,
        charities: {
          create: {
            charityId,
            permissions: grant.permissions,
            isAdmin: false,
            // والمسمّى في العضويّة: الجمعيةُ تُسمّي عضوَها عندها لا عند غيرها.
            title: data.title as CharityUserTitle,
          },
        },
      },
      select: {
        id: true,
        name: true,
        charities: { where: { charityId }, select: { id: true } },
      },
    });

    const membershipId = created.charities[0]?.id;
    if (membershipId && services.length > 0) {
      await prisma.charityMemberService.createMany({
        data: services.map((serviceName) => ({ membershipId, serviceName })),
      });
    }

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "CHARITY_STAFF_CREATED",
      targetType: "CharityUser",
      targetId: created.id,
      metadata: {
        charityId,
        title: data.title,
        permissions: grant.permissions,
        services,
        isAdmin: false,
      },
    });

    return { success: true as const, data: { id: created.id, name: created.name, linked: false } };
  } catch (error) {
    return refuse(error, "تعذّر إضافة الموظف");
  }
}

/**
 * Updates one member's title and permissions within this charity.
 *
 * Self-edit is refused outright: without that rule, the subset check is
 * pointless for anyone who already holds manage_charity_users — they could
 * simply grant themselves the rest.
 */
export async function updateCharityStaff(
  charityId: string,
  targetUserId: string,
  data: { title: string; permissions: string[]; services?: string[]; isAdmin?: boolean }
) {
  try {
    const { session, isOfficial: actorIsOfficial } = await requireCharityPermission(
      charityId,
      "manage_charity_users"
    );

    if (targetUserId === session.id) {
      return fail("لا يمكنك تعديل صلاحيات حسابك الشخصي");
    }

    const link = await prisma.charityUserCharity.findUnique({
      where: { charityUserId_charityId: { charityUserId: targetUserId, charityId } },
      select: { id: true, isAdmin: true, permissions: true, user: { select: { title: true } } },
    });
    if (!link) return fail("الموظف غير موجود في هذه الجمعية");

    // **وحسابُ الجمعية لا يُعدَّل من البوّابة** — ولا من نفسِه: صلاحيّاتُه محسوبةٌ
    // لا مخزَّنةٌ، وخدماتُه كلُّ خدمات الجمعية، فلا شيءَ فيه يُحرَّر هنا. وهو
    // حسابُ زادٍ في الجمعية، فتحريرُه من شاشتها.
    if (link.isAdmin) {
      return fail("حسابُ الجمعية يُدار من زاد");
    }

    const grant = validateGrant(
      actorIsOfficial,
      data.title,
      data.permissions || [],
      data.isAdmin === true
    );
    if ("error" in grant) return fail(grant.error);

    let services: string[] | null = null;
    if (data.services !== undefined) {
      const checked = await checkCharityServices(charityId, data.services);
      if ("error" in checked) return fail(checked.error);
      services = checked.names;
    }
    // ولا شيءَ يُستبقى من الصفِّ القديم: المُنتقي يَعرض كلَّ ما يجوز منحُه —
    // صلاحيّاتِ الخدمات والإدارةِ معاً — فالمُرسَلُ هو القرارُ كاملاً. وكان
    // يُستبقى منه تبويباتُ البوّابة لأنّ المُنتقي لم يكن يعرضها، فكان سحبُها
    // متعذّراً من أيِّ شاشة.
    const permissions = grant.permissions;

    // The job title lives on the account, shared with every other charity this
    // person serves, so one charity must not relabel someone on another
    // charity's screen. Editing it is allowed only while this is their sole
    // membership — which covers ordinary staff and the "fix a typo" case —
    // and refused explicitly, rather than ignored, once a second charity is
    // involved. Resubmitting the unchanged title is always fine, so the normal
    // permissions edit is never blocked by this.
    const titleChanged = data.title !== link.user.title;
    if (titleChanged) {
      const otherMemberships = await prisma.charityUserCharity.count({
        where: { charityUserId: targetUserId, NOT: { charityId } },
      });
      if (otherMemberships > 0) {
        return fail("لا يمكن تغيير المسمى الوظيفي لحساب مشترك مع جمعية أخرى");
      }
    }

    await prisma.$transaction([
      prisma.charityUserCharity.update({
        where: { id: link.id },
        data: {
          permissions,
          isAdmin: false,
          ...(titleChanged ? { title: data.title as CharityUserTitle } : {}),
        },
      }),
      ...(services === null
        ? []
        : [
            prisma.charityMemberService.deleteMany({ where: { membershipId: link.id } }),
            ...(services.length > 0
              ? [
                  prisma.charityMemberService.createMany({
                    data: services.map((serviceName) => ({ membershipId: link.id, serviceName })),
                  }),
                ]
              : []),
          ]),
    ]);

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "PERMISSION_CHANGE",
      targetType: "CharityUser",
      targetId: targetUserId,
      metadata: { charityId, permissions, services, isAdmin: false },
    });

    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر تحديث بيانات الموظف");
  }
}

/**
 * Activates/deactivates a membership. Never deletes: attendance history and the
 * record of who held what must survive, and the person may serve other charities
 * that this charity has no business touching.
 */
export async function setCharityStaffActive(
  charityId: string,
  targetUserId: string,
  isActive: boolean
) {
  try {
    const { session } = await requireCharityPermission(charityId, "manage_charity_users");

    if (targetUserId === session.id) {
      return fail("لا يمكنك تعطيل حسابك الشخصي");
    }

    const link = await prisma.charityUserCharity.findUnique({
      where: { charityUserId_charityId: { charityUserId: targetUserId, charityId } },
      select: { id: true, isAdmin: true, user: { select: { name: true } } },
    });
    if (!link) return fail("الموظف غير موجود في هذه الجمعية");

    // وحسابُ الجمعية لا يُعطَّل من البوّابة: هو حسابُ زادٍ فيها، وتعطيلُه من
    // داخلها يقطع البابَ الذي تُصحَّح منه الصلاحيّاتُ كلُّها.
    if (link.isAdmin) {
      return fail("حسابُ الجمعية يُدار من زاد");
    }

    await prisma.charityUserCharity.update({
      where: { id: link.id },
      data: { isActive },
    });

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: isActive ? "CHARITY_STAFF_ACTIVATED" : "CHARITY_STAFF_DEACTIVATED",
      targetType: "CharityUser",
      targetId: targetUserId,
      metadata: { charityId },
    });

    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر تحديث حالة الموظف");
  }
}
