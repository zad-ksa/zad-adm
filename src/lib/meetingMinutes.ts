/**
 * القراراتُ والتوصياتُ في المحضر — تُدرج بنصِّها، لا بصياغةِ الذكاء الاصطناعي.
 *
 * ولمَ لا يكفي أن يُقال للنموذج «لا تُعدّل التوصيات»: هو مُطالَبٌ في البرومبت
 * نفسِه بتحويل العاميّة إلى فصحى وبترتيب النقاط المتفرّقة، فالتوصيةُ المكتوبةُ
 * بالعاميّة تُفصَّح وتُدمج مع غيرها بحكم القاعدة العامّة — ولو أُضيف استثناءٌ
 * لها لبقي رجاءً لا ضماناً. والتوصيةُ ليست وصفاً لما جرى: هي ما التزم به
 * المجتمعون، ثم تُستخرج مهامّاً تُتابَع في «توصيات سابقة لم تُنجَز». فتغييرُ
 * لفظِها تغييرٌ لما التُزم به.
 *
 * فالحلُّ أن نصَّ التوصيات **لا يُرسل إلى النموذج أصلاً**: يكتبه الموظّف في
 * حقله، ويُطلب من النموذج أن يضع مكانَه سطرَ `RECOMMENDATIONS_TOKEN`، ثم تُدرج
 * هنا حرفاً بحرف. وإن خالف النموذجُ وكتب للقسم نصّاً من عنده، فنصُّه يُطرح
 * ويبقى نصُّ الموظّف — فالموضعُ يُعرف بالعنوان لا بالعلامة.
 */

/** العلامةُ التي يضعها النموذجُ مكان القسم — سطراً وحدَها. */
export const RECOMMENDATIONS_TOKEN = "<<التوصيات-كما-كُتبت>>";

/** عنوانُ القسم كما في هيكل المحضر — يُكتب هنا إن أسقطه النموذج. */
export const RECOMMENDATIONS_HEADING = "### ثالثاً: القرارات والتوصيات";

const DIACRITICS = /[ً-ْٰ]/g;

/** سطرُ قسمٍ: عنوانُ ماركداون، أو سطرٌ كلُّه عريضٌ كما يكتبه النموذج أحياناً. */
function isSectionLine(line: string): boolean {
  return /^\s{0,3}#{1,6}\s+\S/.test(line) || /^\s*\*\*[^*]+\*\*\s*:?\s*$/.test(line);
}

/** هل يحمل السطرُ هذا الترتيب؟ بلا تشكيلٍ، فـ«ثالثاً» و«ثالثا» سواء. */
function hasOrdinal(line: string, ordinal: string): boolean {
  return line.replace(DIACRITICS, "").includes(ordinal);
}

/**
 * نصُّ الموظّف كما كتبه: تُوحَّد نهاياتُ الأسطر (بايتات، لا كلمات) ويُقتطع
 * الفراغُ من الطرفين فقط — وما بين السطر الأوّل والأخير لا يُمَسّ.
 */
function verbatimBlock(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.join("\n");
}

/** تُنزع العلامةُ من المحضر: سطراً كاملاً، أو مدسوسةً في سطرٍ فيه غيرُها. */
function dropToken(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (!line.includes(RECOMMENDATIONS_TOKEN)) {
      out.push(line);
      continue;
    }
    const rest = line.split(RECOMMENDATIONS_TOKEN).join("");
    if (rest.trim() !== "") out.push(rest);
  }
  return out;
}

/** سطرٌ فارغٌ فاصلٌ، إلّا أن يكون الفاصلُ موجوداً أصلاً. */
function gap(before: string | undefined): string[] {
  return before === undefined || before.trim() === "" ? [] : [""];
}

/**
 * يُدرج نصَّ التوصيات في المحضر المصوغ، ويُرجع المحضرَ بعد الإدراج.
 *
 * وبلا نصٍّ: يُرجع المحضرَ كما هو بعد نزع العلامة — فلا تظهر للمستخدم علامةٌ
 * تقنيّةٌ في محضرٍ يُطبع.
 */
export function spliceRecommendations(formatted: string, recommendations: string): string {
  const lines = dropToken(formatted.replace(/\r\n?/g, "\n").split("\n"));
  const body = verbatimBlock(recommendations);
  if (body === "") return lines.join("\n");

  // ١) القسمُ موجود: يُستبدل متنُه كلُّه بنصِّ الموظّف — ولو كان النموذجُ قد
  //    كتب فيه صياغتَه الخاصّة.
  const start = lines.findIndex((l) => isSectionLine(l) && hasOrdinal(l, "ثالثا"));
  if (start !== -1) {
    let end = start + 1;
    while (end < lines.length && !isSectionLine(lines[end])) end += 1;
    const tail = lines.slice(end);
    return [
      ...lines.slice(0, start + 1),
      "",
      body,
      ...gap(tail[0]),
      ...tail,
    ].join("\n");
  }

  // ٢) أُسقط عنوانُ القسم: يُكتب كاملاً قبل «رابعاً» كي يبقى الترتيبُ سليماً.
  const block = [RECOMMENDATIONS_HEADING, "", body];
  const fourth = lines.findIndex((l) => isSectionLine(l) && hasOrdinal(l, "رابعا"));
  if (fourth !== -1) {
    const head = lines.slice(0, fourth);
    return [...head, ...gap(head[head.length - 1]), ...block, "", ...lines.slice(fourth)].join("\n");
  }

  // ٣) ولا «رابعاً» أيضاً: يُذيَّل به المحضر — فنصُّ الموظّف لا يُضيَّع بحالٍ.
  return [...lines, ...gap(lines[lines.length - 1]), ...block].join("\n");
}
