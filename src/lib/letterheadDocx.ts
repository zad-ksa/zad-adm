// صبُّ وثيقة المبادرة في كليشة الجمعية — في المتصفح، بلا خادم.
//
// والكليشةُ هي الأصل لا الوثيقة: يُفتح مستندُ الجمعية كما هو، فيبقى رأسُه
// وتذييلُه وهوامشُه وحجمُ صفحته وخلفيّتُه وخطوطُ سماته، ويُستبدل متنُه وحده
// بمتن الوثيقة. فكلُّ ما صمّمته الجمعيةُ في Word يبقى كما صمّمته.
//
// ومن متن الكليشة يُبقى ما فيه رسمٌ (شعارٌ أو إطارٌ مثبَّتٌ في الصفحة) ويُحذف
// النصّ: كثيرٌ من الكليشات تضع زخرفتها في المتن لا في الرأس، وحذفُها يُفقد
// الكليشةَ نفسَها. ونصُّ المثال («بسم الله»، «التاريخ:») يُحذف ليحلّ محلَّه نصُّ
// الوثيقة.

import JSZip from "jszip";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** مسارُ المتن في الحزمة — word/document.xml غالباً، ويُقرأ من علاقاتها احتياطاً. */
async function mainPartPath(zip: JSZip): Promise<string> {
  const rels = await zip.file("_rels/.rels")?.async("string");
  const match = rels?.match(/Type="[^"]*\/officeDocument"[^>]*Target="\/?([^"]+)"/) ??
    rels?.match(/Target="\/?([^"]+)"[^>]*Type="[^"]*\/officeDocument"/);
  return match?.[1] ?? "word/document.xml";
}

function bodyOf(doc: Document): Element {
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("ملف الكليشة لا يحوي متن مستند Word");
  return body;
}

/** هل في العنصر رسمٌ يخصّ الكليشة (صورة، شكل، إطار)؟ */
function hasGraphic(el: Element): boolean {
  return /<(w:drawing|w:pict|mc:AlternateContent|w:object)\b/.test(new XMLSerializer().serializeToString(el));
}

/**
 * يصبّ `content` (مستند Word مولَّد) في `letterhead` (مستند الجمعية)، ويُرجع
 * المستندَ الناتج.
 */
export async function mergeIntoLetterhead(content: Blob, letterhead: ArrayBuffer): Promise<Blob> {
  const [gen, tpl] = await Promise.all([JSZip.loadAsync(await content.arrayBuffer()), JSZip.loadAsync(letterhead)]);

  const genPath = await mainPartPath(gen);
  const tplPath = await mainPartPath(tpl);
  const genXml = await gen.file(genPath)?.async("string");
  const tplXml = await tpl.file(tplPath)?.async("string");
  if (!genXml) throw new Error("تعذّر قراءة الوثيقة المولَّدة");
  if (!tplXml) throw new Error("ملف الكليشة ليس مستند Word صالحاً (.docx)");

  const parser = new DOMParser();
  const genDoc = parser.parseFromString(genXml, "application/xml");
  const tplDoc = parser.parseFromString(tplXml, "application/xml");
  if (tplDoc.getElementsByTagName("parsererror").length) throw new Error("ملف الكليشة تالف");

  const genBody = bodyOf(genDoc);
  const tplBody = bodyOf(tplDoc);

  // إعدادُ قسم الكليشة الأخير — الصفحةُ والهوامشُ والرأسُ والتذييل — هو ما يبقى.
  const tplChildren = Array.from(tplBody.childNodes).filter((n): n is Element => n.nodeType === 1);
  const finalSect = [...tplChildren].reverse().find((el) => el.localName === "sectPr") ?? null;

  for (const el of tplChildren) {
    if (el === finalSect) continue;
    // رسمُ الكليشة في المتن يبقى، ويُفرَّغ نصُّه.
    if (el.localName === "p" && hasGraphic(el)) {
      for (const t of Array.from(el.getElementsByTagNameNS(W, "t"))) t.textContent = "";
      continue;
    }
    tplBody.removeChild(el);
  }

  for (const node of Array.from(genBody.childNodes)) {
    if (node.nodeType !== 1 || (node as Element).localName === "sectPr") continue;
    tplBody.insertBefore(tplDoc.importNode(node, true), finalSect);
  }

  tpl.file(tplPath, new XMLSerializer().serializeToString(tplDoc));
  return tpl.generateAsync({ type: "blob", mimeType: DOCX_MIME });
}
