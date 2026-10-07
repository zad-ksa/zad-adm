import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";

/**
 * يكمل محادثة توليد وثيقة قائمة بطلب تعديل — بلا إعادة بناء البرومبت العام،
 * فقط استئناف ما أعاده /generate (أو /analyze عند "إعادة بناء الوثيقة").
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

    const { history, message } = body;
    if (!message?.trim()) return NextResponse.json({ error: "اكتب طلب التعديل" }, { status: 400 });

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (m: any) =>
              m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content
          )
          .slice(-20)
      : [];
    if (safeHistory.length === 0) {
      return NextResponse.json({ error: "لا توجد وثيقة لتعديلها" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط في الخادم" }, { status: 500 });
    }

    const messages = [...safeHistory, { role: "user" as const, content: message.trim() }];

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const result = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16000,
      messages,
    });

    const textBlock = result.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";
    if (!content) return NextResponse.json({ error: "لم يُنتج الذكاء الاصطناعي أي نص" }, { status: 502 });

    return NextResponse.json({
      content,
      truncated: result.stop_reason === "max_tokens",
      history: [...messages, { role: "assistant", content }],
    });
  } catch (err: any) {
    console.error("Project builder revise error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
