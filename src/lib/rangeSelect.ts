/**
 * تحديدٌ بالنقر، ومدىً بـShift — منطقٌ خالصٌ لا يعرف شيئاً عن البريد.
 *
 * وهو مُستخرَجٌ من الصفحة لأنّه يُخطئ بصمت: مدىً محسوبٌ بالمقلوب يُحدِّد
 * صفوفاً غير التي أُشير إليها، ومن ضغط «نقل للمهملات» بعده نقل غيرَ ما رأى.
 * ولا يُكتشف هذا في تجربةٍ عابرةٍ — الصفوفُ تُحدَّد كلُّها فيبدو أنّ الأمر عمل.
 */

export type RangeSelection = {
  /** التحديدُ الجديد، بلا تكرار. */
  selected: string[];
  /** المرساةُ الجديدةُ لمدىً تالٍ: المنقورُ دائماً. */
  anchor: string;
};

/**
 * يُبدِّل حالَ المنقور، أو — بـShift ومرساةٍ حاضرة — يُحدِّد ما بينهما.
 *
 * `ids` ترتيبُ الصفوف **كما تُعرض**: المدى ما بين الصفّين على الشاشة، وهو ما
 * تراه العينُ حين تُمسك Shift. ولو حُسب على ترتيبٍ آخرَ (ترتيبُ التحديد
 * مثلاً) لحدَّد صفوفاً متفرّقةً لا كتلةً واحدة.
 *
 * **والمدى يُضيف ولا يقلب.** فالقلبُ على كل صفٍّ في المدى يجعل Shift على
 * تحديدٍ قائمٍ يُلغي نصفَه ويُثبِت نصفَه — وهو ما لا يتوقّعه أحد. والمقصودُ
 * «خُذ هذه كلَّها»، فتُضمّ إلى ما هو محدَّدٌ ويبقى ما كان.
 *
 * ومرساةٌ ليست في `ids` — لأنّ الصفحةَ تغيّرت أو المجلّدَ — تُسقط المدى إلى
 * نقرةٍ عاديّة. وهو الصوابُ: لا يُحدَّد ما لا يُرى.
 */
export function toggleWithRange(
  ids: readonly string[],
  selected: readonly string[],
  clicked: string,
  anchor: string | null,
  shiftKey: boolean
): RangeSelection {
  if (shiftKey && anchor !== null && anchor !== clicked) {
    const from = ids.indexOf(anchor);
    const to = ids.indexOf(clicked);
    if (from !== -1 && to !== -1) {
      const span = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
      return { selected: [...new Set([...selected, ...span])], anchor: clicked };
    }
  }

  const next = selected.includes(clicked)
    ? selected.filter((id) => id !== clicked)
    : [...selected, clicked];
  return { selected: next, anchor: clicked };
}
