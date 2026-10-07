import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { normalizeProjectBuilderOptions } from "@/lib/projectBuilder";

/**
 * يقارن نصاً ملصوقاً (لا ملفاً مرفوعاً) بمحاور الوثيقة المعيارية — المحفوظة
 * في GlobalSetting، لا ثابتة في الكود.
 *
 * التحليل عبر لصق نصّ لا رفع ملف عمداً: استخراج ملف PDF/Word/PowerPoint في
 * المتصفح ثم إرسال محتواه كاملاً للذكاء الاصطناعي كان يستهلك نقاطاً أكثر بكثير
 * من توليد وثيقة عادية. اللصق اليدوي يُبقي الطول تحت سيطرة من يستعمل الأداة.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("use_project_builder");
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

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "الصق نصّ الوثيقة أولاً" }, { status: 400 });
    if (text.length > 20000) {
      return NextResponse.json({ error: "النص طويل جداً (الحد 20,000 حرف). الصق أهمّ أجزاء الوثيقة." }, { status: 400 });
    }

    const optionsRecord = await prisma.globalSetting.findUnique({ where: { key: "PROJECT_BUILDER_OPTIONS" } });
    const { sections } = normalizeProjectBuilderOptions(optionsRecord?.value);
    if (sections.length === 0) {
      return NextResponse.json(
        { error: "لم تُعدّ قائمة محاور الوثيقة المعيارية بعد. تواصل مع من يملك صلاحية التحكم بالأداة." },
        { status: 409 }
      );
    }

    const analysisPrompt =
      "أنت مستشار متخصص في تصميم المبادرات للجمعيات الخيرية.\n\n" +
      "حلّل النص المرفق وقارنه بالهيكل المعياري التالي:\n" +
      sections.map((s, i) => `${i + 1}. ${s}`).join("\n") +
      '\n\nأرجع النتيجة بصيغة JSON فقط بدون أي نص أو شرح أو علامات markdown، بالشكل التالي بالضبط:\n' +
      '{"matching":[{"section":"اسم المحور","summary":"ملخص مختصر لما هو موجود في النص"}],"extra":[{"item":"عنوان العنصر الزائد","detail":"وصف مختصر لمحتواه"}],"missing":[{"section":"اسم المحور المفقود","suggestion":"اقتراح مختصر لما يمكن إضافته"}]}\n\n' +
      "• matching = المحاور الموجودة ومتوافقة\n" +
      "• extra = محتوى غير موجود في المحاور المعيارية أعلاه\n" +
      "• missing = محاور مفقودة\n" +
      "• أرجع JSON فقط";

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط في الخادم" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: text }],
      system: analysisPrompt,
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";
    if (!raw) return NextResponse.json({ error: "لم يُنتج الذكاء الاصطناعي أي نص" }, { status: 502 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      return NextResponse.json({ error: "تعذّر فهم نتيجة التحليل. حاول مرة أخرى." }, { status: 502 });
    }

    return NextResponse.json({ result: parsed, sections });
  } catch (err: any) {
    console.error("Project builder analyze error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
