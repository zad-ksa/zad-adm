import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";

const SYSTEM_PROMPT = `أنت مساعد متخصص في تنسيق محاضر اجتماعات شركة زاد للخدمات التنموية.
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
[القرارات المتخذة كقائمة واضحة]

### رابعاً: المهام والإجراءات المطلوبة
| المهمة | المسؤول | الموعد |
|--------|---------|--------|
[جدول المهام إن وُجدت]

### خامساً: ختام الاجتماع
[ملاحظات الختام]

قواعد مهمة:
- حوّل العامية إلى فصحى رسمية
- رتّب النقاط المتفرقة تحت محاورها الصحيحة
- لا تخترع معلومات غير موجودة في النص
- إذا لم يُذكر عنصر ما، احذف قسمه أو اكتب "لم يُحدد"`;

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
      model: "claude-haiku-4-5-20251001",
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
