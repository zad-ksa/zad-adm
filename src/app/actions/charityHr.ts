"use server";

import { prisma } from "@/lib/db";
import { CharityUserTitle } from "@prisma/client";
import { AuthError, requireCharityPermission } from "@/lib/guards";
import {
  ALL_CHARITY_PERMISSION_IDS,
  grantableCharityPermissions,
} from "@/lib/charityPermissions";
import { logAudit } from "@/lib/auditLog";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeSaudiPhone, saudiPhoneVariants } from "@/lib/phone";

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
 * Active administrators of this charity, excluding one person.
 *
 * Counted from the link rows, so it reflects who administers THIS charity —
 * the account-wide title it replaces meant a promotion elsewhere could quietly
 * satisfy this check, and a demotion elsewhere could quietly break it.
 * `user.isActive` is still consulted: a Zad-suspended account administers
 * nothing anywhere.
 */
async function countOtherActiveAdmins(charityId: string, excludeUserId: string) {
  return prisma.charityUserCharity.count({
    where: {
      charityId,
      isActive: true,
      isAdmin: true,
      user: { isActive: true },
      NOT: { charityUserId: excludeUserId },
    },
  });
}

/**
 * Validates a requested grant against the anti-escalation rules of the plan
 * (§3.4). Returns the cleaned set, or an error string.
 *
 *  - subset rule: nobody hands out authority they do not hold themselves
 *  - administrator standing may only be conferred by an administrator, and only
 *    within the charity the actor administers
 *  - unknown permission ids are rejected rather than silently stored
 *
 * The requested title is validated as a label only. It confers nothing, so no
 * title needs guarding — `isAdmin` is the whole of the authority question now.
 */
function validateGrant(
  actorIsAdmin: boolean,
  actorPermissions: string[],
  requestedTitle: string,
  requestedPermissions: string[],
  requestedIsAdmin: boolean
): { permissions: string[]; isAdmin: boolean } | { error: string } {
  if (!Object.values(CharityUserTitle).includes(requestedTitle as CharityUserTitle)) {
    return { error: "المسمى الوظيفي غير صالح" };
  }

  if (requestedIsAdmin && !actorIsAdmin) {
    return { error: "لا يمكن تعيين مدير للجمعية إلا من قِبل مدير" };
  }

  const unknown = requestedPermissions.filter(
    (p) => !ALL_CHARITY_PERMISSION_IDS.includes(p)
  );
  if (unknown.length > 0) return { error: "صلاحية غير معروفة" };

  const grantable = new Set(grantableCharityPermissions(actorIsAdmin, actorPermissions));
  const notGrantable = requestedPermissions.filter((p) => !grantable.has(p));
  if (notGrantable.length > 0) {
    return { error: "لا يمكنك منح صلاحية لا تملكها" };
  }

  return { permissions: Array.from(new Set(requestedPermissions)), isAdmin: requestedIsAdmin };
}

export async function listCharityStaff(charityId: string) {
  try {
    await requireCharityPermission(charityId, "manage_charity_users");

    const links = await prisma.charityUserCharity.findMany({
      where: { charityId },
      include: {
        user: { select: { id: true, name: true, phone: true, title: true, isActive: true } },
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
    isAdmin?: boolean;
    confirmedExisting?: boolean;
  }
) {
  try {
    const {
      session,
      permissions: actorPermissions,
      isAdmin: actorIsAdmin,
    } = await requireCharityPermission(charityId, "manage_charity_users");

    const name = (data.name || "").trim();
    const canonical = normalizeSaudiPhone(data.phone || "");
    if (!canonical) return fail("رقم الجوال غير صحيح");

    const grant = validateGrant(
      actorIsAdmin,
      actorPermissions,
      data.title,
      data.permissions || [],
      data.isAdmin === true
    );
    if ("error" in grant) return fail(grant.error);

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
            data: { isActive: true, permissions: grant.permissions, isAdmin: grant.isAdmin },
          })
        : await prisma.charityUserCharity.create({
            data: {
              charityUserId: existing.id,
              charityId,
              permissions: grant.permissions,
              isAdmin: grant.isAdmin,
            },
          });

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

    const created = await prisma.charityUser.create({
      data: {
        name,
        phone: canonical,
        title: data.title as CharityUserTitle,
        isActive: true,
        charities: {
          create: { charityId, permissions: grant.permissions, isAdmin: grant.isAdmin },
        },
      },
      select: { id: true, name: true },
    });

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
        isAdmin: grant.isAdmin,
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
  data: { title: string; permissions: string[]; isAdmin?: boolean }
) {
  try {
    const {
      session,
      permissions: actorPermissions,
      isAdmin: actorIsAdmin,
    } = await requireCharityPermission(charityId, "manage_charity_users");

    if (targetUserId === session.id) {
      return fail("لا يمكنك تعديل صلاحيات حسابك الشخصي");
    }

    const link = await prisma.charityUserCharity.findUnique({
      where: { charityUserId_charityId: { charityUserId: targetUserId, charityId } },
      select: { id: true, isAdmin: true, user: { select: { title: true } } },
    });
    if (!link) return fail("الموظف غير موجود في هذه الجمعية");

    // Demoting an existing administrator is itself an administrator-only act;
    // otherwise a user with manage_charity_users could strip the charity's
    // administrator and take the charity over. Read from the link, so it is this
    // charity's administrators that are protected, not another charity's.
    if (link.isAdmin && !actorIsAdmin) {
      return fail("لا يمكن تعديل حساب مدير الجمعية إلا من قِبل مدير");
    }

    const grant = validateGrant(
      actorIsAdmin,
      actorPermissions,
      data.title,
      data.permissions || [],
      data.isAdmin === true
    );
    if ("error" in grant) return fail(grant.error);

    // Removing the last administrator would leave the charity unable to manage
    // its own accounts, recoverable only by Zad staff.
    if (link.isAdmin && !grant.isAdmin) {
      const remaining = await countOtherActiveAdmins(charityId, targetUserId);
      if (remaining === 0) return fail("لا يمكن إزالة آخر مدير في الجمعية");
    }

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
      ...(titleChanged
        ? [
            prisma.charityUser.update({
              where: { id: targetUserId },
              data: { title: data.title as CharityUserTitle },
            }),
          ]
        : []),
      prisma.charityUserCharity.update({
        where: { id: link.id },
        data: { permissions: grant.permissions, isAdmin: grant.isAdmin },
      }),
    ]);

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "PERMISSION_CHANGE",
      targetType: "CharityUser",
      targetId: targetUserId,
      metadata: { charityId, permissions: grant.permissions, isAdmin: grant.isAdmin },
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
    const { session, isAdmin: actorIsAdmin } = await requireCharityPermission(
      charityId,
      "manage_charity_users"
    );

    if (targetUserId === session.id) {
      return fail("لا يمكنك تعطيل حسابك الشخصي");
    }

    const link = await prisma.charityUserCharity.findUnique({
      where: { charityUserId_charityId: { charityUserId: targetUserId, charityId } },
      select: { id: true, isAdmin: true, user: { select: { name: true } } },
    });
    if (!link) return fail("الموظف غير موجود في هذه الجمعية");

    if (link.isAdmin && !actorIsAdmin) {
      return fail("لا يمكن تعطيل حساب مدير الجمعية إلا من قِبل مدير");
    }

    // Refuse to remove the charity's last active administrator — the charity
    // would be left with nobody able to manage accounts, recoverable only by
    // Zad staff.
    if (!isActive && link.isAdmin) {
      const remainingAdmins = await countOtherActiveAdmins(charityId, targetUserId);
      if (remainingAdmins === 0) {
        return fail("لا يمكن تعطيل آخر مدير في الجمعية");
      }
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
