/**
 * كاتبُ ملفِّ إكسل — خالصاً، بلا حزمةٍ ولا شاشة.
 *
 * ولمَ يُكتب باليد: الموقعُ لم يكن فيه تصديرٌ إلى إكسل البتّة — وأقربُ ما
 * فيه نسخُ CSV إلى الحافظة في تقارير الحضور، وهو لا يُفتح ملفّاً ولا يحمل
 * عمودَ رقمٍ يُجمع: كلُّ خليّةٍ فيه نصٌّ، فـ«١٬٢٠٠٬٠٠٠» تُجمع في إكسل بصفر.
 * وحزمةُ `xlsx` أو `exceljs` مئاتُ الكيلوبايتات لجدولٍ واحد، و`JSZip` موجودةٌ
 * في المشروع أصلاً — وملفُّ إكسل ليس إلا مجلَّداً مضغوطاً فيه XML.
 *
 * **فالأرقامُ هنا أرقام**: المبلغُ خليّةُ عددٍ بصيغة `#,##0` تُجمع وتُرشَّح،
 * والتاريخُ نصٌّ مقروءٌ كما يُكتب في الموقع. والورقةُ **من اليمين** بسطرٍ
 * واحد (`rightToLeft`)، ورأسُها مجمَّدٌ ومعه مُرشِّحُ إكسل — فجدولُ مئتي صفٍّ
 * يُقرأ ويُفرز بلا عملٍ من قارئه.
 *
 * وهذه الوحدةُ تُخرج **أجزاءَ** الملفِّ نصوصاً، والضغطُ عند المنادي
 * (`JSZip` في المتصفّح) — فتبقى خالصةً تُختبر بـ`node --test` بلا وصلة.
 */

export type CellValue = string | number | null | undefined;

export type SheetColumn = {
  header: string;
  /** عرضُ العمود بوحدات إكسل (حرفٌ تقريباً). */
  width?: number;
  /** عددٌ يُجمع ويُرشَّح، أو نصٌّ يُكتب كما هو. */
  kind?: "text" | "number";
};

export type SheetSpec = {
  /** اسمُ ورقةِ العمل — إكسل يرفض بعضَ الحروف فيه، و`sheetName` تُنقّيه. */
  name: string;
  columns: SheetColumn[];
  rows: CellValue[][];
};

/** حروفُ العمود: 1 → A، 27 → AA. */
export function columnLetter(index: number): string {
  let out = "";
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * تهذيبُ النصِّ ليصحَّ في XML.
 *
 * والمحارفُ المتحكِّمةُ تُحذف لا تُهرَّب: `\u0001` في خليّةٍ يجعل إكسل يقول
 * «الملفُّ تالف» ويعرض على فاتحه إصلاحاً يحذف الورقةَ كلَّها. وهي تدخل
 * البياناتِ من لصقٍ في حقلٍ نصّيّ.
 */
export function escapeXml(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * اسمُ ورقةٍ يقبله إكسل: لا `: \ / ? * [ ]`، ولا يتجاوز ٣١ حرفاً، ولا يفرغ.
 */
export function sheetName(name: string): string {
  const cleaned = (name ?? "").replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31);
  return cleaned || "ورقة1";
}

/** اسمُ ملفٍّ يقبله ويندوز. */
export function safeFileName(name: string): string {
  const cleaned = (name ?? "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "تقرير";
}

const HEADER_STYLE = 1;
const MONEY_STYLE = 2;
const TEXT_STYLE = 3;

function cellXml(ref: string, value: CellValue, kind: SheetColumn["kind"]): string {
  if (value === null || value === undefined || value === "") {
    return `<c r="${ref}" s="${TEXT_STYLE}"/>`;
  }
  if (kind === "number" && typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${MONEY_STYLE}"><v>${value}</v></c>`;
  }
  // `xml:space="preserve"` كي لا تُبتلع المسافاتُ في أطراف النصّ.
  return `<c r="${ref}" t="inlineStr" s="${TEXT_STYLE}"><is><t xml:space="preserve">${escapeXml(
    String(value)
  )}</t></is></c>`;
}

function sheetXml(spec: SheetSpec): string {
  const lastColumn = columnLetter(Math.max(1, spec.columns.length));
  const lastRow = spec.rows.length + 1;

  const cols = spec.columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 18}" customWidth="1"/>`)
    .join("");

  const header = spec.columns
    .map(
      (c, i) =>
        `<c r="${columnLetter(i + 1)}1" t="inlineStr" s="${HEADER_STYLE}"><is><t>${escapeXml(
          c.header
        )}</t></is></c>`
    )
    .join("");

  const body = spec.rows
    .map((row, r) => {
      const cells = spec.columns
        .map((c, i) => cellXml(`${columnLetter(i + 1)}${r + 2}`, row[i], c.kind))
        .join("");
      return `<row r="${r + 2}">${cells}</row>`;
    })
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView rightToLeft="1" tabSelected="1" workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="16"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData><row r="1" ht="22" customHeight="1">${header}</row>${body}</sheetData>` +
    `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` +
    `</worksheet>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
  `</Types>`;

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`;

const WORKBOOK_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `</Relationships>`;

/**
 * الأنماط. وفيها حشوان لا بدّ منهما: `fills` الأوّلان (`none` و`gray125`)
 * محجوزان في الصيغة نفسها، فإن نقصا لم يُفتح الملفّ.
 */
const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="3">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="2">` +
  `<border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border>` +
  `<left style="thin"><color rgb="FFE2E8F0"/></left>` +
  `<right style="thin"><color rgb="FFE2E8F0"/></right>` +
  `<top style="thin"><color rgb="FFE2E8F0"/></top>` +
  `<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>` +
  `<diagonal/></border>` +
  `</borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="4">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/**
 * أجزاءُ ملفِّ `.xlsx` بمساراتها — يضغطها المنادي كما هي.
 *
 *     const files = workbookFiles({ name: "المنح", columns, rows });
 *     const zip = new JSZip();
 *     for (const [path, xml] of Object.entries(files)) zip.file(path, xml);
 *     const blob = await zip.generateAsync({ type: "blob", mimeType: XLSX_MIME });
 */
export function workbookFiles(spec: SheetSpec): Record<string, string> {
  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${escapeXml(sheetName(spec.name))}" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  return {
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "xl/workbook.xml": workbook,
    "xl/_rels/workbook.xml.rels": WORKBOOK_RELS,
    "xl/styles.xml": STYLES,
    "xl/worksheets/sheet1.xml": sheetXml(spec),
  };
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
