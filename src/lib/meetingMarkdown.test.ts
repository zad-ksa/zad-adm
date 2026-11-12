import test from "node:test";
import assert from "node:assert/strict";
import { mdToHtml, replaceTasksTable } from "./meetingMarkdown.ts";

const MINUTES = `**التاريخ:** 2026-11-12

---

### أولاً: افتتاح الاجتماع
افتُتح الاجتماع بكلمةٍ للمدير.

### ثانياً: المحاور التي تمت مناقشتها
- الميزانية
- الشراكات

| البند | المبلغ |
|-------|--------|
| تدريب | 10000 |

### رابعاً: المهام والإجراءات المطلوبة
| المهمة | المسؤول | الموعد |
|--------|---------|--------|
| متابعة الميزانية | أحمد | الخميس |

### خامساً: ختام الاجتماع
شُكر الحضور.`;

const TASKS_TABLE = "<table><tr><th>المهمة</th><th>المكلف</th></tr><tr><td>متابعة</td><td>أحمد</td></tr></table>";
const HEADING = '<h3 class="sub-title">المهام والتكليفات</h3>';

test("تُطبع جداولُ المحضر كلُّها — لا تُحذف", () => {
  const html = mdToHtml(MINUTES);
  assert.equal((html.match(/<table>/g) || []).length, 2);
  assert.ok(html.includes("<td>تدريب</td>"));
  assert.ok(html.includes("<td>متابعة الميزانية</td>"));
});

test("يبقى عنوانُ «رابعاً» في موضعه بالترتيب", () => {
  const html = mdToHtml(MINUTES);
  const fourth = html.indexOf("رابعاً");
  const fifth = html.indexOf("خامساً");
  assert.ok(fourth !== -1 && fourth < fifth);
});

test("جدولُ المهام المحفوظةِ يحلّ محلَّ جدول المحضر في موضعه", () => {
  const out = replaceTasksTable(mdToHtml(MINUTES), TASKS_TABLE, HEADING);
  assert.ok(out.includes("<th>المكلف</th>"));
  assert.ok(!out.includes("<td>متابعة الميزانية</td>")); // جدولُ النصِّ حلَّ محلَّه
  assert.ok(!out.includes(HEADING)); // لا عنوانَ مكرَّرٌ: عنوانُ «رابعاً» قائم
  const fourth = out.indexOf("رابعاً");
  const table = out.indexOf("<th>المكلف</th>");
  const fifth = out.indexOf("خامساً");
  assert.ok(fourth < table && table < fifth);
});

test("جدولُ البنود لا يُمَسّ عند استبدال جدول المهام", () => {
  const out = replaceTasksTable(mdToHtml(MINUTES), TASKS_TABLE, HEADING);
  assert.ok(out.includes("<td>تدريب</td>"));
  assert.ok(out.includes("<td>10000</td>"));
});

test("بلا جدولِ مهامٍّ في المحضر: يُذيَّل به تحت عنوانه", () => {
  const html = mdToHtml("### أولاً: افتتاح الاجتماع\nكلمةٌ قصيرة.");
  const out = replaceTasksTable(html, TASKS_TABLE, HEADING);
  assert.ok(out.includes(HEADING));
  assert.ok(out.trimEnd().endsWith("</table>"));
});

test("يُطبع عنوانُ المستوى الأول — إلا ترويسةَ «محضر اجتماع»", () => {
  assert.ok(mdToHtml("# ثانياً: المحاور").includes('<h2 class="sec-title">ثانياً: المحاور</h2>'));
  assert.equal(mdToHtml("# محضر اجتماع الفريق الأسبوعي").trim(), "");
});

test("سطرُ التذييل يُسقط، وجملةُ الموظّف التي فيها العبارةُ تبقى", () => {
  assert.equal(mdToHtml("*صدر هذا المحضر عن شركة زاد للخدمات التنموية*").trim(), "");
  assert.ok(mdToHtml("اتُّفق أن يكون محضر إلكتروني لكل اجتماع").includes("اتُّفق أن يكون"));
});

test("العنوانُ والقائمةُ والفاصلُ والعريضُ كما كانت", () => {
  const html = mdToHtml(MINUTES);
  assert.ok(html.includes('<h3 class="sub-title">أولاً: افتتاح الاجتماع</h3>'));
  assert.ok(html.includes("<ul>\n<li>الميزانية</li>"));
  assert.ok(html.includes("<hr>"));
  assert.ok(html.includes("<strong>التاريخ:</strong>"));
});

test("صفُّ الفاصل في الجدول لا يُطبع صفّاً", () => {
  const html = mdToHtml("| أ | ب |\n|---|---|\n| ١ | ٢ |");
  assert.ok(!html.includes("---"));
  assert.equal((html.match(/<tr>/g) || []).length, 2);
});

test("جدولٌ لم يُغلق لا يُسقط ما بعده", () => {
  const out = replaceTasksTable("<p>قبل</p><table><tr><th>المهمة</th></tr>", TASKS_TABLE, HEADING);
  assert.ok(out.includes("قبل"));
  assert.ok(out.includes(HEADING));
});
