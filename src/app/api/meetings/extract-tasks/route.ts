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
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const { formattedContent } = body;
    if (!formattedContent?.trim()) {
      return NextResponse.json({ tasks: [] });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: `أنت مساعد يستخلص المهام من محاضر الاجتماعات.
استخرج كل مهمة أو إجراء مطلوب من النص وأعدها كـ JSON array.
أعد فقط JSON بهذا الشكل بدون أي نص آخر:
[{"title": "عنوان المهمة"}, ...]
إذا لم توجد مهام أعد: []`,
      messages: [
        {
          role: "user",
          content: `استخرج المهام والإجراءات من هذا المحضر:\n\n${formattedContent}`,
        },
      ],
    });

    const raw = (message.content[0] as any).text.trim();
    let tasks: { title: string }[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) tasks = JSON.parse(match[0]);
    } catch {
      tasks = [];
    }

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error("Extract tasks error:", err);
    return NextResponse.json({ error: err?.message || "حدث خطأ" }, { status: 500 });
  }
}
