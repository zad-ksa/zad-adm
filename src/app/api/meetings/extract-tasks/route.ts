import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const TIER1 = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !TIER1.includes(session.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const { formattedContent } = body;
    if (!formattedContent?.trim()) {
      return NextResponse.json({ tasks: [], summary: "" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `أنت مساعد يحلل محاضر اجتماعات وتعيد JSON فقط بهذا الشكل الدقيق بدون أي نص إضافي:
{
  "summary": "ملخص موجز جداً للمحضر في 2-3 جمل",
  "tasks": [
    {"title": "عنوان المهمة أو التوصية", "assigneeName": "اسم المكلف من النص أو null إذا لم يذكر"}
  ]
}
قواعد:
- الملخص: 2-3 جمل بالعربية تلخص أهم ما تم
- المهام: كل إجراء أو توصية أو مهمة مذكورة في المحضر
- assigneeName: اسم الشخص المكلف كما ذُكر في النص، أو null إذا لم يحدد أحد
- لا تخترع معلومات غير موجودة في المحضر
- أعد JSON فقط`,
      messages: [{
        role: "user",
        content: `حلل هذا المحضر وأعد JSON:\n\n${formattedContent}`,
      }],
    });

    const raw = (message.content[0] as any).text.trim();
    let result: { summary: string; tasks: { title: string; assigneeName: string | null }[] } = { summary: "", tasks: [] };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
    } catch {
      // fallback: try old format
      try {
        const arrMatch = raw.match(/\[[\s\S]*\]/);
        if (arrMatch) result.tasks = JSON.parse(arrMatch[0]);
      } catch {}
    }

    return NextResponse.json({ tasks: result.tasks || [], summary: result.summary || "" });
  } catch (err: any) {
    console.error("Extract tasks error:", err);
    return NextResponse.json({ error: err?.message || "حدث خطأ" }, { status: 500 });
  }
}
