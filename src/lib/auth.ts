import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { sanitizePermissions } from "@/lib/permissions";
// نوعٌ فقط: يُمحى عند الترجمة فلا يُسحَب Prisma إلى حزمة proxy.ts، وهي التي
// تستورد decrypt/encrypt من هذا الملف. ولهذا السبب نفسه يبقى prisma استيراداً
// ديناميكياً داخل getSession.
import type { PrismaClient } from "@prisma/client";

function getSecretKey() {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return new TextEncoder().encode(secretKey);
}

// Session lifetime: 24h, refreshed on every authenticated request via the
// sliding-renewal logic in src/proxy.ts — active users never get logged out
// mid-use, but an abandoned/stolen cookie expires within a day of last use.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, getSecretKey(), {
    algorithms: ["HS256"],
  });
  return payload;
}

/**
 * صلاحيات المجموعات: ما يصل الموظف من مجموعاته ومن مجموعات مسمّاه الوظيفي.
 *
 * تُقرأ في كل جلسة ولا تُنسخ إلى Employee.permissions — وهذا الفرق كلّه بينها
 * وبين «مزامنة» المسمى، التي تنسخ نسخاً فتدهس ما كان للموظف ولا تسري على
 * تعديلٍ لاحق. تعديل المجموعة يسري على حامليها في اللحظة.
 *
 * استعلامٌ واحد للاثنين: OR على الجدولين أرخص من نداءين، وgetSession مُغلَّفة
 * بـcache فلا تتكرّر في الطلب الواحد.
 */
async function resolveBundles(
  prisma: PrismaClient,
  employeeId: string,
  roleKey?: string | null
): Promise<{ permissions: string[]; hasServices: boolean }> {
  const rows = await prisma.permissionBundle.findMany({
    where: {
      OR: [
        { employees: { some: { employeeId } } },
        ...(roleKey ? [{ roles: { some: { role: { key: roleKey } } } }] : []),
      ],
    },
    select: { permissions: true, services: true },
  });
  return {
    permissions: rows.flatMap((r) => r.permissions),
    hasServices: rows.some((r) => r.services.length > 0),
  };
}

/**
 * «عرض الخدمات» لا تُمنح، بل تُستنتج.
 *
 * لم تكن لها قيمة لذاتها: تفتح تبويباً لا معنى له لمن لا خدمةَ له فيه، وكان
 * يمكن أن تُمنح بلا خدمة فيرى صاحبها صفحةً فارغة، أو تُنسى مع منح خدمةٍ فلا
 * يرى ما مُنح. فصارت تابعةً للخدمة: من مُنح خدمةً — مباشرةً أو بمجموعةٍ له أو
 * لمسمّاه — فُتح له التبويب، ومن لا فلا.
 *
 * وتُضاف بعد sanitizePermissions لا قبلها: المُعرّف متقاعد، فالتنقية تنزعه من
 * المصفوفات المخزّنة — وهذا هو المقصود، أن لا يبقى مُنحاً بيد أحد.
 */
const SERVICES_TAB = "view_services_overview";

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;
  try {
    const session = await decrypt(sessionCookie);
    
    const { prisma } = await import("@/lib/db");
    
    if (session.userType === "CHARITY_USER") {
      const charUser = await prisma.charityUser.findUnique({
        where: { id: session.id },
        select: { name: true, title: true, isActive: true }
      });
      if (!charUser || !charUser.isActive) return null; // inactive or deleted

      session.name = charUser.name;
      // Job label only — for display. Never test it to decide what someone may
      // do: it is stored per ACCOUNT, so any authority derived from it applies
      // in every charity the person belongs to at once. Administrator standing
      // is `CharityUserCharity.isAdmin`, resolved per charity by the guards in
      // lib/guards.ts.
      session.title = charUser.title;

      // Permissions come from the CharityUserCharity link of the ACTIVE charity,
      // not from CharityUser — an account linked to several charities holds a
      // separate permission set in each, and reading the per-account field would
      // carry authority granted in one charity into all the others.
      //
      // No link row (charity not selected yet, or membership revoked) means no
      // permissions at all; page guards then reject as they should.
      let charityPermissions: string[] = [];
      if (session.charityId) {
        const link = await prisma.charityUserCharity.findUnique({
          where: {
            charityUserId_charityId: {
              charityUserId: session.id,
              charityId: session.charityId,
            },
          },
          select: { permissions: true, isActive: true },
        });
        charityPermissions = link?.isActive ? link.permissions : [];
      }
      session.permissions = charityPermissions;

      return session;
    }
    
    // Employee Logic
    const isDeveloper = session.permissions?.includes("developer_mode");
    session.isDeveloper = isDeveloper;
    
    if (isDeveloper) {
      const overrideEmployeeId = cookieStore.get("dev_employee_override")?.value;
      if (overrideEmployeeId && overrideEmployeeId !== "DEVELOPER_RESET") {
        const emp = await prisma.employee.findUnique({
          where: { id: overrideEmployeeId },
          select: {
            id: true, name: true, role: true, permissions: true, charityId: true, avatarUrl: true,
            _count: { select: { serviceAccess: true } },
          }
        });
        
        if (emp) {
          session.originalId = session.id;
          session.originalRole = session.role;
          session.id = emp.id;
          session.name = emp.name;
          session.role = emp.role;
          // مجموعات الموظف المُنتحَل شخصيّته، لا مجموعات المطوّر: الانتحال
          // يعني أن يرى ما يراه هو بالضبط.
          const impersonated = await resolveBundles(prisma, emp.id, emp.role);
          const merged = sanitizePermissions([...emp.permissions, ...impersonated.permissions]);
          if (emp._count.serviceAccess > 0 || impersonated.hasServices) merged.push(SERVICES_TAB);
          session.permissions = merged;
          session.charityId = emp.charityId;
          session.avatarUrl = emp.avatarUrl;
        }
      }
    } else {
      // Sync real employee permissions for regular users dynamically
      const emp = await prisma.employee.findUnique({
        where: { id: session.id },
        select: {
          permissions: true,
          role: true,
          isActive: true,
          // العدّ في الاستعلام نفسه: منحُ خدمةٍ واحد هو ما يفتح تبويب الخدمات،
          // ونداءٌ ثانٍ في كل طلبٍ من أجل رقمٍ واحد ثمنٌ لا داعي له.
          _count: { select: { serviceAccess: true } },
        },
      });
      if (emp && emp.isActive) {
        const bundles = await resolveBundles(prisma, session.id, emp.role);
        const merged = sanitizePermissions([...emp.permissions, ...bundles.permissions]);
        if (emp._count.serviceAccess > 0 || bundles.hasServices) merged.push(SERVICES_TAB);
        session.permissions = merged;
        session.role = emp.role;
      } else {
        return null;
      }
    }
    
    return session;
  } catch (error) {
    return null;
  }
});
