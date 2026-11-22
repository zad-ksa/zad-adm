import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/encryption";
import { isCharityFundraisingOpen } from "@/lib/featureFlags";
import { requirePortalPermission } from "@/lib/portalAccess";
import { SECTION_SERVICES, charityHasService } from "@/lib/charityServices";
import {
  deadlineNote,
  effectiveIntake,
  formatDonorDate,
  type DeadlineNote,
  type IntakeStatus,
} from "@/lib/donorOrg";

/**
 * تنميةُ الموارد المالية في بوّابة الجمعية: قراءاتُها في موضعٍ واحد.
 *
 * **وثلاثةُ شروطٍ لا شرطان**: عضويّةُ الجمعية، وصلاحيّةُ `view_fundraising`
 * (ولا تُنال إلّا بتفويض خدمتها)، ثمّ كونُ القسم مفتوحاً لهذه الجمعية
 * (`fundraisingOpenFor`: خدمتُها والعلَم). ويُفحص في كلِّ صفحةٍ وكلِّ فعل — لا في
 * الشريط الجانبيِّ وحدَه، فإخفاءُ رابطٍ ليس حجباً.
 *
 * **والجهاتُ المعروضةُ مؤسّساتُ المنح وحدَها** (`FOUNDATION`): منصّةُ إحسان
 * وصندوقُ دعم الجمعيات (المركز الوطني) نوعان مستقلّان، ومسارُهما غيرُ مسار
 * المنح — وقد استُثنيا بطلب صاحب الموقع حتى يُبنى لهما ما يخصُّهما.
 */
export const PORTAL_DONOR_KIND = "FOUNDATION";

/**
 * هل يُفتح هذا القسمُ لهذه الجمعية؟ — شرطان، ويُقرآن من هنا وحدَهما.
 *
 * **الأوّلُ خدمتُها**: القسمُ وجهُ خدمةِ «التسويق وتنمية الموارد المالية»
 * في البوّابة، فجمعيةٌ لا تشملها الخدمةُ لا شأنَ لها به — كبقيّة أقسام
 * الجمعية عند زاد (`charityServices`). ولو فُتح لها لعرَض جهاتٍ ومجالاتٍ
 * لا تُقدَّم إليها خدمتُها أصلاً.
 *
 * **والثاني العلَم**: تجربةٌ على جمعيةٍ واحدةٍ أوّلاً
 * (`CHARITY_FUNDRAISING_SCOPE`)، وهو حَجْرٌ مؤقّتٌ يُرفع بسطر.
 *
 * ويُقرآن معاً في الحارس، وفي الأفعال، وفي الشريط الجانبيِّ — فلا يُعرض
 * رابطٌ يُردّ صاحبُه، ولا تُفتح صفحةٌ لا رابطَ لها.
 */
export async function fundraisingOpenFor(charity: { id: string; name: string }): Promise<boolean> {
  if (!isCharityFundraisingOpen(charity.name)) return false;
  return charityHasService(charity.id, SECTION_SERVICES.manage_resource_development);
}

/** حارسُ القسم: العضويّةُ، والصلاحيّةُ، وفتحُ القسم لهذه الجمعية. */
export async function requireFundraisingPortal(nameParam: string) {
  const portal = await requirePortalPermission(nameParam, "view_fundraising");
  // ومن كتب العنوانَ في جمعيةٍ لم يُفتح لها القسمُ يُقال له «لا صفحة»: التبويبُ
  // عندها «قريباً»، فالصفحةُ غيرُ موجودةٍ في بوّابته حقّاً.
  if (!(await fundraisingOpenFor(portal.charity))) notFound();
  return portal;
}

export type PortalDonorRow = {
  id: string;
  name: string;
  url: string | null;
  intakeStatus: IntakeStatus;
  /** «مفتوحٌ حتى …» أو «مغلقٌ بضبطٍ يدوي» — يُقرأ تحت الشارة. */
  intakeReason: string;
  /** موعدُ الإغلاق للمفتوح، وموعدُ الفتح للمغلق — وهو ما يُسأل عنه. */
  nextDate: string | null;
  /** الموعدُ نفسُه منسوباً إلى اليوم: «يغلق بعد ٣ أيام». */
  deadline: DeadlineNote | null;
  username: string | null;
  /** مفكوكةُ التشفير — تُعرض مُغطّاةً وتُكشف باختيار. */
  password: string | null;
  /** منحُ هذه الجمعية المرفوعةُ إلى هذه الجهة. */
  grants: number;
  /** مشاريعُها المقترحةُ في مجالات هذه الجهة. */
  proposals: number;
  /**
   * مجالاتُ منح الجهة — تُقرأ سطراً تحت اسمها كأنّها وصفُها.
   *
   * وأسماءٌ لا عدد: «٣» لا تقول أين يُقترح، و«التعليم · الصحة · الإسكان»
   * تقوله بنظرة. ومعها مُعرِّفاتُها فيُنزَل على المجال في ملفِّ الجهة.
   */
  fields: { id: string; name: string }[];
  /** نصُّ مجالات الدعم القديم — يُقرأ حين لا مجالاتٍ مهيكلةً بعد. */
  legacyFields: string | null;
  /** وسومُ مجالاتها مجموعةً — يُبحث ويُرشَّح بها. */
  fieldTags: string[];
};

/**
 * جدولُ الجهات في البوّابة: لكلِّ جهةٍ حالتُها وحسابُ هذه الجمعية عندها.
 *
 * والحسابُ حسابُ الجمعية وحدَها: شرطُ `charityId` في الاستعلام لا ترشيحٌ بعده،
 * فلا تعبر كلمةُ مرورِ جمعيةٍ أخرى إلى المتصفّح أصلاً.
 */
export async function loadPortalDonors(charityId: string): Promise<PortalDonorRow[]> {
  const now = new Date();
  const orgs = await prisma.donorOrg.findMany({
    where: { kind: PORTAL_DONOR_KIND },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      url: true,
      fields: true,
      intakeStatus: true,
      opensAt: true,
      closesAt: true,
      accounts: { where: { charityId }, select: { username: true, password: true } },
      _count: { select: { grants: { where: { charityId } } } },
    },
  });

  // المقترحاتُ والمجالاتُ تُعدُّ في استعلامٍ واحدٍ لا استعلامٍ لكلِّ جهة.
  const [proposals, fields] = await Promise.all([
    countProposalsByDonor(charityId),
    fieldsByDonor(),
  ]);

  return orgs.map((org) => {
    const intake = effectiveIntake(org.intakeStatus, org.opensAt, org.closesAt, now);
    const account = org.accounts[0] ?? null;
    const next = intake.status === "OPEN" ? org.closesAt : org.opensAt;
    return {
      id: org.id,
      name: org.name,
      url: org.url,
      intakeStatus: intake.status,
      intakeReason: intake.reason,
      nextDate: next ? formatDonorDate(next) : null,
      deadline: deadlineNote(intake.status, next, now),
      username: account?.username ?? null,
      password: account ? decryptSecret(account.password) : null,
      grants: org._count.grants,
      proposals: proposals.get(org.id) ?? 0,
      fields: fields.get(org.id)?.list ?? [],
      fieldTags: fields.get(org.id)?.tags ?? [],
      legacyFields: org.fields,
    };
  });
}

/** أسماءُ المجالات ووسومُها لكلِّ جهة — محروسٌ حتى يُطبَّق جدولُ المجالات. */
async function fieldsByDonor(): Promise<
  Map<string, { list: { id: string; name: string }[]; tags: string[] }>
> {
  try {
    const rows = await prisma.donorField.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, donorOrgId: true, name: true, tags: true },
    });
    const map = new Map<string, { list: { id: string; name: string }[]; tags: string[] }>();
    for (const row of rows) {
      const entry = map.get(row.donorOrgId) ?? { list: [], tags: [] };
      entry.list.push({ id: row.id, name: row.name });
      // والوسمُ لا يُكرَّر بين مجالين في الجهة الواحدة: مُرشِّحٌ لا إحصاء.
      for (const tag of row.tags) if (!entry.tags.includes(tag)) entry.tags.push(tag);
      map.set(row.donorOrgId, entry);
    }
    return map;
  } catch (error) {
    console.error("fieldsByDonor", error);
    return new Map();
  }
}

/** عددُ مقترحات الجمعية لكلِّ جهة — محروسٌ حتى يُطبَّق جدولُ المقترحات. */
async function countProposalsByDonor(charityId: string): Promise<Map<string, number>> {
  try {
    const rows = await prisma.grantProposal.findMany({
      where: { charityId },
      select: { donorField: { select: { donorOrgId: true } } },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = row.donorField.donorOrgId;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  } catch (error) {
    // `prisma/sql/portal-fundraising.sql` لم يُطبَّق بعد — والعددُ صفرٌ خيرٌ من
    // صفحةٍ ساقطة.
    console.error("countProposalsByDonor", error);
    return new Map();
  }
}

export type PortalProposalRow = {
  id: string;
  name: string;
  note: string | null;
  /** مصيرُه عند زاد: مقترحٌ · رُفع · مؤجَّل. */
  status: string;
  /** مبادرةُ الخطة التشغيلية إن اختيرت — وإلّا مشروعٌ من خارجها. */
  fromPlan: boolean;
  createdAt: string;
  authorName: string | null;
};

export type PortalFieldRow = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  proposals: PortalProposalRow[];
};

export type PortalInitiativeOption = {
  id: string;
  name: string;
  /** اسمُ الخطة — يُقرأ تحت الاسم في القائمة، فالأسماءُ تتشابه بين خطّتين. */
  planLabel: string;
};

/** ملفُّ الجهة في البوّابة: بياناتُها، وحسابُ الجمعية، ومجالاتُها بمقترحاتها. */
export async function loadPortalDonorFile(charityId: string, donorOrgId: string) {
  const now = new Date();
  const org = await prisma.donorOrg.findFirst({
    where: { id: donorOrgId, kind: PORTAL_DONOR_KIND },
    select: {
      id: true,
      name: true,
      url: true,
      fields: true,
      notes: true,
      intakeStatus: true,
      opensAt: true,
      closesAt: true,
      accounts: { where: { charityId }, select: { username: true, password: true } },
      _count: { select: { grants: { where: { charityId } } } },
    },
  });
  if (!org) return null;

  const intake = effectiveIntake(org.intakeStatus, org.opensAt, org.closesAt, now);
  const account = org.accounts[0] ?? null;

  return {
    donor: {
      id: org.id,
      name: org.name,
      url: org.url,
      legacyFields: org.fields,
      notes: org.notes,
      intakeStatus: intake.status,
      intakeReason: intake.reason,
      opensAt: org.opensAt ? formatDonorDate(org.opensAt) : null,
      closesAt: org.closesAt ? formatDonorDate(org.closesAt) : null,
      deadline: deadlineNote(
        intake.status,
        intake.status === "OPEN" ? org.closesAt : org.opensAt,
        now
      ),
      grants: org._count.grants,
      username: account?.username ?? null,
      password: account ? decryptSecret(account.password) : null,
    },
    fields: await loadPortalFields(charityId, donorOrgId),
    // ومبادراتٌ اقتُرحت عند هذه الجهة من قبل: تُعلَّم في القائمة فلا تُقترح
    // مرّتين — والتكرارُ لا يُرى إلّا بعد الإضافة.
    usedInitiativeIds: await usedInitiatives(charityId, donorOrgId),
  };
}

/** مبادراتُ هذه الجمعية المقترحةُ عند هذه الجهة — في مجالاتها كلِّها. */
async function usedInitiatives(charityId: string, donorOrgId: string): Promise<string[]> {
  try {
    const rows = await prisma.grantProposal.findMany({
      where: { charityId, initiativeId: { not: null }, donorField: { donorOrgId } },
      select: { initiativeId: true },
    });
    return rows.map((r) => r.initiativeId as string);
  } catch (error) {
    console.error("usedInitiatives", error);
    return [];
  }
}

/**
 * مجالاتُ الجهة ومعها مقترحاتُ هذه الجمعية وحدَها.
 *
 * ومقترحاتُ غيرها لا تُجلب: ما تنوي جمعيةٌ رفعَه ليس خبراً لجارتها، وإنّما
 * يقرؤه فريقُ زادٍ في ملف الجهة عنده.
 */
async function loadPortalFields(charityId: string, donorOrgId: string): Promise<PortalFieldRow[]> {
  try {
    const rows = await prisma.donorField.findMany({
      where: { donorOrgId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        proposals: {
          where: { charityId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            note: true,
            status: true,
            initiativeId: true,
            createdAt: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      tags: f.tags,
      proposals: f.proposals.map((p) => ({
        id: p.id,
        name: p.name,
        note: p.note,
        status: p.status,
        fromPlan: p.initiativeId !== null,
        createdAt: formatDonorDate(p.createdAt),
        authorName: p.createdBy?.name ?? null,
      })),
    }));
  } catch (error) {
    console.error("loadPortalFields", error);
    return [];
  }
}

/**
 * مبادراتُ الخطط التشغيلية لهذه الجمعية — يُختار منها المشروعُ المقترح.
 *
 * وكلُّ الخطط لا الأحدثَ وحدَها: الجمعيةُ قد تقترح مشروعاً من خطةٍ سابقةٍ لم
 * يُنفَّذ. والأحدثُ أوّلاً فهو الغالب.
 */
export async function loadPortalInitiatives(charityId: string): Promise<PortalInitiativeOption[]> {
  const rows = await prisma.initiative.findMany({
    where: { plan: { charityId } },
    orderBy: [{ plan: { startDate: "desc" } }, { number: "asc" }],
    select: { id: true, name: true, plan: { select: { label: true } } },
  });
  return rows.map((row) => ({ id: row.id, name: row.name, planLabel: row.plan.label }));
}

export type PortalGrantRow = {
  id: string;
  /** جهتُها — به تُرشَّح الصفحةُ حين تُفتح من ملفِّ جهة. */
  donorOrgId: string | null;
  donorName: string;
  initiativeName: string;
  requestedAmount: number;
  status: string;
  createdAt: string;
  createdAtMs: number;
};

/**
 * المنحُ التي رفعتها هذه الجمعية — صفحةُ «المنح» في بوّابتها.
 *
 * **ومنحُ المؤسّسات وحدَها**: منصّةُ إحسان وصندوقُ دعم الجمعيات (المركز
 * الوطني) مستثنيان بطلب صاحب الموقع حتى يُبنى لهما ما يخصُّهما — فالشرطُ على
 * نوع الجهة لا على اسمها: اسمٌ يُعاد كتابتُه يُفلت من قائمةِ أسماء.
 *
 * **وما لا جهةَ له لا يُعرض هنا**: صفوفٌ قديمةٌ تحمل اسمَ الجهة نصّاً بلا
 * ارتباط، ولا يُعرف أمِن المستثنَيين هي. وهي في ملف زادٍ تُقرأ كما هي.
 */
export async function loadPortalGrants(charityId: string): Promise<PortalGrantRow[]> {
  const rows = await prisma.grantApplication.findMany({
    where: { charityId, donorOrg: { kind: PORTAL_DONOR_KIND } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      initiativeName: true,
      requestedAmount: true,
      status: true,
      createdAt: true,
      entityName: true,
      donorOrgId: true,
      donorOrg: { select: { name: true } },
    },
  });

  return rows.map((g) => ({
    id: g.id,
    donorOrgId: g.donorOrgId,
    donorName: g.donorOrg?.name ?? g.entityName,
    initiativeName: g.initiativeName,
    requestedAmount: g.requestedAmount,
    status: g.status,
    createdAt: formatDonorDate(g.createdAt),
    createdAtMs: g.createdAt.getTime(),
  }));
}
