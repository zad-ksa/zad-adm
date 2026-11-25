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
import { mergeIntoLetterhead } from "./letterheadDocx";

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

function para(
  text: string,
  opts: {
    bold?: boolean;
    color?: string;
    size?: number;
    after?: number;
    /** فراغٌ فوق الفقرة (بالـtwip) — العناوين تنفصل به عمّا قبلها. */
    before?: number;
    bullet?: boolean;
    underlineGold?: boolean;
    center?: boolean;
    /** عنوانٌ لا يُترك وحده آخرَ الصفحة: Word ينقله مع ما بعده إلى الصفحة التالية. */
    keepNext?: boolean;
  } = {}
) {
  return new Paragraph({
    bidirectional: true,
    keepNext: opts.keepNext,
    keepLines: opts.keepNext,
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 120, line: 360 },
    bullet: opts.bullet ? { level: 0 } : undefined,
    border: opts.underlineGold
      ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 4 } }
      : undefined,
    children: runs(text, opts),
  });
}

/** لونُ شريط جانت — كحليٌّ فاتحٌ من هويّة الوثيقة. */
const GANTT_FILL = "8EAADB";
/** خانةٌ لا شيءَ فيها إلا علامةُ شريط (▬ ■ █ ● ✓ ×…). */
const GANTT_MARK = /^[\s▬━■▪◼◾█▇▆●✓✔×xX]+$/;

/**
 * هل الجدولُ مخطّطُ جانت؟ رؤوسُ أعمدته أرقامُ فتراتٍ (١، ٢، ٣ …)، أو خاناتُه
 * علاماتٌ لا نصّ — وفي الحالين يُستثنى من دمج صفوف التصنيف والمجاميع: خاناتُه
 * الفارغةُ أيامٌ لا عملَ فيها، لا فراغٌ يُدمج.
 */
function isGantt(cells: string[][]): boolean {
  const [header = [], ...body] = cells;
  const numbered = header.filter((h) => /^[\d٠-٩]+$/.test(h.trim())).length;
  if (numbered >= 3) return true;
  const marks = body.flat().filter((t) => GANTT_MARK.test(t)).length;
  return marks >= 3;
}

function buildTable(rows: string[]) {
  const clean = rows.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)); // حذف سطر الفواصل |---|
  const cells = clean.map((r) => r.replace(/^\s*\||\|\s*$/g, "").split("|").map((c) => c.trim()));
  const cols = Math.max(...cells.map((r) => r.length));
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" } as const;

  const cell = (text: string, opts: { header?: boolean; group?: boolean; span?: number; bar?: boolean }) =>
    new TableCell({
      columnSpan: opts.span && opts.span > 1 ? opts.span : undefined,
      borders: { top: border, bottom: border, left: border, right: border },
      shading: opts.header
        ? { type: ShadingType.CLEAR, fill: NAVY, color: "auto" }
        : opts.bar
          ? { type: ShadingType.CLEAR, fill: GANTT_FILL, color: "auto" }
          : opts.group
            ? { type: ShadingType.CLEAR, fill: "EEF1F6", color: "auto" }
            : undefined,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [
        para(text.replace(/^\*\*(.*)\*\*$/, "$1"), {
          bold: opts.header || opts.group,
          color: opts.header ? "FFFFFF" : undefined,
          size: 22,
          after: 0,
          center: true,
        }),
      ],
    });

  const gantt = isGantt(cells);

  return new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: cells.map((raw, ri) => {
      const row = Array.from({ length: cols }, (_, ci) => raw[ci] ?? "");
      if (ri === 0) return new TableRow({ tableHeader: true, children: row.map((t) => cell(t, { header: true })) });

      // مخطّطُ جانت: لا دمجَ فيه — خاناتُه الفارغةُ هي الأيامُ التي لا عملَ فيها.
      // وخانةُ العلامة تُلوَّن ويُحذف رمزُها، فيظهر الشريطُ لوناً متّصلاً.
      if (gantt) {
        return new TableRow({
          children: row.map((t) => (GANTT_MARK.test(t) ? cell("", { bar: true }) : cell(t, {}))),
        });
      }

      // صفُّ تصنيفٍ أو مجموعٍ («٢ | العبوات والتغليف | | | |»، «| المجموع الجزئي | | | ٢٢٨,٠٥٠»):
      // خانتان فارغتان فأكثر — فكلُّ خانةٍ ذاتِ نصٍّ تُدمج مع الفارغات بعدها، والفارغاتُ
      // في أوّل الصفّ تُضمّ إلى أوّل خانةٍ ذاتِ نصّ.
      const empties = row.filter((t) => !t).length;
      const filled = row.some((t) => t);
      if (empties >= 2 && filled && cols > 2) {
        const spans: { text: string; span: number }[] = [];
        let lead = 0;
        for (const t of row) {
          if (t) spans.push({ text: t, span: 1 + lead }), (lead = 0);
          else if (spans.length) spans[spans.length - 1].span++;
          else lead++;
        }
        return new TableRow({ children: spans.map((s) => cell(s.text, { group: true, span: s.span })) });
      }
      return new TableRow({ children: row.map((t) => cell(t, {})) });
    }),
  });
}

/**
 * @param plainBullets نقاطٌ مكتوبةٌ «• » لا قائمةٌ من Word: القائمةُ تحتاج تعريفَ
 *   ترقيمٍ لا تحمله الكليشة، فتُكتب النقطةُ نصّاً حين تُصبّ فيها.
 */
export function markdownToDocx(md: string, { plainBullets = false }: { plainBullets?: boolean } = {}) {
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
    const line = raw.trim().replace(/[ \t ]{2,}/g, " "); // فراغاتٌ متتالية تبدو فجوةً في Word
    if (line.startsWith("|")) {
      tableBuf.push(line);
      continue;
    }
    flushTable();
    if (!line || /^-{3,}$/.test(line)) continue;

    let m: RegExpMatchArray | null;
    // العناوين كلُّها في الوسط — قرارُ تنسيقٍ يُفرض هنا لا في البرومبت.
    if ((m = line.match(/^#\s+(.*)/)))
      children.push(para(m[1], { bold: true, color: NAVY, size: 36, before: 240, after: 240, center: true, keepNext: true }));
    else if ((m = line.match(/^##\s+(.*)/)))
      children.push(
        para(m[1], {
          bold: true,
          color: NAVY,
          size: 30,
          before: 360,
          after: 160,
          underlineGold: true,
          center: true,
          keepNext: true,
        })
      );
    else if ((m = line.match(/^#{3,}\s+(.*)/)))
      children.push(para(m[1], { bold: true, color: GOLD, size: 26, before: 240, center: true, keepNext: true }));
    else if ((m = line.match(/^[-*•]\s+(.*)/)))
      children.push(plainBullets ? para(`• ${m[1]}`) : para(m[1], { bullet: true }));
    // سطرٌ غامقٌ كلُّه أو منتهٍ بنقطتين («**الهدف العام:**») عنوانٌ صغير — يلزم ما بعده.
    else if (/^\*\*[^*]+\*\*:?$/.test(line) || /^[^|]{1,60}:$/.test(line)) children.push(para(line, { before: 160, keepNext: true }));
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

/**
 * الاستدعاء من زر التصدير: await exportProjectDocx(content, programName, letterhead)
 * و`letterhead` مستندُ كليشة الجمعية إن كان لها كليشة — فتُصبّ الوثيقةُ فيه.
 */
/** ملفُّ Word الوثيقة — مصبوباً في الكليشة إن أُعطيت. المعاينةُ والتنزيلُ يبنيان منه، فما يُرى هو ما يُنزَّل. */
export async function buildProjectDocx(markdown: string, letterhead?: ArrayBuffer | null): Promise<Blob> {
  const generated = await Packer.toBlob(markdownToDocx(markdown, { plainBullets: !!letterhead }));
  return letterhead ? mergeIntoLetterhead(generated, letterhead) : generated;
}

export async function exportProjectDocx(
  markdown: string,
  fileName = "وثيقة المبادرة",
  letterhead?: ArrayBuffer | null
) {
  const blob = await buildProjectDocx(markdown, letterhead);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
