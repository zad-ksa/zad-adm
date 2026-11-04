/**
 * استبدالُ الروابط في شجرةٍ من JSON، بلا معرفةٍ بشكلها.
 *
 * ولزم لأنّ ثلاثةَ أعمدةٍ تحفظ الروابطَ **داخل** JSON لا نصّاً مسطَّحاً،
 * وأشكالُها ثلاثةٌ مختلفة: مصفوفةُ كائناتٍ في `Request.attachments`، وكائنُ
 * مصفوفاتٍ في `CustomSurveyResponse.attachments`، وتعشيشٌ عميقٌ في
 * `GlobalSetting.value`. فقارئٌ يعرف الشكلَ سلفاً يُخطئ واحداً منها حتماً،
 * **ويُخطئه بصمت**: يُبدِّل صفراً من الروابط فيُحسب العمودُ نظيفاً وهو لم يُمَسّ.
 *
 * والعمودُ يُكتب كلُّه أو لا شيء، فلا مجالَ لتصحيحٍ جزئيٍّ بعد الكتابة — ولذلك
 * هذه الدالّةُ خالصةٌ تُختبر قبل أن تُشغَّل على القاعدة.
 *
 * **والمطابقةُ تامّةٌ لا جزئيّة.** وهذا ليس احتياطاً بل مُقتضى بناءِ البيان:
 * سكربتُ النسخ لم يُسجِّل إلّا نصّاً كان **كلُّه** رابطَ Cloudinary صحيحاً
 * (`providerOf` على النصِّ كاملاً)، فمفاتيحُ البيان نصوصٌ كاملة. والاستبدالُ
 * الجزئيُّ يُفسد ما لم يُنسخ: نصٌّ يذكر رابطاً في متنِ كلامٍ يُبدَّل جزؤه
 * فيشير إلى ملفٍّ لم يُصعَّد، أو رابطٌ أطولُ يحمل أقصرَ في بدايته فيُقطَع.
 *
 * ولا تُبدَّل الشجرةُ في موضعها: تُبنى جديدةً. فالقديمةُ تبقى سليمةً إن سقط
 * شيءٌ في الطريق، ولا يُكتب في القاعدة نصفُ تحويل.
 */

export type UrlMap = Readonly<Record<string, string>>;

export type RewriteResult = {
  /** الشجرةُ الجديدة. وهي المُدخَلُ نفسُه مرجعاً إن لم يتغيّر شيء. */
  value: unknown;
  /** كم نصّاً استُبدل فعلاً. */
  replaced: number;
  /**
   * نصوصٌ يراها `suspect` باقيةً على المزوّد القديم ولم يُبدَّل منها شيء.
   *
   * وهي الفائدةُ الكبرى من الدالّة: بلا هذه القائمة يبقى العملُ «ناجحاً»
   * وفيه روابطُ لم تُنقل — ولا يُعلم بها حتى يُحذف المزوّدُ القديم فتنكسر.
   */
  suspects: string[];
};

/**
 * يمشي الشجرةَ ويُبدِّل كلَّ نصٍّ يُطابق مفتاحاً في البيان مطابقةً تامّة.
 *
 * و`suspect` اختياريّةٌ: تُسأل عن كلِّ نصٍّ **لم** يُبدَّل، فما أجابت عنه
 * بنعم يُجمع في `suspects` ليُعرض على من يُشغّل، لا ليُخمَّن له بديل.
 */
export function rewriteUrlsIn(
  value: unknown,
  map: UrlMap,
  suspect?: (text: string) => boolean
): RewriteResult {
  let replaced = 0;
  const suspects = new Set<string>();

  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      const next = map[node];
      if (next !== undefined && next !== node) {
        replaced++;
        return next;
      }
      if (suspect?.(node)) suspects.add(node);
      return node;
    }

    if (Array.isArray(node)) {
      let changed = false;
      const out = node.map((item) => {
        const result = walk(item);
        if (result !== item) changed = true;
        return result;
      });
      // المرجعُ نفسُه إن لم يتغيّر شيء، فلا يُكتب عمودٌ لم يُمَسّ.
      return changed ? out : node;
    }

    // `null` كائنٌ في نظر `typeof`، فيُفحَص قبله. والتاريخُ وما شابهه يُترك
    // كما هو: البيانُ روابطُ نصوصٍ لا كائناتٍ مُبنيَة.
    if (node !== null && typeof node === "object") {
      if (Object.getPrototypeOf(node) !== Object.prototype) return node;
      let changed = false;
      const out: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(node as Record<string, unknown>)) {
        const result = walk(item);
        if (result !== item) changed = true;
        out[key] = result;
      }
      return changed ? out : node;
    }

    return node;
  };

  return { value: walk(value), replaced, suspects: [...suspects] };
}

/**
 * نصٌّ يبقى على مزوّدٍ قديمٍ — يُستعمل `suspect` به.
 *
 * ويُفحَص بالمضيف لا بالامتداد: الرابطُ الذي لا يُطابق مفتاحاً في البيان قد
 * يكون لم يُنسخ، وقد يكون نصّاً يذكره في متنِ كلام. وكلاهما يُعرض ولا يُخمَّن.
 */
export function mentionsHost(host: string): (text: string) => boolean {
  const needle = host.toLowerCase();
  return (text: string) => text.toLowerCase().includes(needle);
}
