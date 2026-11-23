/**
 * قراءةُ وثيقةٍ تُبثّ من منشئ الوثائق — تُنادى من شاشتين.
 *
 * **ولمَ وحدةٌ مستقلّة**: «منشئ وثائق المبادرات» يكتب الوثيقةَ ابتداءً،
 * و«طلبات وثائق المشاريع» يكتبها من طلبِ جمعية — والبثُّ والتقطيعُ وإكمالُ
 * الدفعات واحدٌ فيهما. ولو نُسخ لافترق السلوكان عند أوّل إصلاح.
 *
 * **وهي للمتصفّح**: تقرأ جسمَ الرد (`Response.body`) بثّاً، فلا تُستدعى في
 * الخادم.
 */

export type HistoryMsg = { role: "user" | "assistant"; content: string };


/**
 * ردُّ الخادم JSON — أو رسالةٌ تُفهم إن لم يكن: مهلةٌ انقضت قبل اكتمال الوثيقة
 * تُرجع صفحةَ خطأٍ HTML، فكانت تظهر للمستخدم «Unexpected token <».
 */
/**
 * قراءةُ وثيقةٍ تُبثّ سطراً سطراً من /generate، مع إبلاغ الشاشة بكل قطعة.
 * وإن لم يكن الردُّ بثّاً (خطأُ صلاحيةٍ أو بياناتٍ قبل البدء) قُرئ JSON ورُمي خطؤه.
 */
export async function readGenerateStream(
  res: Response,
  onText: (full: string) => void,
  /** ما كُتب في الدفعات السابقة — تُكمله هذه الدفعة. */
  before = ""
): Promise<{ content: string; more: boolean; base: HistoryMsg[] }> {
  if (!(res.headers.get("content-type") || "").includes("ndjson") || !res.body) {
    const data = await readJson(res);
    throw new Error(String(data?.error ?? "تعذّر توليد الوثيقة"));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // والخادمُ أكمل من النصِّ بلا فراغه الأخير، فيُبنى عليه كذلك.
  // والدفعةُ التالية تبدأ سطراً جديداً (السابقةُ قُطعت عند آخر سطرٍ كامل).
  let content = before.trim() ? before.trimEnd() + "\n" : "";
  let done: { more: boolean; base: HistoryMsg[] } | null = null;

  const handle = (line: string) => {
    if (!line.trim()) return;
    const msg = JSON.parse(line);
    if (msg.t === "delta") {
      content += msg.text;
      onText(content);
    } else if (msg.t === "done") {
      done = { more: !!msg.more, base: Array.isArray(msg.base) ? msg.base : [] };
    } else if (msg.t === "error") {
      throw new Error(msg.error || "تعذّر إكمال الوثيقة");
    }
  };

  for (;;) {
    const { value, done: ended } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      handle(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
    if (ended) break;
  }
  handle(buffer);

  const finished = done as { more: boolean; base: HistoryMsg[] } | null;
  if (!finished) {
    // انقطع البثُّ قبل «done» — مهلةُ الخادم أو الشبكة.
    throw new Error(
      content
        ? "انقطع الاتصال قبل اكتمال الوثيقة. جرّب مرة أخرى."
        : "استغرق إعداد الوثيقة وقتاً أطول من المسموح فتوقف الخادم. جرّب مرة أخرى."
    );
  }
  if (!content) throw new Error("لم يُنتج الذكاء الاصطناعي أي نص");
  return { content, more: finished.more, base: finished.base };
}

/**
 * يكتب وثيقةً كاملةً عبر أحد مسارات الكتابة (توليد، تعديل، إعادة بناء). الخادمُ
 * يكتبها في طلبٍ واحدٍ ما أمكن؛ فإن قاربت مهلتَه أوقفها، فتُقطع هنا عند آخر فقرةٍ
 * كاملة ويُطلب إكمالُها — فلا تُبنى دفعةٌ على كلمةٍ أو جدولٍ مبتور.
 */
export async function writeDocument(
  url: string,
  request: Record<string, unknown>,
  onText: (full: string) => void = () => {}
): Promise<{ content: string; truncated: boolean; history: HistoryMsg[] }> {
  const MAX_SEGMENTS = 6;
  let data = { content: "", more: true, base: [] as HistoryMsg[] };
  for (let segment = 0; segment < MAX_SEGMENTS && data.more; segment++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(segment === 0 ? request : { ...request, partial: data.content }),
    });
    data = await readGenerateStream(res, onText, data.content);
    if (data.more) {
      // آخرُ فقرةٍ كاملة: الفقراتُ والجداولُ تفصلها أسطرٌ فارغة، فلا يُقطع جدولٌ في وسطه.
      const para = data.content.lastIndexOf("\n\n");
      const line = data.content.lastIndexOf("\n");
      const cut = para > 0 ? para : line;
      if (cut > 0) data.content = data.content.slice(0, cut).trimEnd() + "\n";
      onText(data.content);
    }
  }
  return {
    content: data.content,
    // بقي ما يُكتب بعد آخر دفعة: الوثيقةُ مقطوعة.
    truncated: data.more,
    history: [...data.base, { role: "assistant", content: data.content }],
  };
}

/** ردُّ الخادم كائناً — و`unknown` لا `any`: القارئُ يفحص ما يقرأ. */
export async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 504 || /timeout/i.test(text)) {
      throw new Error("استغرق إعداد الوثيقة وقتاً أطول من المسموح فتوقف الخادم. جرّب مرة أخرى، أو اختصر البرومبت أو عدد المحاور.");
    }
    throw new Error(`تعذّر قراءة رد الخادم (رمز ${res.status}). جرّب مرة أخرى.`);
  }
}
