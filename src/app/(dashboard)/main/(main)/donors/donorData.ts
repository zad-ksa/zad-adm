import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/encryption";
import { effectiveIntake, type DonorKind, type IntakeMode, type IntakeStatus } from "@/lib/donorOrg";
import type { DonorViewer } from "@/lib/donorScope";

/**
 * قراءةُ صفحات الجهات المانحة — بنطاق الرائي.
 *
 * موضعٌ واحدٌ لثلاث صفحات (الجهات، منصة إحسان، صندوق دعم الجمعيات) لأن
 * الثلاثةَ شيءٌ واحدٌ باختلاف `kind`. والتواريخُ تُصاغ هنا لا في المتصفّح:
 * الخادمُ والمتصفّحُ قد يختلفان في المنطقة الزمنية، فتختلف صياغةُ اليوم بين
 * أول رسمٍ وثانيه.
 */
export type DonorRow = {
  id: string;
  name: string;
  url: string | null;
  fields: string | null;
  notes: string | null;
  /** الحالةُ الفعلية — محسوبةٌ من التاريخين إن وُجدا. */
  intakeStatus: IntakeStatus;
  intakeMode: IntakeMode;
  /** كيف عُرفت الحالة: «مفتوحٌ حتى …» أو «مغلقٌ بضبطٍ يدوي». */
  intakeReason: string;
  /** المخزَّنُ في الصفّ — يُعرض في لوحة التعديل لا في البطاقة. */
  storedStatus: IntakeStatus;
  /** مصوغان للعرض. */
  opensAt: string | null;
  closesAt: string | null;
  /** `yyyy-mm-dd` لحقل التاريخ في نموذج التعديل. */
  opensAtInput: string | null;
  closesAtInput: string | null;

  /** جمعياتُ الرائي التي لها حسابٌ عند هذه الجهة. */
  accountCharityIds: string[];
};

/** منحُ جهةٍ عند جمعية — تُحسب منها كلُّ أعداد الصفحة في المتصفّح. */
export type GrantPair = { donorOrgId: string; charityId: string; count: number };

export function formatDonorDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const inputDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

function toRow(
  org: {
    id: string;
    name: string;
    url: string | null;
    fields: string | null;
    notes: string | null;
    intakeStatus: string;
    opensAt: Date | null;
    closesAt: Date | null;
    accounts: { charityId: string }[];
  },
  now: Date
): DonorRow {
  const intake = effectiveIntake(org.intakeStatus, org.opensAt, org.closesAt, now);
  return {
    id: org.id,
    name: org.name,
    url: org.url,
    fields: org.fields,
    notes: org.notes,
    intakeStatus: intake.status,
    intakeMode: intake.mode,
    intakeReason: intake.reason,
    storedStatus: org.intakeStatus === "OPEN" ? "OPEN" : "CLOSED",
    opensAt: org.opensAt ? formatDonorDate(org.opensAt) : null,
    closesAt: org.closesAt ? formatDonorDate(org.closesAt) : null,
    opensAtInput: inputDate(org.opensAt),
    closesAtInput: inputDate(org.closesAt),
    accountCharityIds: org.accounts.map((a) => a.charityId),
  };
}

const ORG_SELECT = {
  id: true,
  name: true,
  url: true,
  fields: true,
  notes: true,
  intakeStatus: true,
  opensAt: true,
  closesAt: true,
} as const;

export async function loadDonorList(viewer: DonorViewer, kind: DonorKind) {
  const now = new Date();
  const orgs = await prisma.donorOrg.findMany({
    where: { kind },
    select: {
      ...ORG_SELECT,
      // حساباتُ جمعيات الرائي وحدها: منها يُعرف «هل لهذه الجمعية حسابٌ هنا».
      accounts: { where: { charityId: { in: viewer.charityIds } }, select: { charityId: true } },
    },
    orderBy: { name: "asc" },
  });

  const grouped =
    viewer.charityIds.length === 0
      ? []
      : await prisma.grantApplication.groupBy({
          by: ["donorOrgId", "charityId"],
          where: { charityId: { in: viewer.charityIds }, donorOrgId: { in: orgs.map((o) => o.id) } },
          _count: { _all: true },
        });

  const pairs: GrantPair[] = grouped
    .filter((g) => g.donorOrgId)
    .map((g) => ({ donorOrgId: g.donorOrgId as string, charityId: g.charityId, count: g._count._all }));

  return { orgs: orgs.map((o) => toRow(o, now)), pairs };
}

export type DonorAccountRow = {
  id: string;
  charityId: string;
  username: string;
  /** مفكوكةُ التشفير — تُعرض مُغطّاةً وتُكشف باختيار. */
  password: string;
};

export type DonorGrantRow = {
  id: string;
  charityId: string;
  charityName: string;
  initiativeName: string;
  requestedAmount: number;
  status: string;
  createdAt: string;
  /** للفرز بالتاريخ بلا إعادة تحليل النصّ. */
  createdAtMs: number;
};

/** صفُّ جدول المنح الجامع — فيه الجهةُ والجمعيةُ معاً. */
export type GrantOverviewRow = DonorGrantRow & {
  donorOrgId: string | null;
  /** اسمُ الجهة الآن إن كانت لها صفٌّ، وإلّا `entityName` المثبَّتُ في الصفّ. */
  donorName: string;
  /** صفٌّ لا جهةَ له: `entityName` وحدَه — فلا يُفتح له تعديلٌ يلزمه معرِّف. */
  donorMissing: boolean;
};

/**
 * كلُّ المنح في نطاق الرائي — لجدول «المنح» الجامع.
 *
 * واستعلامٌ واحدٌ لا استعلامٌ لكل جهة: الجدولُ يُفرز ويُبحث في المتصفّح، فلا
 * فائدةَ من تقطيعه على الخادم. والعددُ مئاتٌ لا ملايين (٢٧ اليوم)، وهو مقصورٌ
 * على جمعيات الرائي أصلاً.
 *
 * **ولا تُستثنى منحةٌ بلا جهة**: `donorOrgId` قابلٌ للعدم في المخطَّط، وصفوفٌ
 * رُفعت قبل أن تصير الجهةُ كياناً تحمل اسمَها في `entityName` وحدَه. فحجبُها
 * يُنقص المجموعَ ولا يُفسِّر لماذا — وهي تُعرض ويُقال إنّها بلا جهةٍ مرتبطة.
 */
export async function loadGrantsOverview(viewer: DonorViewer) {
  if (viewer.charityIds.length === 0) return { grants: [] as GrantOverviewRow[], donors: [] as { id: string; name: string }[] };

  const [rows, donors] = await Promise.all([
    prisma.grantApplication.findMany({
      where: { charityId: { in: viewer.charityIds } },
      select: {
        id: true,
        charityId: true,
        initiativeName: true,
        requestedAmount: true,
        status: true,
        createdAt: true,
        donorOrgId: true,
        entityName: true,
        charity: { select: { name: true } },
        donorOrg: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.donorOrg.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const grants: GrantOverviewRow[] = rows.map((g) => ({
    id: g.id,
    charityId: g.charityId,
    charityName: g.charity.name,
    initiativeName: g.initiativeName,
    requestedAmount: g.requestedAmount,
    status: g.status,
    createdAt: formatDonorDate(g.createdAt),
    createdAtMs: g.createdAt.getTime(),
    donorOrgId: g.donorOrgId,
    donorName: g.donorOrg?.name ?? g.entityName,
    donorMissing: !g.donorOrgId,
  }));

  return { grants, donors };
}

/**
 * جهةُ تبويبٍ مفرد — «منصة إحسان» و«صندوق دعم الجمعيات».
 *
 * فكلٌّ منهما جهةٌ واحدةٌ لا قائمة، فتبويبُها يفتح صفحتَها مباشرةً بلا قائمةٍ
 * من صفٍّ واحد.
 */
export async function loadSingletonDonor(viewer: DonorViewer, kind: DonorKind) {
  const first = await prisma.donorOrg.findFirst({
    where: { kind },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  return first ? loadDonorDetail(viewer, first.id) : null;
}

export async function loadDonorDetail(viewer: DonorViewer, id: string) {
  const now = new Date();
  const org = await prisma.donorOrg.findUnique({
    where: { id },
    select: {
      ...ORG_SELECT,
      kind: true,
      accounts: {
        where: { charityId: { in: viewer.charityIds } },
        select: { id: true, charityId: true, username: true, password: true },
      },
      grants: {
        where: { charityId: { in: viewer.charityIds } },
        select: {
          id: true,
          charityId: true,
          initiativeName: true,
          requestedAmount: true,
          status: true,
          createdAt: true,
          charity: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!org) return null;

  const accounts: DonorAccountRow[] = org.accounts.map((a) => ({
    id: a.id,
    charityId: a.charityId,
    username: a.username,
    password: decryptSecret(a.password),
  }));

  const grants: DonorGrantRow[] = org.grants.map((g) => ({
    id: g.id,
    charityId: g.charityId,
    charityName: g.charity.name,
    initiativeName: g.initiativeName,
    requestedAmount: g.requestedAmount,
    status: g.status,
    createdAt: formatDonorDate(g.createdAt),
    createdAtMs: g.createdAt.getTime(),
  }));

  return { row: toRow({ ...org, accounts: org.accounts }, now), kind: org.kind, accounts, grants };
}
