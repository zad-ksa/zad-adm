/**
 * نصُّ المحضر (ماركداون) → HTML الكليشة، وموضعُ جدول المهام فيه.
 *
 * **ولمَ لا تُحذف الجداول**: كان المحضر يُنظَّف قبل الطباعة بسطرٍ يحذف كلَّ
 * جدولٍ فيه، وقبله سطرٌ يحذف عنوانَ «المهام والإجراءات المطلوبة» مع جدوله. فما
 * كان يُطبع ينقص قسماً كاملاً: الترتيبُ يمضي أولاً، ثانياً، ثالثاً… ثم خامساً،
 * و«رابعاً» لا أثرَ له. وجدولُ المهام المحفوظةِ كان يُذيَّل به المحضرُ بعد
 * الختام — فإن لم تكن للمحضر مهامٌّ مستخرجةٌ محفوظةٌ لم يبقَ للمهام ذكرٌ
 * أصلاً. وأيُّ جدولٍ آخرَ في المحضر — مقارنةٌ أو ميزانيّةٌ في قسم المحاور —
 * كان يُحذف كذلك ولا يُعاد.
 *
 * فالصوابُ أن جدولَ المهام المحفوظةِ **يحلّ محلَّ جدول المحضر في موضعه**، تحت
 * عنوانه بالترتيب، وما عدا ذلك من الجداول يُطبع كما هو.
 */

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** نصٌّ حرٌّ يدخل HTML المحضر، فلا يُدرج كما كُتب. */
export const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c]);

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inUl = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\|(.+)\|$/.test(line)) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (cells.every(c => /^[-: ]+$/.test(c))) continue;
      if (!inTable) { out.push("<table>"); inTable = true; }
      if (inUl) { out.push("</ul>"); inUl = false; }
      const isHeader = out[out.length - 1] === "<table>";
      const tag = isHeader ? "th" : "td";
      out.push(`<tr>${cells.map(c => `<${tag}>${applyInline(c)}</${tag}>`).join("")}</tr>`);
      continue;
    } else if (inTable) { out.push("</table>"); inTable = false; }

    if (/^[-•*] (.+)$/.test(line)) {
      const text = line.replace(/^[-•*] /, "");
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${applyInline(text)}</li>`);
      continue;
    } else if (inUl) { out.push("</ul>"); inUl = false; }

    if (/^# (.+)$/.test(line)) {
      // «# محضر اجتماع …» وحدَه يُسقط: الكليشةُ تكتب هذه الترويسةَ بنفسها
      // (meeting-label + meeting-title)، فإثباتُها هنا تكرار. وكلُّ عنوانٍ
      // آخرَ من المستوى الأول يُطبع — كان يُسقط كلُّه، فيضيع قسمٌ بعنوانه.
      const text = line.replace(/^# /, "");
      if (!/^محضر\s+اجتماع/.test(text.trim())) {
        out.push(`<h2 class="sec-title">${applyInline(text)}</h2>`);
      }
    } else if (/^## (.+)$/.test(line)) {
      out.push(`<h2 class="sec-title">${applyInline(line.replace(/^## /, ""))}</h2>`);
    } else if (/^### (.+)$/.test(line)) {
      out.push(`<h3 class="sub-title">${applyInline(line.replace(/^### /, ""))}</h3>`);
    } else if (/^#{1,6} (.+)$/.test(line)) {
      out.push(`<h4 class="sub-title">${applyInline(line.replace(/^#{1,6} /, ""))}</h4>`);
    } else if (/^---+$/.test(line)) {
      out.push("<hr>");
    } else if (line === "") {
      out.push("<br>");
    } else if (/^(?:صدر هذا المحضر|محضر إلكتروني)/.test(line.replace(/[*_]/g, "").trim())) {
      // تذييلُ الكليشة يُكتب في الأسفل دائماً، فلا يُكرَّر إن كان محفوظاً في
      // نصِّ محضرٍ قديم. والشرطُ أن يكون السطرُ هو التذييلَ، لا أن ترد فيه
      // العبارة — فجملةٌ للموظّف فيها «محضر إلكتروني» كانت تُحذف بتمامها.
      continue;
    } else {
      out.push(`<p>${applyInline(line)}</p>`);
    }
  }

  if (inTable) out.push("</table>");
  if (inUl) out.push("</ul>");
  return out.join("\n");
}

/** مواضعُ الجداول في HTML، بلا تعشيشٍ — فمُخرَجُ `mdToHtml` لا يُعشِّش جدولاً. */
function tableRanges(html: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const open = /<table\b/gi;
  let match: RegExpExecArray | null;
  while ((match = open.exec(html)) !== null) {
    const close = html.toLowerCase().indexOf("</table>", match.index);
    if (close === -1) break;
    const end = close + "</table>".length;
    ranges.push({ start: match.index, end });
    open.lastIndex = end;
  }
  return ranges;
}

/** جدولُ المهام يُعرف برأسه: «المهمة» في خليةِ رأسٍ — كما في هيكل المحضر. */
function isTasksTable(table: string): boolean {
  return /<th[^>]*>[^<]*المهمة[^<]*<\/th>/i.test(table);
}

/**
 * يُحِلُّ جدولَ المهام المحفوظةِ محلَّ جدول المهام في المحضر، في موضعه.
 * وإن لم يكن في المحضر جدولُ مهامّ، ذُيِّل به المحضرُ تحت عنوانٍ له.
 */
export function replaceTasksTable(html: string, tasksTable: string, fallbackHeading: string): string {
  const target = tableRanges(html).find((r) => isTasksTable(html.slice(r.start, r.end)));
  if (target) return html.slice(0, target.start) + tasksTable + html.slice(target.end);
  return `${html}\n${fallbackHeading}${tasksTable}`;
}
