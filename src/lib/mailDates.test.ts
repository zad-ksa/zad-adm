import { strict as assert } from "node:assert";
import { test } from "node:test";
import { byMailSentAt, mailSentAt } from "./mailDates.ts";

test("المعتمَدةُ تُؤرَّخ بلحظة اعتمادها لا بلحظة كتابتها", () => {
  const written = new Date("2026-11-20T10:00:00Z");
  const approved = new Date("2026-11-23T08:00:00Z");
  assert.equal(mailSentAt({ createdAt: written, approvedAt: approved }), approved);
});

test("وما لا اعتمادَ له يُؤرَّخ بكتابته", () => {
  const written = new Date("2026-11-20T10:00:00Z");
  assert.equal(mailSentAt({ createdAt: written, approvedAt: null }), written);
  assert.equal(mailSentAt({ createdAt: written }), written);
});

test("والقيمةُ تمرّ كما جاءت، نصّاً كانت أو رقماً", () => {
  assert.equal(mailSentAt({ createdAt: "2026-11-20T10:00:00Z" }), "2026-11-20T10:00:00Z");
  assert.equal(mailSentAt({ createdAt: 0, approvedAt: 1700 }), 1700);
});

test("ترتيبُ المحادثة بالإرسال: ردٌّ كُتب أوّلاً واعتُمد آخراً يأتي آخراً", () => {
  const first = { createdAt: "2026-11-01T10:00:00Z", approvedAt: "2026-11-01T10:00:00Z" };
  // كُتب قبل الأوّل، واعتُمد بعده بأيام — فمكانُه بعده.
  const second = { createdAt: "2026-10-28T10:00:00Z", approvedAt: "2026-11-05T10:00:00Z" };
  assert.deepEqual([second, first].sort(byMailSentAt), [first, second]);
});
