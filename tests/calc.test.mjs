// 計算結果を、公表値から手計算した値と照合する（要件定義書 8章「品質」）
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hoursFor, roundHours, workdays, toHoursMinutes, wageOn, rank } from "../assets/calc.js";
import { TILES, COLS, ROWS } from "../assets/tiles.js";

const data = JSON.parse(readFileSync(new URL("../data/data.json", import.meta.url), "utf8"));
const prefs = data.minimumWage.prefs;
const byName = (n) => prefs.find((p) => p.name === n);

test("要件定義書の計算例と一致する", () => {
  const price = 364800;
  assert.equal(roundHours(hoursFor(price, byName("東京都").new)), 285.0);
  assert.equal(roundHours(hoursFor(price, byName("宮崎県").new)), 336.2);
});

test("時間・日数・時分の丸め", () => {
  assert.equal(workdays(285), 35.6);
  assert.deepEqual(toHoursMinutes(285), { h: 285, m: 0 });
  assert.deepEqual(toHoursMinutes(1.9999), { h: 2, m: 0 });
  assert.deepEqual(toHoursMinutes(297.55), { h: 297, m: 33 });
  assert.equal(hoursFor(0, 1000), null);
  assert.equal(hoursFor(1000, 0), null);
});

test("発効日の前後で旧額・新額が切り替わる", () => {
  const tokyo = byName("東京都");
  assert.deepEqual(wageOn(tokyo, "2026-09-30"), { wage: 1226, phase: "old" });
  assert.deepEqual(wageOn(tokyo, "2026-10-01"), { wage: 1280, phase: "new" });
});

test("最低賃金データが47都道府県そろい、公表の傾向と矛盾しない", () => {
  assert.equal(prefs.length, 47);
  assert.deepEqual(prefs.map((p) => p.code), Array.from({ length: 47 }, (_, i) => i + 1));
  for (const p of prefs) {
    const up = p.new - p.old;
    assert.ok(up >= 54 && up <= 65, `${p.name} の引上げ額 ${up} 円が54〜65円の範囲外`);
    assert.match(p.effective, /^2026-(10|11|12)-\d{2}$/);
  }
  assert.equal(Math.max(...prefs.map((p) => p.new)), 1280);
  assert.equal(Math.min(...prefs.map((p) => p.new)), 1085);
  assert.equal(prefs.filter((p) => p.effective === "2026-10-01").length, 15);
  assert.equal(prefs.reduce((a, p) => (p.effective > a ? p.effective : a), ""), "2026-12-02");
});

test("ランキングは時間が長い順で、表示上同じ時間なら同順位", () => {
  const r = rank(prefs, () => 364800, (p) => p.new);
  assert.equal(r.length, 47);
  assert.equal(r[0].pref.name, "宮崎県");
  assert.equal(r[46].pref.name, "東京都");
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].hours >= r[i].hours);
  const same = r.filter((x) => roundHours(x.hours) === roundHours(364800 / 1090));
  assert.ok(same.length > 1);
  assert.ok(same.every((x) => x.rank === same[0].rank));
});

test("県ごとに価格が違う品目は、県ごとの価格 ÷ 県ごとの時給で並ぶ", () => {
  const two = prefs.filter((p) => p.code === 13 || p.code === 45);
  const price = { 13: 128000, 45: 54250 };
  const r = rank(two, (p) => price[p.code], (p) => p.new);
  assert.equal(r[0].pref.name, "東京都");
  assert.equal(roundHours(r[0].hours), 100.0);
  assert.equal(roundHours(r[1].hours), 50.0);
});

test("タイル地図は47県を重ならずに置いている", () => {
  assert.equal(TILES.length, 47);
  assert.equal(new Set(TILES.map((t) => t[0])).size, 47);
  assert.equal(new Set(TILES.map((t) => `${t[1]},${t[2]}`)).size, 47);
  for (const [, c, r] of TILES) assert.ok(c >= 0 && c < COLS && r >= 0 && r < ROWS);
});
