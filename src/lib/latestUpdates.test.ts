import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarDaysBetween,
  parseCivilDateInput,
  sinceLabel,
  stalenessOf,
  workingDaysBetween,
} from "./latestUpdates.ts";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

test("working days skip Friday and Saturday, and the event day itself", () => {
  // الخميس 5 نوفمبر 2026 → الأحد 8: الجمعة والسبت لا يُعدّان.
  assert.equal(workingDaysBetween(d("2026-11-05"), d("2026-11-08")), 1);
  // الأحد → الخميس من الأسبوع نفسه: أربعة.
  assert.equal(workingDaysBetween(d("2026-11-01"), d("2026-11-05")), 4);
  assert.equal(workingDaysBetween(d("2026-11-05"), d("2026-11-05")), 0);
});

test("holidays are not working days", () => {
  const holidays = [{ startDate: d("2026-11-02"), endDate: d("2026-11-03") }];
  assert.equal(workingDaysBetween(d("2026-11-01"), d("2026-11-05"), holidays), 2);
});

test("staleness thresholds: 2 green, 4 yellow, 6 red", () => {
  assert.equal(stalenessOf(0), "fresh");
  assert.equal(stalenessOf(1), "fresh");
  assert.equal(stalenessOf(2), "green");
  assert.equal(stalenessOf(3), "green");
  assert.equal(stalenessOf(4), "yellow");
  assert.equal(stalenessOf(5), "yellow");
  assert.equal(stalenessOf(6), "red");
  assert.equal(stalenessOf(30), "red");
});

test("since label follows Arabic number agreement", () => {
  assert.equal(sinceLabel(0), "اليوم");
  assert.equal(sinceLabel(1), "منذ يوم");
  assert.equal(sinceLabel(2), "منذ يومين");
  assert.equal(sinceLabel(7), "منذ 7 أيام");
  assert.equal(sinceLabel(15), "منذ 15 يوماً");
  assert.equal(calendarDaysBetween(d("2026-10-30"), d("2026-11-03")), 4);
});

test("date input parsing rejects impossible dates", () => {
  assert.deepEqual(parseCivilDateInput("2026-11-03"), d("2026-11-03"));
  assert.equal(parseCivilDateInput("2026-02-31"), null);
  assert.equal(parseCivilDateInput("03/11/2026"), null);
  assert.equal(parseCivilDateInput(""), null);
});
