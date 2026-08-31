import Anthropic from "@anthropic-ai/sdk";
import { requirePermission, authErrorResponse } from "@/lib/guards";
import { NextRequest, NextResponse } from "next/server";

type ExtractedTask = { title: string; assigneeName: string | null };
type ExtractResult = { summary: string; tasks: ExtractedTask[] };

// The response is constrained by this schema, so the model cannot emit prose,
// markdown fences, or malformed JSON around the payload.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "ملخص موجز للمحضر في 2-3 جمل" },
    tasks: {
      type: "array",
      description: "كل إجراء أو توصية أو مهمة مذكورة في المحضر، بدون حد أقصى",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          assigneeName: {
            type: ["string", "null"],
            description: "اسم الشخص المكلف كما ذُكر في النص، أو null",
          },
        },
        required: ["title", "assigneeName"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "tasks"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `أنت مساعد يحلل محاضر اجتماعات ويستخرج منها الملخص وجميع المهام.
قواعد:
- الملخص: 2-3 جمل بالعربية تلخص أهم ما تم
- المهام: استخرج **كل** إجراء أو توصية أو مهمة مذكورة في المحضر — بما فيها ما ورد في جدول "المهام والإجراءات المطلوبة" وفي قسم "القرارات والتوصيات". لا تدمج مهمتين في واحدة ولا تكتفِ بأهمها؛ لا يوجد حد أقصى لعدد المهام.
- assigneeName: اسم الشخص المكلف كما ذُكر في النص، أو null إذا لم يحدد أحد
- لا تخترع معلومات غير موجودة في المحضر`;

/**
 * Salvages the complete task objects from a JSON payload that was cut off
 * mid-generation. Without this, one truncated response silently yields zero
 * tasks — which is indistinguishable from "the meeting had no tasks".
 */
function salvagePartialJson(raw: string): ExtractResult | null {
  const summaryMatch = raw.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const summary = summaryMatch ? JSON.parse(`"${summaryMatch[1]}"`) : "";

  const tasks: ExtractedTask[] = [];
  const objectRe = /\{(?:[^{}"]|"(?:[^"\\]|\\.)*")*\}/g;
  for (const [objText] of raw.matchAll(objectRe)) {
    try {
      const obj = JSON.parse(objText);
      if (obj && typeof obj.title === "string" && obj.title.trim()) {
        tasks.push({
          title: obj.title,
          assigneeName: typeof obj.assigneeName === "string" ? obj.assigneeName : null,
        });
      }
    } catch {
      // partial object at the cut-off point — skip it
    }
  }

  if (!summary && tasks.length === 0) return null;
  return { summary, tasks };
}

function parseResult(raw: string): ExtractResult | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      };
    }
  } catch {
    // not clean JSON — fall through to the salvage paths below
  }

  const braced = raw.match(/\{[\s\S]*\}/);
  if (braced) {
    try {
      const parsed = JSON.parse(braced[0]);
      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      };
    } catch {
      // fall through
    }
  }

  return salvagePartialJson(raw);
}

export async function POST(req: NextRequest) {
  // Gated on manage_meetings, the same permission as the meetings page, the
  // format route beside it, and the actions that store what this returns.
  //
  // It was on isTier1 — the ADMIN role or developer_mode — and a comment in
  // the sibling route defended that as a deliberately elevated capability.
  // In practice it was neither elevated nor deliberate in effect: four of the
  // six people holding manage_meetings, including the executive director who
  // had written the minutes himself, were refused on their own meetings. A
  // capability nobody but two accounts can reach is not a tier, it is a bug
  // with a rationale attached.
  //
  // Extraction only reads notes the caller can already open and proposes
  // tasks they can already write by hand, so it grants nothing the page did
  // not grant already.
  try {
    await requirePermission("manage_meetings");
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    let body: any;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const { formattedContent } = body;
    if (!formattedContent?.trim()) {
      return NextResponse.json({ tasks: [], summary: "", ok: true });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Arabic is token-dense: a محضر with a long task table needs far more room
    // than the old 1024-token cap, which truncated the JSON mid-array and made
    // the whole extraction come back empty.
    const params = {
      model: "claude-haiku-4-5-20251001" as const,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user" as const,
        content: `حلل هذا المحضر واستخرج الملخص وجميع المهام:\n\n${formattedContent}`,
      }],
    };

    let message;
    try {
      message = await client.messages.create({
        ...params,
        output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      });
    } catch (err) {
      if (!(err instanceof Anthropic.BadRequestError)) throw err;
      // Structured outputs unavailable for this model/account — fall back to
      // asking for raw JSON and leaning on the tolerant parser above.
      message = await client.messages.create({
        ...params,
        system: `${SYSTEM_PROMPT}\n- أعد JSON فقط بالشكل: {"summary": "...", "tasks": [{"title": "...", "assigneeName": "... أو null"}]}`,
      });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text.trim() : "";
    const result = parseResult(raw);

    const truncated = message.stop_reason === "max_tokens";

    if (!result) {
      console.error("Extract tasks: unparseable response", { stop_reason: message.stop_reason, raw: raw.slice(0, 500) });
      return NextResponse.json(
        { error: truncated ? "المحضر طويل جداً وتم قطع التحليل" : "تعذّر تحليل المحضر", tasks: [], summary: "", ok: false },
        { status: 502 }
      );
    }

    const tasks = (result.tasks || [])
      .filter((t): t is ExtractedTask => !!t && typeof t.title === "string" && t.title.trim().length > 0)
      .map((t) => ({
        title: t.title.trim(),
        assigneeName: typeof t.assigneeName === "string" && t.assigneeName.trim() ? t.assigneeName.trim() : null,
      }));

    return NextResponse.json({
      tasks,
      summary: result.summary || "",
      ok: true,
      // Signals the client that some tasks may be missing, so it does not mark
      // the meeting as fully analysed.
      truncated,
    });
  } catch (err: any) {
    console.error("Extract tasks error:", err);
    return NextResponse.json({ error: err?.message || "حدث خطأ", tasks: [], summary: "", ok: false }, { status: 500 });
  }
}
