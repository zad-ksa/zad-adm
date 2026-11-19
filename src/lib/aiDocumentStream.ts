// كتابةُ وثيقةٍ طويلةٍ بالذكاء الاصطناعي تحت مهلة الخادم — مشتركٌ بين التوليد
// والتعديل وإعادة البناء.
//
// **الجودةُ أولاً**: الوثيقةُ تُكتب في طلبٍ واحدٍ بلا سقفٍ صغير، ولا تُقسَّم إلا
// إن قاربت مهلةَ الخادم فعلاً (`SEGMENT_SECONDS`). فأغلبُ الوثائق تُكتب دفعةً
// واحدةً كما لو لم يكن تقسيمٌ أصلاً. وإن لزم الإكمال: يقطع المتصفّحُ ما كُتب عند
// آخر فقرةٍ كاملة، ويرى النموذجُ التعليماتِ كاملةً وكلَّ ما كتبه، ثم يُطلب منه
// الإكمالُ بالأسلوب والتنسيق نفسيهما.
//
// تُبثّ الكتابةُ سطراً سطراً (NDJSON)، كلُّ سطرٍ كائن:
//   { t: "delta", text }        قطعةٌ جديدة من النصّ
//   { t: "done", more, base }   انتهت الدفعة؛ `more` = بقي ما يُكتب، و`base` المحادثةُ
//                               التي كُتبت لها (ليُبنى منها سجلُّ التعديل لاحقاً)
//   { t: "error", error }       تعذّر الإكمال بعد البدء

import Anthropic from "@anthropic-ai/sdk";
import { AI_WRITING, CONTINUE_PROMPT } from "./aiModel";

export type DocMessage = { role: "user" | "assistant"; content: string };

/** تُوقَف الدفعةُ عندها، فيبقى هامشٌ واسعٌ دون مهلة الخادم (٣٠٠ ثانية). */
const SEGMENT_SECONDS = 230;
/** سقفٌ واسعٌ لا تبلغه وثيقة — الذي يحدّ الدفعةَ هو الوقت لا عددُ الكلمات. */
const MAX_TOKENS = 64000;

export function streamDocument(base: DocMessage[], partial: string): Response {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();
  const messages: DocMessage[] = partial
    ? [...base, { role: "assistant", content: partial }, { role: "user", content: CONTINUE_PROMPT }]
    : base;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const stream = client.messages.stream({ ...AI_WRITING, max_tokens: MAX_TOKENS, messages });
        timer = setTimeout(() => {
          timedOut = true;
          stream.abort();
        }, SEGMENT_SECONDS * 1000);
        stream.on("text", (text) => send({ t: "delta", text }));
        try {
          const message = await stream.finalMessage();
          send({ t: "done", more: message.stop_reason === "max_tokens", base });
        } catch (err) {
          if (!timedOut) throw err;
          send({ t: "done", more: true, base });
        }
      } catch (err: any) {
        console.error("AI document stream error:", err);
        send({ t: "error", error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" });
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
