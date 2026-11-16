/**
 * كاتب ملف وورد — خالصا، بلا حزمة ولا شاشة.
 *
 * ولم تضف حزمة: ملف وورد مجلد مضغوط فيه XML، كملف اكسل سواء — و`JSZip` في
 * المشروع اصلا (`lib/xlsx.ts` يكتب به). وحزمة `docx` تزيد على مئتي كيلوبايت
 * لمستند من فقرات وجداول.
 *
 * **والصفحة من اليمين**: `bidi` على كل فقرة و`rtl` على كل نص، و`bidiVisual`
 * على الجدول — ومستند عربي بلا هذه الثلاث يخرج بعلامات الترقيم في غير مواضعها
 * وبأعمدة معكوسة.
 *
 * وهذه الوحدة تخرج **اجزاء** الملف نصوصا، والضغط عند المنادي — فتبقى خالصة
 * تختبر بـ`node --test` بلا وصلة.
 */

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** فقرة نص: عنوان او متن او سطر وسم وقيمة. */
export type DocParagraph = {
  kind: "paragraph";
  text: string;
  /** عنوان المستند (1) او عنوان جهة (2) او متن (0). */
  level?: 0 | 1 | 2;
  /** سطر باهت — للوسوم والتعليقات. */
  muted?: boolean;
  /** في الوسط — لعنوان المستند. */
  center?: boolean;
};

export type DocTable = {
  kind: "table";
  head: string[];
  rows: string[][];
};

/** فاصل صفحة: ما بعده يبدا في صفحة جديدة. */
export type DocPageBreak = { kind: "pageBreak" };

export type DocBlock = DocParagraph | DocTable | DocPageBreak;

export type DocSpec = {
  /** عنوان المستند في خصائص الملف. */
  title: string;
  blocks: DocBlock[];
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * ما لا يقبله XML يخرج منه.
 *
 * وحروف التحكم تحذف: كلمة مرور نسخت من ملف قد تحمل حرف سطر او جدولة، ووورد
 * يرفض الملف كله لحرف واحد منها — فيفتح «تالف» بلا سبب يقرا.
 */
export function escapeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** اسم ملف صالح على ويندوز وماك — وبلا امتداد. */
export function safeFileName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "مستند"
  );
}

/** نص داخل فقرة: `w:rtl` كي تقرا العربية من اليمين. */
function run(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): string {
  const props =
    `<w:rPr>` +
    (opts.bold ? `<w:b/><w:bCs/>` : "") +
    (opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : "") +
    (opts.color ? `<w:color w:val="${opts.color}"/>` : "") +
    `<w:rtl/>` +
    `</w:rPr>`;

  // والنص يقطع على الاسطر: `w:br` بينها — فـ`\n` في XML لا يكسر سطرا.
  const lines = text.split(/\r?\n/);
  const body = lines
    .map((line, i) => (i === 0 ? "" : `<w:br/>`) + `<w:t xml:space="preserve">${escapeXml(line)}</w:t>`)
    .join("");
  return `<w:r>${props}${body}</w:r>`;
}

function paragraph(block: DocParagraph): string {
  const level = block.level ?? 0;
  const size = level === 1 ? 36 : level === 2 ? 28 : 22;
  const spacing = level ? `<w:spacing w:before="240" w:after="120"/>` : `<w:spacing w:after="80"/>`;
  const align = block.center ? `<w:jc w:val="center"/>` : `<w:jc w:val="right"/>`;
  const props = `<w:pPr><w:bidi/>${align}${spacing}</w:pPr>`;
  return (
    `<w:p>${props}` +
    run(block.text, {
      bold: level > 0,
      size,
      color: level === 2 ? "0F766E" : block.muted ? "64748B" : undefined,
    }) +
    `</w:p>`
  );
}

function cell(text: string, opts: { head?: boolean; width: number }): string {
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${opts.width}" w:type="dxa"/>` +
    (opts.head ? `<w:shd w:val="clear" w:fill="E6F2F0"/>` : "") +
    `</w:tcPr>` +
    `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr>` +
    run(text, { bold: opts.head, size: 20, color: opts.head ? "0F766E" : undefined }) +
    `</w:p></w:tc>`
  );
}

function table(block: DocTable): string {
  const columns = Math.max(1, block.head.length);
  // عرض الصفحة بين الهامشين ‎9026‎ تويب — يقسم على الاعمدة بالتساوي.
  const width = Math.floor(9026 / columns);
  const borders =
    `<w:tblBorders>` +
    ["top", "left", "bottom", "right", "insideH", "insideV"]
      .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`)
      .join("") +
    `</w:tblBorders>`;

  const head = `<w:tr>${block.head.map((text) => cell(text, { head: true, width })).join("")}</w:tr>`;
  const rows = block.rows
    .map((row) => `<w:tr>${block.head.map((_, i) => cell(row[i] ?? "", { width })).join("")}</w:tr>`)
    .join("");

  return (
    `<w:tbl><w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:bidiVisual/>${borders}</w:tblPr>` +
    head +
    rows +
    `</w:tbl>` +
    // فقرة فارغة بعد الجدول: وورد يلصق جدولين متتابعين في جدول واحد بلا فاصل.
    `<w:p><w:pPr><w:bidi/><w:spacing w:after="0"/></w:pPr></w:p>`
  );
}

function pageBreak(): string {
  return `<w:p><w:pPr><w:bidi/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
  `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
  `</Relationships>`;

const DOC_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `</Relationships>`;

/** الخط `Cairo` كما في الموقع، و`Arial` بديلا عند من لا يملكه. */
const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `<w:docDefaults><w:rPrDefault><w:rPr>` +
  `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Cairo"/>` +
  `<w:sz w:val="22"/><w:szCs w:val="22"/>` +
  `</w:rPr></w:rPrDefault></w:docDefaults>` +
  `</w:styles>`;

/** اجزاء ملف الوورد نصوصا — يضغطها المنادي. */
export function documentFiles(spec: DocSpec): Record<string, string> {
  const body = spec.blocks
    .map((block) => {
      if (block.kind === "paragraph") return paragraph(block);
      if (block.kind === "table") return table(block);
      return pageBreak();
    })
    .join("");

  const document =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${body}` +
    // خصائص المقطع: A4 بهوامش معتدلة، ومن اليمين.
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>` +
    `<w:bidi/></w:sectPr>` +
    `</w:body></w:document>`;

  const core =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<dc:title>${escapeXml(spec.title)}</dc:title>` +
    `<dc:creator>زاد التنموية</dc:creator>` +
    `</cp:coreProperties>`;

  return {
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "word/_rels/document.xml.rels": DOC_RELS,
    "word/styles.xml": STYLES,
    "word/document.xml": document,
    "docProps/core.xml": core,
  };
}
