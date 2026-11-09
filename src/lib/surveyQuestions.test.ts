import test from "node:test";
import assert from "node:assert/strict";
import {
  answerText,
  isAnswered,
  matrixCellCount,
  matrixCellKey,
  matrixFilledCount,
  matrixPartialRows,
  optionsAwaitingText,
  otherTextKey,
  parseMatrix,
  questionForApi,
  questionFromApi,
  selectedOptionIds,
  type MatrixSpec,
  type SurveyQuestion,
} from "./surveyQuestions.ts";

const base = { isRequired: true, allowAttachment: false, requireAttachmentIfYes: false };

const matrixQuestion: SurveyQuestion = {
  ...base,
  id: "q-matrix",
  text: "قيّموا كل خدمة",
  type: "MATRIX",
  matrix: {
    rows: [
      { id: "plan", text: "التخطيط" },
      { id: "gov", text: "الحوكمة" },
    ],
    columns: [
      { id: "fit", text: "الملاءمة" },
      { id: "quality", text: "الجودة" },
    ],
    max: 5,
  },
};

test("مفتاحُ الخليّة يجمع السؤالَ والصفَّ والعمود", () => {
  assert.equal(matrixCellKey("q", "row", "col"), "q::@cell::row::col");
});

test("نصُّ «أخرى» لا يُشبه خليّةً ولو كان اسمُ الصفِّ @text", () => {
  // لكلٍّ علامتُه، فلا يمحو نصُّ خيارٍ درجةَ خليّة.
  assert.notEqual(otherTextKey("q", "opt"), matrixCellKey("q", "@text", "opt"));
  assert.equal(otherTextKey("q", "opt"), "q::@text::opt");
});

test("وصفُ المصفوفة يُقرأ، ويُحدُّ السلّمُ بين ٢ و١٠", () => {
  assert.equal(parseMatrix({ max: 99 }).max, 10);
  assert.equal(parseMatrix({ max: 1 }).max, 2);
  assert.equal(parseMatrix({ max: "خمسة" }).max, 5);
  assert.equal(parseMatrix(null).max, 5);
  assert.deepEqual(parseMatrix(undefined).rows, []);
});

test("صفٌّ أو عمودٌ بلا معرِّفٍ يُطرح", () => {
  const spec = parseMatrix({ rows: [{ id: "a", text: "أ" }, { text: "بلا معرِّف" }, null], columns: [] });
  assert.deepEqual(spec.rows, [{ id: "a", text: "أ" }]);
});

test("المصفوفةُ تعود كما ذهبت", () => {
  const wire = questionForApi(matrixQuestion);
  const spec = wire.options as MatrixSpec;
  assert.equal(spec.rows.length, 2);
  assert.equal(spec.max, 5);
  const back = questionFromApi({ ...wire, id: matrixQuestion.id });
  assert.deepEqual(back.matrix, matrixQuestion.matrix);
  assert.equal(back.options, undefined);
});

test("«نعم/لا» تبقى تحمل أسئلتَها التابعةَ وجوابَها الشارط", () => {
  const question: SurveyQuestion = {
    ...base,
    id: "q1",
    text: "هل جاءت كما توقّعتم؟",
    type: "YES_NO",
    followUpOn: "no",
    followUpQuestions: [{ id: "why", text: "لماذا؟", isRequired: true }],
  };
  const wire = questionForApi(question);
  assert.equal((wire.options as { followUpOn: string }).followUpOn, "no");
  const back = questionFromApi({ ...wire, id: "q1" });
  assert.equal(back.followUpOn, "no");
  assert.equal(back.followUpQuestions?.length, 1);
});

test("«نعم/لا» بلا أسئلةٍ تابعةٍ تُفرّغ خانتَها", () => {
  const wire = questionForApi({ ...base, id: "q", text: "", type: "YES_NO", followUpQuestions: [] });
  assert.equal(wire.options, null);
});

test("خيارُ «أخرى» يحفظ علامتَه", () => {
  const question: SurveyQuestion = {
    ...base,
    id: "q2",
    text: "المجال",
    type: "OPTIONS",
    options: [
      { id: "edu", text: "تعليمي" },
      { id: "other", text: "أخرى", allowText: true },
    ],
  };
  const back = questionFromApi({ ...questionForApi(question), id: "q2" });
  assert.equal(back.options?.[1].allowText, true);
  assert.equal(back.options?.[0].allowText, undefined);
});

test("الخياراتُ المختارةُ: واحدٌ أو عدّة", () => {
  const single: SurveyQuestion = { ...base, id: "q", text: "", type: "OPTIONS", options: [] };
  const multi: SurveyQuestion = { ...single, type: "MULTI_OPTIONS" };
  assert.deepEqual(selectedOptionIds(single, "a"), ["a"]);
  assert.deepEqual(selectedOptionIds(multi, "a,b"), ["a", "b"]);
  assert.deepEqual(selectedOptionIds(multi, ""), []);
  assert.deepEqual(selectedOptionIds(multi, undefined), []);
});

test("عددُ الخلايا والمُقيَّمُ منها", () => {
  assert.equal(matrixCellCount(matrixQuestion), 4);
  const answers = { "q-matrix::@cell::plan::fit": "5", "q-matrix::@cell::plan::quality": "4" };
  assert.equal(matrixFilledCount(matrixQuestion, answers), 2);
});

test("صفٌّ قُيّم بعضُه يُكشف، والفارغُ والكاملُ لا", () => {
  assert.deepEqual(matrixPartialRows(matrixQuestion, {}), []);
  const half = { "q-matrix::@cell::plan::fit": "5" };
  assert.deepEqual(
    matrixPartialRows(matrixQuestion, half).map((row) => row.id),
    ["plan"]
  );
  const whole = { "q-matrix::@cell::plan::fit": "5", "q-matrix::@cell::plan::quality": "3" };
  assert.deepEqual(matrixPartialRows(matrixQuestion, whole), []);
});

test("مصفوفةٌ تُعدُّ مُجابةً بخليّةٍ واحدة — فالخدمةُ التي لم تُستفد تُترك", () => {
  assert.equal(isAnswered(matrixQuestion, {}), false);
  assert.equal(isAnswered(matrixQuestion, { "q-matrix::@cell::gov::fit": "2" }), true);
});

test("«أخرى» المختارةُ بلا نصٍّ ليست إجابة", () => {
  const question: SurveyQuestion = {
    ...base,
    id: "q3",
    text: "المجال",
    type: "OPTIONS",
    options: [
      { id: "edu", text: "تعليمي" },
      { id: "other", text: "أخرى", allowText: true },
    ],
  };
  assert.equal(isAnswered(question, { q3: "other" }), false);
  assert.equal(optionsAwaitingText(question, { q3: "other" }).length, 1);
  assert.equal(isAnswered(question, { q3: "other", [otherTextKey("q3", "other")]: "  " }), false);
  assert.equal(isAnswered(question, { q3: "other", [otherTextKey("q3", "other")]: "قيمي" }), true);
  assert.equal(isAnswered(question, { q3: "edu" }), true);
  assert.equal(optionsAwaitingText(question, { q3: "edu" }).length, 0);
});

test("نصُّ الإجابة يُلحق ما كُتب في «أخرى»", () => {
  const question: SurveyQuestion = {
    ...base,
    id: "q4",
    text: "المجال",
    type: "MULTI_OPTIONS",
    options: [
      { id: "edu", text: "تعليمي" },
      { id: "other", text: "أخرى", allowText: true },
    ],
  };
  const answers = { q4: "edu,other", [otherTextKey("q4", "other")]: "سقيا" };
  assert.equal(answerText(question, answers.q4, answers), "تعليمي، أخرى: سقيا");
  assert.equal(answerText(question, "edu,other", { q4: "edu,other" }), "تعليمي، أخرى");
});

test("نصُّ الإجابة في «نعم/لا» وفي الفراغ", () => {
  const yesNo: SurveyQuestion = { ...base, id: "q5", text: "", type: "YES_NO" };
  assert.equal(answerText(yesNo, "yes"), "نعم");
  assert.equal(answerText(yesNo, "no"), "لا");
  assert.equal(answerText(yesNo, ""), "");
  assert.equal(answerText(yesNo, undefined), "");
});

test("خيارٌ مَحذوفٌ من القائمة يُعرض معرِّفُه لا فراغاً", () => {
  // إجابةٌ قديمةٌ لخيارٍ أُزيل: تُقرأ كما هي بدلاً من أن تختفي.
  const question: SurveyQuestion = { ...base, id: "q6", text: "", type: "OPTIONS", options: [] };
  assert.equal(answerText(question, "gone"), "gone");
});
