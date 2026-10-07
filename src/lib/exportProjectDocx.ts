// تصدير وثيقة المبادرة إلى Word — يعمل بالكامل داخل المتصفح (مكتبة docx
// جافاسكريبت)، لا يتصل بأي خادم ولا يستهلك أي نقطة ذكاء اصطناعي. عربي RTL،
// Arial، كحلي وذهبي بهوية زاد.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";

const NAVY = "1F3864";
const GOLD = "BF8F00";
const FONT = "Arial";

// يدعم **غامق** داخل السطر
function runs(text: string, opts: { bold?: boolean; color?: string; size?: number } = {}) {
  const { bold = false, color, size = 24 } = opts;
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => {
      const isBold = part.startsWith("**") && part.endsWith("**");
      return new TextRun({
        text: isBold ? part.slice(2, -2) : part,
        bold: bold || isBold,
        color,
        size,
        font: { ascii: FONT, hAnsi: FONT, cs: FONT },
        rightToLeft: true,
      });
    });
}

function para(text: string, opts: { bold?: boolean; color?: string; size?: number; after?: number; bullet?: boolean; underlineGold?: boolean } = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { after: opts.after ?? 120, line: 360 },
    bullet: opts.bullet ? { level: 0 } : undefined,
    border: opts.underlineGold
      ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 4 } }
      : undefined,
    children: runs(text, opts),
  });
}

function buildTable(rows: string[]) {
  const clean = rows.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)); // حذف سطر الفواصل |---|
  const cells = clean.map((r) => r.replace(/^\s*\||\|\s*$/g, "").split("|").map((c) => c.trim()));
  const cols = Math.max(...cells.map((r) => r.length));
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" } as const;

  return new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: cells.map(
      (row, ri) =>
        new TableRow({
          tableHeader: ri === 0,
          children: Array.from(
            { length: cols },
            (_, ci) =>
              new TableCell({
                borders: { top: border, bottom: border, left: border, right: border },
                shading: ri === 0 ? { type: ShadingType.CLEAR, fill: NAVY, color: "auto" } : undefined,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [
                  para(row[ci] || "", { bold: ri === 0, color: ri === 0 ? "FFFFFF" : undefined, size: 22, after: 0 }),
                ],
              })
          ),
        })
    ),
  });
}

export function markdownToDocx(md: string) {
  const lines = md.replace(/\r/g, "").split("\n");
  const children: (Paragraph | Table)[] = [];
  let tableBuf: string[] = [];

  const flushTable = () => {
    if (tableBuf.length) {
      children.push(buildTable(tableBuf));
      children.push(para("", { after: 120 }));
      tableBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("|")) {
      tableBuf.push(line);
      continue;
    }
    flushTable();
    if (!line || /^-{3,}$/.test(line)) continue;

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^#\s+(.*)/))) children.push(para(m[1], { bold: true, color: NAVY, size: 36, after: 240 }));
    else if ((m = line.match(/^##\s+(.*)/)))
      children.push(para(m[1], { bold: true, color: NAVY, size: 30, after: 160, underlineGold: true }));
    else if ((m = line.match(/^#{3,}\s+(.*)/))) children.push(para(m[1], { bold: true, color: GOLD, size: 26 }));
    else if ((m = line.match(/^[-*•]\s+(.*)/))) children.push(para(m[1], { bullet: true }));
    else children.push(para(line));
  }
  flushTable();

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 24, rightToLeft: true } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children,
      },
    ],
  });
}

/** الاستدعاء من زر التصدير: await exportProjectDocx(content, programName) */
export async function exportProjectDocx(markdown: string, fileName = "وثيقة المبادرة") {
  const blob = await Packer.toBlob(markdownToDocx(markdown));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
