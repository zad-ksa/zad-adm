import type { DocBlock, DocSpec } from "./docx.ts";
import { safeFileName } from "./docx.ts";

/**
 * مستند حسابات الجهات المانحة: جهة في كل صفحة، وتحتها جدول حسابات الجمعيات.
 *
 * **وجهة في كل صفحة** كما طلب صاحب الموقع: الورقة تطبع وتسلم لمن يعمل مع جهة
 * بعينها، فجهتان في صفحة تعني تسليم ما لا يخص صاحبه.
 *
 * وجهة بلا حسابات تكتب لها صفحتها كذلك: غيابها من المستند يقرا نسيانا، وسطر
 * «لا حسابات» خبر.
 */

export type DonorAccountLine = {
  charityName: string;
  username: string;
  password: string;
};

export type DonorDocOrg = {
  name: string;
  /** وسم النوع كما يعرض في الموقع: مؤسسة، منصة إحسان، صندوق دعم الجمعيات. */
  kindLabel: string;
  url: string | null;
  fields: string | null;
  /** حالة الرفع الفعلية مصوغة: «مفتوح حتى …». */
  intake: string | null;
  accounts: DonorAccountLine[];
};

export const DONOR_DOC_COLUMNS = ["الجمعية", "اسم المستخدم", "كلمة المرور"];

/** سطر التنبيه في راس المستند — ومستند فيه كلمات مرور يقال فيه ذلك. */
export const DONOR_DOC_NOTICE =
  "مستند سري: يحتوي كلمات مرور حسابات الجمعيات عند الجهات المانحة. لا يشارك خارج الفريق المختص.";

/** الصفحة الواحدة: اسم الجهة، ثم بياناتها، ثم جدول حساباتها. */
export function donorPageBlocks(org: DonorDocOrg): DocBlock[] {
  const blocks: DocBlock[] = [
    { kind: "paragraph", text: org.name, level: 2 },
  ];

  const facts: string[] = [org.kindLabel];
  if (org.intake) facts.push(org.intake);
  if (org.url) facts.push(org.url);
  blocks.push({ kind: "paragraph", text: facts.join("  •  "), muted: true });

  if (org.fields) {
    blocks.push({ kind: "paragraph", text: `مجالات الدعم: ${org.fields}`, muted: true });
  }

  if (org.accounts.length === 0) {
    blocks.push({ kind: "paragraph", text: "لا حسابات مسجلة لهذه الجهة.", muted: true });
    return blocks;
  }

  blocks.push({
    kind: "table",
    head: DONOR_DOC_COLUMNS,
    rows: org.accounts.map((account) => [account.charityName, account.username, account.password]),
  });
  return blocks;
}

/**
 * المستند كاملا: ترويسة، ثم جهة في كل صفحة.
 *
 * والفاصل يوضع **بين** الصفحات لا بعد كل واحدة: فاصل في الاخر يخلف صفحة
 * بيضاء في اخر الملف.
 */
export function donorAccountsDoc(orgs: DonorDocOrg[], today: string): DocSpec {
  const blocks: DocBlock[] = [
    { kind: "paragraph", text: "حسابات الجهات المانحة", level: 1, center: true },
    { kind: "paragraph", text: `زاد التنموية  •  ${today}`, muted: true, center: true },
    { kind: "paragraph", text: DONOR_DOC_NOTICE, muted: true, center: true },
  ];

  if (orgs.length === 0) {
    blocks.push({ kind: "paragraph", text: "لا جهات في نطاقك." });
    return { title: "حسابات الجهات المانحة", blocks };
  }

  orgs.forEach((org, index) => {
    blocks.push({ kind: "pageBreak" });
    blocks.push(...donorPageBlocks(org));
    // ولا شيء بعد الاخيرة: الفاصل قبل كل جهة، فالترويسة وحدها في الصفحة الاولى.
    void index;
  });

  return { title: "حسابات الجهات المانحة", blocks };
}

/** اسم الملف: «حسابات الجهات المانحة - ٢٠٢٦-١١-١٦.docx». */
export function donorAccountsFileName(today: string): string {
  return `${safeFileName(`حسابات الجهات المانحة - ${today}`)}.docx`;
}
