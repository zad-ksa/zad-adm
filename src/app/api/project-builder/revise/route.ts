import { streamDocument } from "@/lib/aiDocumentStream";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";

// وثيقةٌ كاملةٌ تستغرق دقائق: بلا هذا يقطعها Vercel عند مهلته الافتراضية فيُرجع
// صفحةَ خطأٍ HTML بدل JSON، فتظهر للمستخدم «Unexpected token <».
export const maxDuration = 300;

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

    // الوثيقةُ المعدَّلة تُكتب كاملةً، وقد تطول — فتُبثّ وتُكمل كالتوليد.
    const partial = typeof body.partial === "string" ? body.partial.trimEnd() : "";
    return streamDocument(messages, partial);
  } catch (err: any) {
    console.error("Project builder revise error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
