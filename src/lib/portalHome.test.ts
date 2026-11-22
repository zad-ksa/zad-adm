import test from "node:test";
import assert from "node:assert/strict";
import {
  AGENDA_LABEL,
  isToday,
  startOfDay,
  upcoming,
  visibleTasks,
  whenLabel,
  type AgendaItem,
  type HomeTask,
} from "./portalHome.ts";

const task = (over: Partial<HomeTask> & { id: string; count: number; tone: HomeTask["tone"] }): HomeTask => ({
  label: over.id,
  href: "/x",
  ...over,
});

// ── ما ينتظر ───────────────────────────────────────────────────────────────

test("الصفرُ لا يُعرض", () => {
  const rows = visibleTasks([
    task({ id: "a", count: 0, tone: "danger" }),
    task({ id: "b", count: 2, tone: "warn" }),
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["b"]);
});

test("ما يَفوت أوّلاً، ثمّ ما ينتظر، ثمّ الخبرُ الهادئ", () => {
  const rows = visibleTasks([
    task({ id: "calm", count: 9, tone: "brand" }),
    task({ id: "waiting", count: 1, tone: "warn" }),
    task({ id: "late", count: 1, tone: "danger" }),
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["late", "waiting", "calm"]);
});

test("وفي النبرة الواحدة الأكثرُ عدداً أوّلاً", () => {
  const rows = visibleTasks([
    task({ id: "few", count: 1, tone: "warn" }),
    task({ id: "many", count: 7, tone: "warn" }),
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["many", "few"]);
});

test("ولا شيءَ ينتظر: قائمةٌ فارغة", () => {
  assert.deepEqual(visibleTasks([]), []);
  assert.deepEqual(visibleTasks([task({ id: "a", count: 0, tone: "warn" })]), []);
});

// ── الأجندة ────────────────────────────────────────────────────────────────

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const now = at(2026, 11, 22, 10);

const items: AgendaItem[] = [
  { id: "old", kind: "DESIGN", title: "فات", atMs: at(2026, 11, 20) },
  { id: "today-late", kind: "DESIGN", title: "اليوم صباحا", atMs: at(2026, 11, 22, 2) },
  { id: "soon", kind: "DONOR", title: "بعد يومين", atMs: at(2026, 11, 24) },
  { id: "edge", kind: "MEDIA", title: "اليوم السابع", atMs: at(2026, 11, 29, 23) },
  { id: "far", kind: "HOLIDAY", title: "بعيد", atMs: at(2026, 12, 10) },
];

test("ما يقع في الأيام السبعة وحدَه، مرتَّباً بالأقرب", () => {
  assert.deepEqual(
    upcoming(items, now).map((i) => i.id),
    ["today-late", "soon", "edge"]
  );
});

test("وموعدُ اليوم يبقى وإن مضت ساعتُه", () => {
  const rows = upcoming(items, now);
  assert.equal(rows[0].id, "today-late");
});

test("وما فات يسقط — محلُّه «بانتظارك» لا الأجندة", () => {
  assert.equal(upcoming(items, now).some((i) => i.id === "old"), false);
});

test("والنافذةُ تتّسع بالطلب", () => {
  assert.equal(upcoming(items, now, 30).length, 4);
});

test("وترتيبٌ ثابتٌ لموعدين في يومٍ واحد", () => {
  const same: AgendaItem[] = [
    { id: "b", kind: "MEDIA", title: "ياء", atMs: at(2026, 11, 23) },
    { id: "a", kind: "MEDIA", title: "ألف", atMs: at(2026, 11, 23) },
  ];
  assert.deepEqual(upcoming(same, now).map((i) => i.id), ["a", "b"]);
});

// ── القُرب بكلمة ───────────────────────────────────────────────────────────

test("القُربُ يُقال كما يُقال في العربية", () => {
  assert.equal(whenLabel(at(2026, 11, 22, 23), now), "اليوم");
  assert.equal(whenLabel(at(2026, 11, 23), now), "غدا");
  assert.equal(whenLabel(at(2026, 11, 24), now), "بعد يومين");
  assert.equal(whenLabel(at(2026, 11, 27), now), "بعد 5 أيام");
  assert.equal(whenLabel(at(2026, 12, 10), now), "بعد 18 يوما");
});

test("وما مضى يُقال «اليوم» لا بالسالب", () => {
  assert.equal(whenLabel(at(2026, 11, 20), now), "اليوم");
});

test("«اليوم» تُعرف بيومها لا بساعتها", () => {
  assert.equal(isToday(at(2026, 11, 22, 1), now), true);
  assert.equal(isToday(at(2026, 11, 23, 1), now), false);
});

test("بدايةُ اليومِ تُسقط الساعة", () => {
  assert.equal(startOfDay(at(2026, 11, 22, 23)), startOfDay(at(2026, 11, 22, 1)));
});

test("لكلِّ نوعٍ في الأجندة تسميةٌ عربية", () => {
  for (const kind of ["DESIGN", "DONOR", "MEDIA", "HOLIDAY"] as const) {
    assert.ok(AGENDA_LABEL[kind].length > 0);
  }
});
