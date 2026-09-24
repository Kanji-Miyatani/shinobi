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
 * 47県を必要時間の長い順に並べる（同時間なら都道府県コード順）。
 * 時給が同じ県は同じ順位にする（1, 2, 2, 4 …）。
 */
export function rank(prefs, amount, wageOf) {
  const sorted = prefs
    .map((p) => ({ pref: p, wage: wageOf(p), hours: hoursFor(amount, wageOf(p)) }))
    .filter((r) => r.hours != null)
    .sort((a, b) => a.wage - b.wage || a.pref.code - b.pref.code);
  return sorted.map((r, i) => ({
    ...r,
    rank: sorted.findIndex((s) => s.wage === r.wage) + 1,
  }));
}

export const yen = (n) => n.toLocaleString("ja-JP");
