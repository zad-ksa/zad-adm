"use server";

import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/encryption";
import { requireDonorViewer } from "@/lib/donorScope";
import { DONOR_KINDS, effectiveIntake } from "@/lib/donorOrg";
import { logAudit } from "@/lib/auditLog";
import type { DonorDocOrg } from "@/lib/donorAccountsDoc";

/**
 * صفوف مستند «حسابات الجهات المانحة» — جهة في كل صفحة.
 *
 * **ونطاق الرائي هو نطاق المستند**: الحسابات تقرا لجمعياته المسندة وحدها
 * (`requireDonorViewer`)، كما تعرض له في الصفحة سواء. فملف يجمع ما لا يراه على
 * الشاشة باب يخرج منه ما اغلقه الاسناد.
 *
 * **ويكتب في سجل التدقيق**: المستند يحمل كلمات مرور حسابات الجمعيات عند الجهات
 * — وتصدير جملتها فعل يسأل عنه، ولو كان كل سطر فيه معروضا لصاحبه في صفحته.
 */
export async function donorAccountsForDoc(): Promise<{ orgs: DonorDocOrg[] } | { error: string }> {
  try {
    const viewer = await requireDonorViewer();

    const orgs = await prisma.donorOrg.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        kind: true,
        url: true,
        fields: true,
        intakeStatus: true,
        opensAt: true,
        closesAt: true,
        accounts: {
          where: { charityId: { in: viewer.charityIds } },
          select: {
            username: true,
            password: true,
            charity: { select: { name: true } },
          },
        },
      },
    });

    const now = new Date();
    const kindLabel = (kind: string) =>
      DONOR_KINDS.find((item) => item.value === kind)?.label ?? "جهة مانحة";

    const rows: DonorDocOrg[] = orgs.map((org) => {
      const intake = effectiveIntake(org.intakeStatus, org.opensAt, org.closesAt, now);
      return {
        name: org.name,
        kindLabel: kindLabel(org.kind),
        url: org.url,
        fields: org.fields,
        intake: intake.reason,
        accounts: org.accounts
          .map((account) => ({
            charityName: account.charity.name,
            username: account.username,
            // والفك هنا لا في المتصفح: المخزن مشفر، والمستند يحتاجه مقروءا.
            password: decryptSecret(account.password),
          }))
          .sort((a, b) => a.charityName.localeCompare(b.charityName, "ar")),
      };
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: viewer.employeeId,
      action: "EXPORT",
      targetType: "DonorAccount",
      metadata: {
        document: "حسابات الجهات المانحة",
        orgs: rows.length,
        accounts: rows.reduce((sum, org) => sum + org.accounts.length, 0),
        charities: viewer.charityIds.length,
      },
    });

    return { orgs: rows };
  } catch (error) {
    console.error("donorAccountsForDoc", error);
    return { error: error instanceof Error ? error.message : "تعذر تجهيز المستند" };
  }
}
