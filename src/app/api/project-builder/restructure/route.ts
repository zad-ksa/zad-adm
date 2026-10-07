import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";
import { PROJECT_BUILDER_SECTIONS } from "@/lib/projectBuilder";

/** يعيد بناء النص الملصوق (بعد التحليل) وفق الهيكل المعياري، بما اختاره المستخدم من إزالة/إضافة/توجيهات. */
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
    if (!text) return NextResponse.json({ error: "لا يوجد نص لإعادة بنائه" }, { status: 400 });
    if (text.length > 20000) {
      return NextResponse.json({ error: "النص طويل جداً (الحد 20,000 حرف)." }, { status: 400 });
    }

    const removals: string[] = Array.isArray(body?.removals) ? body.removals.filter((x: any) => typeof x === "string") : [];
    const additions: string[] = Array.isArray(body?.additions) ? body.additions.filter((x: any) => typeof x === "string") : [];
    const directives: string[] = Array.isArray(body?.directives)
      ? body.directives.filter((x: any) => typeof x === "string" && x.trim()).slice(0, 20)
      : [];

    let inst =
      "بناءً على النص المرفق، أعد كتابته كوثيقة مبادرة متكاملة وفق الهيكل المعياري المكون من 14 محوراً:\n" +
      PROJECT_BUILDER_SECTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n") +
      "\n\n";
    if (removals.length) inst += "أزل المحتوى التالي:\n" + removals.map((r) => "• " + r).join("\n") + "\n\n";
    if (additions.length) inst += "أضف المحاور التالية:\n" + additions.map((a) => "• " + a).join("\n") + "\n\n";
    if (directives.length)
      inst += "توجيهات خاصة (لها الأولوية القصوى):\n" + directives.map((d, i) => `${i + 1}. ${d}`).join("\n") + "\n\n";
    inst += "اكتب الوثيقة كاملة بلغة عربية مبسطة ومباشرة، بعناوين واضحة وجداول نصية حيث يلزم.\n\nالنص الأصلي:\n" + text;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط في الخادم" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [{ role: "user", content: inst }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";
    if (!content) return NextResponse.json({ error: "لم يُنتج الذكاء الاصطناعي أي نص" }, { status: 502 });

    return NextResponse.json({
      content,
      truncated: message.stop_reason === "max_tokens",
      history: [
        { role: "user", content: inst },
        { role: "assistant", content },
      ],
    });
  } catch (err: any) {
    console.error("Project builder restructure error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
