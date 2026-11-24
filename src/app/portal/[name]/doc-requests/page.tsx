import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatCivilDate } from "@/lib/businessDays";
import { docAttachmentsOf } from "@/lib/docRequests";
import { requirePortalPermission } from "@/lib/portalAccess";
import { getDocRequestSettings } from "@/app/actions/docRequests";
import DocRequestsClient, { type PortalDocRequest } from "./DocRequestsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "طلبات وثائق المشاريع" };

/**
 * طلباتُ وثائق المشاريع كما تراها الجمعية.
 *
 * **والمحروسُ هنا كغيره**: الصلاحيّةُ تُفحص في الصفحة لا في الشريط — وكلُّ فعلٍ
 * يفحصها من جديد.
 *
 * **والقراءةُ محروسةٌ بـtry**: الجدولُ جديدٌ وقد لا يكون أُنشئ بعد، وتبويبٌ
 * يسقط على صفحة خطأٍ أسوأُ من تبويبٍ يقول «لا طلبات».
 */
export default async function PortalDocRequestsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { charity } = await requirePortalPermission(name, "view_doc_requests");

  let rows: PortalDocRequest[] = [];
  let tableMissing = false;
  try {
    const found = await prisma.docRequest.findMany({
      where: { charityId: charity.id },
      orderBy: { submittedAt: "desc" },
    });
    rows = found.map((r) => ({
      id: r.id,
      kind: r.kind,
      attachments: docAttachmentsOf(r.attachments),
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
      expectedCompletionDate: formatCivilDate(r.expectedCompletionDate),
      workingDays: r.workingDays,
      returnNote: r.returnNote,
      deliveryNote: r.deliveryNote,
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      deliveredAt: r.deliveredAt ? formatCivilDate(r.deliveredAt) : null,
      completedAt: r.completedAt ? formatCivilDate(r.completedAt) : null,
    }));
  } catch (error) {
    console.error("portal doc requests", error);
    tableMissing = true;
  }

  const settings = await getDocRequestSettings();

  return (
    <div className="space-y-5" dir="rtl">
      <DocRequestsClient
        charityName={charity.name}
        requests={rows}
        defaultWorkingDays={settings.defaultWorkingDays}
        tableMissing={tableMissing}
      />
    </div>
  );
}
