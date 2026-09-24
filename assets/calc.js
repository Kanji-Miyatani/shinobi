// 計算ロジック（要件定義書 6章）
// すべての収入を時給にそろえ、金額 ÷ 時給 = 必要な労働時間 とする。

export const WORKDAY_HOURS = 8;

/** 金額 ÷ 時給 = 必要な労働時間（時間） */
export function hoursFor(amount, hourlyWage) {
  if (!(amount > 0) || !(hourlyWage > 0)) return null;
  return amount / hourlyWage;
}

/** 表示用の丸め：時間は小数1桁 */
export function roundHours(hours) {
  return Math.round(hours * 10) / 10;
}

/** 8時間勤務で何日分か（小数1桁） */
export function workdays(hours) {
  return Math.round((hours / WORKDAY_HOURS) * 10) / 10;
}

/** 「○時間○分」表記のための分解。分は四捨五入し、60分に達したら繰り上げる */
export function toHoursMinutes(hours) {
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return { h, m };
}

/**
 * 基準日時点で有効な最低賃金を返す。
 * 発効日前なら旧額、発効日以降なら新額。
 */
export function wageOn(pref, isoDate) {
  if (!pref.effective || pref.new == null) return { wage: pref.old, phase: "old" };
  return isoDate >= pref.effective
    ? { wage: pref.new, phase: "new" }
    : { wage: pref.old, phase: "old" };
}

/**
 * 47県を必要時間の長い順に並べる。
 * 支出額も時給も県ごとに違うので、県ごとに priceOf(県) ÷ wageOf(県) を計算する。
 * 表示上（小数1桁）で同じ時間になる県は同じ順位にする（1, 2, 2, 4 …）。
 */
export function rank(prefs, priceOf, wageOf) {
  const sorted = prefs
    .map((p) => ({ pref: p, price: priceOf(p), wage: wageOf(p), hours: hoursFor(priceOf(p), wageOf(p)) }))
    .filter((r) => r.hours != null)
    .sort((a, b) => b.hours - a.hours || a.pref.code - b.pref.code);
  return sorted.map((r) => ({
    ...r,
    rank: sorted.findIndex((s) => roundHours(s.hours) === roundHours(r.hours)) + 1,
  }));
}

export const yen = (n) => n.toLocaleString("ja-JP");
