import { getSession } from "@/lib/auth";
import { EXTERNAL_CHARITIES } from "@/lib/charityScope";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import CharityAccountsClient from "./CharityAccountsClient";
import { hasPermission } from "@/lib/permissions";
import { memberTitleOf } from "@/lib/charityPermissions";

export default async function CharityAccountsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const role = session.role || "";
  const perms = session.permissions || [];
  const can = (p: string) => hasPermission(role, perms, p);

  // Must have admin capabilities
  // manage_services نُزعت من هنا: صارت محصورةً في إضافة الخدمات وتسميتها
  // وحذفها ومنحها، ولا صلة لها بحسابات الجمعيات.
  if (!can("manage_charity_accounts") && !can("manage_employees")) {
    redirect("/main");
  }

  // Fetch all charities to populate the select dropdown.
  //
  // ومعها خدماتُ كلِّ جمعية: المُنتقي يَعرض خدماتِ الجمعية المختارة ثمّ صلاحيّاتِ
  // كلِّ خدمةٍ تحتها، فلا يُمنح ما لا تشمله الجمعيةُ ولا ما لا يعمل.
  const charityRows = await prisma.charity.findMany({
    where: EXTERNAL_CHARITIES,
    select: { id: true, name: true, services: { select: { name: true } } },
  });
  const charities = charityRows.map((c) => ({
    id: c.id,
    name: c.name,
    services: [...new Set(c.services.map((s) => s.name))].sort((a, b) => a.localeCompare(b, "ar")),
  }));

  // Fetch all charity user accounts
  const accounts = await prisma.charityUser.findMany({
    include: {
      charities: {
        include: {
          charity: { select: { name: true, id: true } },
          services: { select: { serviceName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <CharityAccountsClient
      charities={charities}
      canManage={can("manage_charity_accounts")}
      accounts={accounts.map(a => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        title: a.title,
        // عضويّاتُه بتفاصيلها: منها يُفتح لوحُ تعديل الوصول لجمعيةٍ بعينها.
        memberships: a.charities.map((c) => ({
          // ومسمّاه في هذه الجمعية، وإلّا فما على حسابه.
          title: memberTitleOf(c.title, a.title),
          charityId: c.charityId,
          charityName: c.charity.name,
          isOfficial: c.isAdmin,
          isActive: c.isActive,
          permissions: c.permissions as string[],
          services: c.services.map((s) => s.serviceName),
        })),
        createdAt: a.createdAt.toISOString()
      }))}
    />
  );
}
