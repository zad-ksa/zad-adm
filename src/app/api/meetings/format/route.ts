import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";
import { RECOMMENDATIONS_TOKEN, spliceRecommendations } from "@/lib/meetingMinutes";

/**
 * نصُّ القرارات والتوصيات — إن كتبه الموظّف في حقله فهو **لا يُرسل إلى
 * النموذج**: يُطلب منه سطرُ علامةٍ مكانَ القسم، ثم يُدرج النصُّ حرفاً بحرف في
 * الخادم (`spliceRecommendations`). ولو أُرسل مع الملاحظات وقيل له «لا تُعدّله»
 * لبقي الأمرُ رجاءً، وهو مُطالَبٌ في السطور نفسِها بالتفصيح وبدمج النقاط.
 */
function systemPrompt(verbatim: boolean) {
  const thirdSection = verbatim
    ? `[اكتب سطراً واحداً فقط هو: ${RECOMMENDATIONS_TOKEN} — ولا تكتب شيئاً غيره في هذا القسم، فالقراراتُ والتوصياتُ يكتبها الموظّف بنفسه وتُدرج مكانَ هذا السطر كما هي]`
    : `[القرارات المتخذة كقائمة واضحة — وتُنقل بألفاظها كما وردت في الملاحظات بلا إعادة صياغة]`;

  return `أنت مساعد متخصص في تنسيق محاضر اجتماعات شركة زاد للخدمات التنموية.
مهمتك: تحويل الملاحظات الخام غير المنظمة إلى محضر اجتماع رسمي باللغة العربية الفصحى.

هيكل المحضر الذي يجب أن تنتجه (بصيغة Markdown) — لا تكتب عنوان "محضر اجتماع" في البداية لأنه يُضاف تلقائياً:

**التاريخ:** [من البيانات المدخلة]
**الموضوع:** [استخلص العنوان المناسب]
**الحضور:** [من البيانات المدخلة]
**المكان:** [من البيانات المدخلة إن وُجد]

---

### أولاً: افتتاح الاجتماع
[ملخص موجز للافتتاح]

### ثانياً: المحاور التي تمت مناقشتها
[نقاط المناقشة منظمة ومرقمة]

### ثالثاً: القرارات والتوصيات
${thirdSection}

### رابعاً: المهام والإجراءات المطلوبة
| المهمة | المسؤول | الموعد |
|--------|---------|--------|
[جدول المهام إن وُجدت]

### خامساً: ختام الاجتماع
[ملاحظات الختام]

قواعد مهمة:
- حوّل العامية إلى فصحى رسمية${verbatim ? " — في كل الأقسام إلا قسم القرارات والتوصيات، فهو ليس من عملك" : " — إلا نصوص القرارات والتوصيات، فتُنقل كما هي"}
- رتّب النقاط المتفرقة تحت محاورها الصحيحة
- لا تخترع معلومات غير موجودة في النص
- إذا لم يُذكر عنصر ما، احذف قسمه أو اكتب "لم يُحدد"${
    verbatim
      ? `\n- أبقِ عنوان "### ثالثاً: القرارات والتوصيات" في موضعه بالترتيب نفسه، وتحته السطر ${RECOMMENDATIONS_TOKEN} وحده`
      : ""
  }`;
}

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

    const { rawNotes, title, date, attendees, location, recommendations } = body;
    if (!rawNotes?.trim()) {
      return NextResponse.json({ error: "الملاحظات فارغة" }, { status: 400 });
    }

    const verbatimText = typeof recommendations === "string" ? recommendations : "";
    const verbatim = verbatimText.trim() !== "";

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط في الخادم" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // ولا يدخل نصُّ التوصيات هذه الرسالةَ: ما لا يُرسل لا يُعاد صياغته.
    const userMessage = `
اسم الاجتماع: ${title || "غير محدد"}
التاريخ: ${date || "غير محدد"}
الحضور: ${attendees || "غير محدد"}
المكان: ${location || "غير محدد"}

الملاحظات الخام:
${rawNotes}
    `.trim();

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      // A long محضر in Arabic blew past the old 4096 cap, and the cut-off text
      // was then fed to task extraction — so late tasks were lost twice over.
      max_tokens: 16000,
      messages: [{ role: "user", content: userMessage }],
      system: systemPrompt(verbatim),
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const modelText = textBlock?.type === "text" ? textBlock.text : "";

    if (!modelText) {
      return NextResponse.json({ error: "لم يُنتج الذكاء الاصطناعي أي نص" }, { status: 502 });
    }

    // تُنزع العلامةُ في كلِّ حال — فلا تظهر في محضرٍ يُطبع ولو جاءت بلا نصٍّ معها.
    const formatted = spliceRecommendations(modelText, verbatimText);

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
