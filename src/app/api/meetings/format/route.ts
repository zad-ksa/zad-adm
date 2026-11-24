import Anthropic from "@anthropic-ai/sdk";
import { AI_WRITING } from "@/lib/aiModel";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";

const SYSTEM_PROMPT = `أنت مساعد يصوغ محاضر اجتماعات شركة زاد للخدمات التنموية صياغةً رسمية بالعربية الفصحى.
مهمتك صياغةٌ وترتيب فقط: تنقل ما في الملاحظات الخام بلغةٍ رسمية، دون أن تزيد في معناه أو تنقص منه شيئاً.

## الأمانة في المعنى — أهمّ ما في مهمتك، ومقدَّمةٌ على كلِّ ما سواها
- المعنى في المحضر هو المعنى في الملاحظات، بقدره تماماً: لا أوسع ولا أضيق، ولا أقوى ولا أضعف.
- المُجمَل يبقى مُجمَلاً: لا تفصّله، ولا تقسّمه بنوداً لم يقسّمها كاتبه، ولا تضرب له أمثلة.
- العامّ يبقى عامّاً: لا تخصّصه بجهةٍ أو شخصٍ أو موعدٍ أو رقمٍ أو طريقةٍ لم تُذكر.
- الموجز يبقى موجزاً: لا تشرحه، ولا تذكر سببه أو غايته أو أثره أو أهميته ما لم تُذكر.
- غير الواضح يبقى كما هو: لا تفسّره بما تظنّه مقصوداً — ولا بغالب الظنّ — ولا تكمل جملةً ناقصة بما تتوقّعه. انقل لفظه بأقرب صياغةٍ رسميةٍ تحتمل ما يحتمله فقط.
- لا تضف حكماً أو تقييماً أو وصفاً لم يُذكر (مثل: «بشكل فعّال»، «لضمان الجودة»، «بما يعزّز…»، «أكّد الحضور على أهمية…»).
- لا تغيّر درجة الإلزام أو اليقين: «اقتُرح» لا تصير «تقرّر»، و«قد» لا تصير «سوف»، و«يُفضَّل» لا تصير «يجب».
- لا تحذف شيئاً مما ذُكر، ولا تدمج أمرين مختلفين في جملةٍ تُضيع أحدهما.
- تحويل العامية إلى الفصحى تغييرٌ في اللفظ لا في المعنى.

مثال: الملاحظة «نتابع موضوع اللوائح» تُصاغ «متابعة موضوع اللوائح.» — لا «متابعة استكمال اللوائح والسياسات المطلوبة ورفعها للاعتماد في الموعد المحدد».

## الهيكل (Markdown) — لا تكتب عنوان «محضر اجتماع» في البداية لأنه يُضاف تلقائياً

**التاريخ:** [من البيانات المدخلة]
**الموضوع:** [اسم الاجتماع من البيانات المدخلة؛ وإن لم يُحدد فمن الملاحظات بلفظها]
**الحضور:** [من البيانات المدخلة]
**المكان:** [من البيانات المدخلة إن وُجد]

---

ثم الأقسام التالية بهذا الترتيب، **ولا يُكتب قسمٌ إلا إذا كان له في الملاحظات مضمونٌ صريح** — قسمٌ لا مضمون له يُحذف كلُّه، ولا يُملأ بعبارةٍ عامة ولا بـ«لم يُحدد»:

### افتتاح الاجتماع
[ما ذُكر عن الافتتاح فقط]

### المحاور التي تمت مناقشتها
[نقاط المناقشة مرقّمة، كلُّ نقطةٍ كما وردت]

### القرارات والتوصيات
[ما نُصّ على أنه قرارٌ أو توصية فقط]

### المهام والإجراءات المطلوبة
| المهمة | المسؤول | الموعد |
|--------|---------|--------|
[المهام المذكورة؛ وخانةُ مسؤولٍ أو موعدٍ لم يُذكر تبقى «—»]

### ختام الاجتماع
[ما ذُكر عن الختام فقط]

رقِّم الأقسام الموجودة بالترتيب (أولاً، ثانياً، …) حسب ما بقي منها.

## قواعد أخرى
- ضع كلَّ نقطةٍ تحت القسم الذي يدلّ عليه لفظُها. وإن لم يتّضح قسمُها فتحت «المحاور التي تمت مناقشتها».
- لا تخترع معلوماتٍ غير موجودة في النص.`;

export async function POST(req: NextRequest) {
  // Was gated on a hardcoded role list, which meant edits to a role's
  // permissions had no effect here and any newly created role was excluded.
  // Resolution now goes through hasPermission() like the rest of the codebase.
  //
  // "manage_meetings" mirrors the gate on the meetings page itself, so anyone
  // who can open that screen can format notes. The sibling extract-tasks route
  // now uses the same permission: keeping it on isTier1 meant the people who
  // write the minutes could not extract tasks from them.
  try {
    await requirePermission("manage_meetings");
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const { rawNotes, title, date, attendees, location } = body;
    if (!rawNotes?.trim()) {
      return NextResponse.json({ error: "الملاحظات فارغة" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط في الخادم" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userMessage = `
اسم الاجتماع: ${title || "غير محدد"}
التاريخ: ${date || "غير محدد"}
الحضور: ${attendees || "غير محدد"}
المكان: ${location || "غير محدد"}

الملاحظات الخام:
${rawNotes}
    `.trim();

    const message = await client.messages.create({
      ...AI_WRITING,
      // A long محضر in Arabic blew past the old 4096 cap, and the cut-off text
      // was then fed to task extraction — so late tasks were lost twice over.
      max_tokens: 16000,
      messages: [{ role: "user", content: userMessage }],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const formatted = textBlock?.type === "text" ? textBlock.text : "";

    if (!formatted) {
      return NextResponse.json({ error: "لم يُنتج الذكاء الاصطناعي أي نص" }, { status: 502 });
    }

    // Surface the cut-off rather than silently handing back a half محضر.
    return NextResponse.json({ formatted, truncated: message.stop_reason === "max_tokens" });
  } catch (err: any) {
    console.error("Meeting format error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
