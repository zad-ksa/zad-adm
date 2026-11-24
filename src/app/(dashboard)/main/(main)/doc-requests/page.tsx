export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/console/layout";
import { Note } from "@/components/console/ui";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatCivilDate } from "@/lib/businessDays";
import { docAttachmentsOf } from "@/lib/docRequests";
import { getDocRequestSettings } from "@/app/actions/docRequests";
import DocRequestsStaffClient, { type StaffDocRequest } from "./DocRequestsStaffClient";

export const metadata = { title: "طلبات وثائق المشاريع | زاد التنموية" };

/**
 * طلباتُ الجمعيات لإنشاء وثائق المشاريع — شاشةُ التنفيذ.
 *
 * **وصلاحيّتُها صلاحيّةُ المنشئ** (`use_project_builder`): من يكتب الوثيقةَ هو
 * من يملك الأداةَ التي تكتبها، فلا صلاحيّةَ ثانيةٌ تُمنح وتُنسى. والإعدادُ
 * لصاحب `manage_project_builder` كإعدادات الأداة.
 */
export default async function DocRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/main");
  if (!hasPermission(session.role, session.permissions || [], "use_project_builder")) redirect("/main");

  const canManage = hasPermission(session.role, session.permissions || [], "manage_project_builder");

  let rows: StaffDocRequest[] = [];
  let tableMissing = false;
  try {
    const found = await prisma.docRequest.findMany({
      orderBy: [{ status: "asc" }, { expectedCompletionDate: "asc" }],
      include: {
        charity: { select: { id: true, name: true } },
        submittedBy: { select: { name: true } },
        generatedBy: { select: { name: true } },
        deliveredBy: { select: { name: true } },
      },
    });
    rows = found.map((r) => ({
      id: r.id,
      kind: r.kind,
      attachments: docAttachmentsOf(r.attachments),
      charityId: r.charity.id,
      charityName: r.charity.name,
      programName: r.programName,
      programIdea: r.programIdea,
      beneficiariesCount: r.beneficiariesCount,
      programDuration: r.programDuration,
      targetCategory: r.targetCategory,
      startDate: r.startDate,
      endDate: r.endDate,
      budgetInclude: r.budgetInclude,
      budgetTotal: r.budgetTotal,
      note: r.note,
      status: r.status,
      submittedAt: formatCivilDate(r.submittedAt),
      submittedByName: r.submittedBy?.name ?? null,
      expectedCompletionDate: formatCivilDate(r.expectedCompletionDate),
      expectedCompletionAt: r.expectedCompletionDate.getTime(),
      workingDays: r.workingDays,
      hasDocument: !!r.docContent,
      docContent: r.docContent,
      builderOptions: r.builderOptions as Record<string, unknown> | null,
      generatedAt: r.generatedAt ? formatCivilDate(r.generatedAt) : null,
      generatedByName: r.generatedBy?.name ?? null,
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      deliveredAt: r.deliveredAt ? formatCivilDate(r.deliveredAt) : null,
      deliveredByName: r.deliveredBy?.name ?? null,
      deliveryNote: r.deliveryNote,
      returnNote: r.returnNote,
      completedAt: r.completedAt ? formatCivilDate(r.completedAt) : null,
    }));
  } catch (error) {
    console.error("staff doc requests", error);
    tableMissing = true;
  }

  const settings = await getDocRequestSettings();

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<FileText className="size-6" />}
        title="طلبات وثائق المشاريع"
        description="ما ترفعه الجمعيات من طلبات، وكتابة وثائقها وتسليمها."
      />

      {tableMissing ? (
        <Note tone="warn">
          جدول الطلبات غير موجود بعد. طبق <span className="font-semibold">prisma/sql/doc-requests.sql</span> ثم
          أعد تحميل الصفحة.
        </Note>
      ) : (
        <DocRequestsStaffClient requests={rows} settings={settings} canManage={canManage} />
      )}
    </div>
  );
}
