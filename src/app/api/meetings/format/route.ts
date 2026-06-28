import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const ALL_STAFF = [
  "ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER",
  "ADMINISTRATIVE_SECRETARIAT", "STRATEGY", "FINANCE", "GOVERNANCE"
];

const SYSTEM_PROMPT = `أنت مساعد متخصص في تنسيق محاضر اجتماعات شركة زاد للخدمات التنموية.
مهمتك: تحويل الملاحظات الخام غير المنظمة إلى محضر اجتماع رسمي باللغة العربية الفصحى.

هيكل المحضر الذي يجب أن تنتجه (بصيغة Markdown):
## محضر اجتماع

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

---
*صدر هذا المحضر عن شركة زاد للخدمات التنموية*
*محضر إلكتروني عبر موقع زاد*

قواعد مهمة:
- حوّل العامية إلى فصحى رسمية
- رتّب النقاط المتفرقة تحت محاورها الصحيحة
- لا تخترع معلومات غير موجودة في النص
- إذا لم يُذكر عنصر ما، احذف قسمه أو اكتب "لم يُحدد"`;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !ALL_STAFF.includes(session.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

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
      max_tokens: 4096,
      messages: [{ role: "user", content: userMessage }],
      system: SYSTEM_PROMPT,
    });

    const formatted = (message.content[0] as any).text;
    return NextResponse.json({ formatted });
  } catch (err: any) {
    console.error("Meeting format error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
