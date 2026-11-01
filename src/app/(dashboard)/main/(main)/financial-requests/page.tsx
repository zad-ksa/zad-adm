import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { RELATION_JOIN, sortRequests, visibleRequestFilter } from "@/lib/requestQuery";
import { FINANCIAL_INCLUDE, serialiseFinancialRows } from "@/lib/financialRequestRow";
import {
  DEFAULT_VAT_RATE,
  FINANCE_ACCOUNTANT_KEY,
  FINANCE_MANAGER_KEY,
  VAT_RATE_SETTING_KEY,
  cleanSignatory,
  isValidVatRate,
} from "@/lib/financialRequest";
import FinancialRequestsClient from "./FinancialRequestsClient";

/**
 * صفحةُ الطلبات المالية — لكل موظف بلا شرط صلاحية.
 *
 * ولا بوابةَ عند الباب: الرؤيةُ تُقرَّر لكل طلبٍ على حدة في
 * `visibleRequestFilter` — طلباتُك، وما ينتظرك، وما بتَتَّ فيه. والصلاحيتان
 * المالِيّتان تُوسِّعان ما يُرى وتفتحان الإعدادات، ولا تُشترطان للدخول.
 */
export default async function FinancialRequestsPage() {
  const session = await getSession();
  if (!session?.id) redirect("/login");

  const perms = session.permissions || [];
  const canApprove = hasPermission(session.role, perms, "approve_financial_requests");
  const canReviewAll = canApprove || hasPermission(session.role, perms, "review_all_requests");
  const canManageSettings = hasPermission(session.role, perms, "manage_financial_settings");

  // كلُّها معاً: قاعدةُ البيانات في ap-southeast-2، وكلُّ انتظارٍ متسلسلٍ
  // ذهابٌ وعودةٌ كاملة — فتصير الكلفةُ أبطأَها لا مجموعَها.
  const [requests, types, settings, chain, allEmployees] = await Promise.all([
    prisma.request.findMany({
      ...RELATION_JOIN,
      where: visibleRequestFilter(session.id, { kind: "FINANCIAL", canReviewAll }),
      include: FINANCIAL_INCLUDE,
    }),
    prisma.financialRequestType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    // الثلاثةُ باستعلامٍ واحد: مفاتيحُها في جدولٍ واحد، وثلاثةُ استعلاماتٍ
    // ثلاثُ رحلاتٍ إلى ap-southeast-2.
    prisma.globalSetting.findMany({
      where: { key: { in: [VAT_RATE_SETTING_KEY, FINANCE_MANAGER_KEY, FINANCE_ACCOUNTANT_KEY] } },
      select: { key: true, value: true },
    }),
    // لا طلبَ بلا سلسلةٍ ماليةٍ نشطة: يُقال ذلك قبل تعبئة النموذج لا بعده.
    prisma.workflowChain.findFirst({
      where: { isActive: true, purpose: "FINANCIAL" },
      select: { steps: { select: { id: true }, take: 1 } },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    // إشعاراتُ الطلبات المالية وحدها تُطفأ هنا — شارةُ الاعتمادات العامة
    // ليست من شأن هذه الصفحة.
    prisma.requestNotification.updateMany({
      where: { employeeId: session.id, isRead: false, request: { kind: "FINANCIAL" } },
      data: { isRead: true },
    }),
  ]);

  const setting = (key: string) => settings.find((s) => s.key === key)?.value;
  const vatRate = isValidVatRate(setting(VAT_RATE_SETTING_KEY)) ? Number(setting(VAT_RATE_SETTING_KEY)) : DEFAULT_VAT_RATE;
  const managerName = cleanSignatory(setting(FINANCE_MANAGER_KEY));
  const accountantName = cleanSignatory(setting(FINANCE_ACCOUNTANT_KEY));
  const hasActiveChain = (chain?.steps.length ?? 0) > 0;
  const rows = serialiseFinancialRows(sortRequests(requests));

  return (
    <FinancialRequestsClient
      requests={rows}
      types={types}
      vatRate={vatRate}
      managerName={managerName}
      accountantName={accountantName}
      hasActiveChain={hasActiveChain}
      canReviewAll={canReviewAll}
      canManageSettings={canManageSettings}
      sessionId={session.id}
      allEmployees={allEmployees}
    />
  );
}
