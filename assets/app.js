import { hoursFor, roundHours, workdays, toHoursMinutes, wageOn, rank, yen } from "./calc.js";
import { TILES } from "./tiles.js";
import { drawShareCard } from "./share.js";

const $ = (id) => document.getElementById(id);
const CUSTOM = "custom";
const MAX_AMOUNT = 100_000_000;

const todayIso = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

const md = (iso) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}月${d}日`;
};
const ymd = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}年${m}月${d}日`;
};
const fmtH = (h) => roundHours(h).toFixed(1);
const hm = (h) => {
  const { h: hh, m } = toHoursMinutes(h);
  return `${hh.toLocaleString("ja-JP")}時間${String(m).padStart(2, "0")}分`;
};

let DATA;
const state = {
  pref: 13,
  item: null, // 初期値はデータの site.defaultItem
  amount: 10000,
  when: "new",
  vs: 45,
  mapMode: "3d",
};
let map3d = null;

/* ───────── データ参照 ───────── */
const mw = () => DATA.minimumWage;
const prefByCode = (code) => mw().prefs.find((p) => p.code === code);

function wageOf(p) {
  return state.when === "new" ? p.new : wageOn(p, todayIso).wage;
}
function wageLabel(p) {
  if (state.when === "new") return `${mw().fiscalYear} ${mw().status}`;
  return wageOn(p, todayIso).phase === "new" ? `${mw().fiscalYear} ${mw().status}` : mw().oldLabel;
}
function nationalAverage() {
  const lastEffective = mw().prefs.reduce((a, p) => (p.effective > a ? p.effective : a), "");
  const useNew = state.when === "new" || todayIso >= lastEffective;
  return useNew
    ? { wage: mw().weightedAverage.new, label: `${mw().fiscalYear}` }
    : { wage: mw().weightedAverage.old, label: mw().oldLabel };
}
/**
 * 選んでいる支出。統計の品目は県ごとに価格が違うので priceOf(県) で引く。
 * 任意の金額はどの県でも同じ額。
 */
function currentItem() {
  if (state.item === CUSTOM) {
    return { id: CUSTOM, name: "入力した金額", custom: true, priceOf: () => state.amount, national: state.amount };
  }
  const it = DATA.items.find((i) => i.id === state.item) ?? DATA.items[0];
  return { ...it, priceOf: (p) => it.prices[p.code] };
}
const itemLabel = (item, pref) =>
  item.custom ? `${yen(item.priceOf(pref))}円` : `${item.name}（${yen(item.priceOf(pref))}円）`;

/* ───────── 初期化 ───────── */
async function init() {
  try {
    const res = await fetch("data/data.json");
    if (!res.ok) throw new Error(String(res.status));
    DATA = await res.json();
  } catch {
    $("tc-time").textContent = "--:--";
    $("tc-days").textContent =
      "統計データを読み込めませんでした。通信状態を確認して、ページを再読み込みしてください。";
    return;
  }
  state.item = DATA.site.defaultItem;
  readUrl();
  buildSelects();
  buildMap();
  bind();
  renderSources();
  $("today-label").textContent = `${md(todayIso)}時点`;
  $("data-stamp").textContent = `データの取得日：${ymd(mw().retrieved)}`;
  render({ punch: false });
  loadMap3D();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ───────── 立体地図（Three.js）：表示後に読み込み、使えなければマス目のまま ───────── */
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

async function loadMap3D() {
  if (!webglAvailable()) return;
  try {
    const { createMap3D } = await import("./map3d.js");
    map3d = await createMap3D($("map3d"), {
      geojsonUrl: "data/prefectures.geojson",
      onSelect: (code) => setPref(code),
    });
  } catch {
    map3d = null;
    return;
  }
  $("map-mode").hidden = false;
  applyMapMode();
  render({ punch: false });
}

function applyMapMode() {
  const three = state.mapMode === "3d" && map3d;
  $("map3d").hidden = !three;
  $("map-hint").hidden = !three;
  $("tilemap").hidden = !!three;
  for (const btn of document.querySelectorAll(".map-mode-btn")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === state.mapMode));
  }
  if (three) map3d.resize();
}

function readUrl() {
  const q = new URLSearchParams(location.search);
  const pref = Number(q.get("pref"));
  if (pref >= 1 && pref <= 47) state.pref = pref;
  const vs = Number(q.get("vs"));
  if (vs >= 1 && vs <= 47) state.vs = vs;
  const item = q.get("item");
  if (item === CUSTOM || DATA.items.some((i) => i.id === item)) state.item = item;
  const amount = Number(q.get("yen"));
  if (Number.isInteger(amount) && amount >= 1 && amount <= MAX_AMOUNT) state.amount = amount;
  if (q.get("when") === "today") state.when = "today";
  if (q.get("map") === "tile") state.mapMode = "tile";
  if (state.vs === state.pref) state.vs = state.pref === 13 ? 45 : 13;
}

function writeUrl() {
  const q = new URLSearchParams();
  q.set("pref", state.pref);
  q.set("item", state.item);
  if (state.item === CUSTOM) q.set("yen", state.amount);
  if (state.when !== "new") q.set("when", state.when);
  q.set("vs", state.vs);
  if (state.mapMode === "tile") q.set("map", "tile");
  history.replaceState(null, "", `${location.pathname}?${q}`);
}

function buildSelects() {
  const prefOptions = mw()
    .prefs.map((p) => `<option value="${p.code}">${p.name}</option>`)
    .join("");
  for (const id of ["pref", "cmp-a", "cmp-b"]) $(id).innerHTML = prefOptions;

  const items = DATA.items.map((i) => `<option value="${i.id}">${i.name}</option>`).join("");
  $("item").innerHTML =
    (items ? `<optgroup label="県ごとの価格（公的統計）">${items}</optgroup>` : "") +
    `<option value="${CUSTOM}">金額を自分で入力する</option>`;
  $("amount").value = yen(state.amount);
}

function buildMap() {
  const map = $("tilemap");
  map.innerHTML = "";
  for (const [code, col, row, label] of TILES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tile";
    b.dataset.code = code;
    b.style.gridColumn = String(col + 1);
    b.style.gridRow = String(row + 1);
    b.style.transitionDelay = `${col * 28}ms, ${col * 28}ms, 0ms, 0ms`;
    b.innerHTML = `<span class="t-name">${label.length > 2 ? label.slice(0, 2) : label}</span><span class="t-h"></span>`;
    map.append(b);
  }
}

function bind() {
  $("pref").addEventListener("change", (e) => setPref(Number(e.target.value)));
  $("cmp-a").addEventListener("change", (e) => setPref(Number(e.target.value)));
  $("cmp-b").addEventListener("change", (e) => {
    state.vs = Number(e.target.value);
    render({ punch: false });
  });
  $("item").addEventListener("change", (e) => {
    state.item = e.target.value;
    render();
    if (state.item === CUSTOM) $("amount").focus();
  });
  $("amount").addEventListener("input", onAmount);
  $("amount").addEventListener("blur", () => {
    if (!$("amount-error").hidden) return;
    $("amount").value = yen(state.amount);
  });
  $("picker").addEventListener("submit", (e) => e.preventDefault());
  for (const btn of document.querySelectorAll(".when-btn")) {
    btn.addEventListener("click", () => {
      state.when = btn.dataset.when;
      render();
    });
  }
  $("tilemap").addEventListener("click", (e) => {
    const tile = e.target.closest(".tile");
    if (!tile) return;
    setPref(Number(tile.dataset.code));
    if (matchMedia("(max-width: 959px)").matches) {
      $("timecard").scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  for (const btn of document.querySelectorAll(".map-mode-btn")) {
    btn.addEventListener("click", () => {
      state.mapMode = btn.dataset.mode;
      applyMapMode();
      writeUrl();
    });
  }
  bindShare();
}

function setPref(code) {
  state.pref = code;
  if (state.vs === code) state.vs = code === 13 ? 45 : 13;
  render();
}

function parseAmount(raw) {
  const half = raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，、\s円]/g, "");
  if (!/^\d+$/.test(half)) return null;
  return Number(half);
}

function onAmount(e) {
  const n = parseAmount(e.target.value);
  const err = $("amount-error");
  if (n == null || n < 1 || n > MAX_AMOUNT) {
    err.textContent = "金額は1円から1億円までの数字で入力してください（例：12800）。";
    err.hidden = false;
    e.target.setAttribute("aria-invalid", "true");
    return;
  }
  err.hidden = true;
  e.target.removeAttribute("aria-invalid");
  state.amount = n;
  render({ punch: false });
}

/* ───────── 描画 ───────── */
function render({ punch = true } = {}) {
  const pref = prefByCode(state.pref);
  const item = currentItem();
  const wage = wageOf(pref);
  const hours = hoursFor(item.priceOf(pref), wage);

  $("pref").value = String(state.pref);
  $("cmp-a").value = String(state.pref);
  $("cmp-b").value = String(state.vs);
  $("item").value = state.item;
  $("amount-wrap").hidden = state.item !== CUSTOM;
  $("item-glue").textContent = state.item === CUSTOM ? "、" : "を払うと…";
  for (const btn of document.querySelectorAll(".when-btn")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.when === state.when));
  }

  renderTimecard(pref, item, wage, hours, punch);
  const ranked = rank(mw().prefs, item.priceOf, wageOf);
  renderMap(item, ranked);
  renderDuel(item);
  renderRanking(pref, ranked);
  renderFormula(item.priceOf(pref), wage, hours);
  writeUrl();
}

function renderTimecard(pref, item, wage, hours, punch) {
  const phase = state.when === "new" ? "new" : wageOn(pref, todayIso).phase;
  $("tc-no").textContent = `No.${String(pref.code).padStart(2, "0")}`;
  $("tc-pref").textContent = pref.name;
  $("tc-wage").textContent =
    `${yen(wage)}円（${wageLabel(pref)}` + (phase === "new" ? `・${md(pref.effective)}発効）` : "）");
  $("tc-item").textContent = itemLabel(item, pref);

  const { h, m } = toHoursMinutes(hours);
  $("tc-time").innerHTML = `${h.toLocaleString("ja-JP")}<small>時間</small>${String(m).padStart(2, "0")}<small>分</small>`;
  $("tc-days").innerHTML = `8時間勤務で<b>${workdays(hours).toFixed(1)}</b>日ぶん`;

  // 発効日前の県は、旧額と新額を両方示す（F-07）
  const before = $("tc-before");
  if (todayIso < pref.effective) {
    before.hidden = false;
    if (state.when === "new") {
      const oldH = hoursFor(item.priceOf(pref), pref.old);
      before.innerHTML = `${md(pref.effective)}の発効までは${mw().oldLabel}の<b>${yen(pref.old)}</b>円なので、<b>${hm(oldH)}</b>（${workdays(oldH).toFixed(1)}日ぶん）かかります。`;
    } else {
      const newH = hoursFor(item.priceOf(pref), pref.new);
      before.innerHTML = `${md(pref.effective)}からは<b>${yen(pref.new)}</b>円（${mw().status}）に上がり、<b>${hm(newH)}</b>に縮みます。`;
    }
  } else {
    before.hidden = true;
  }

  // 結果の横棒と全国の点線
  const nat = nationalAverage();
  const natH = hoursFor(item.national, nat.wage);
  const scale = Math.max(hours, natH) * 1.12;
  $("tc-bar").innerHTML = `<span class="fill" style="transform:scaleX(${hours / scale})"></span><span class="nat" style="left:${(natH / scale) * 100}%"></span>`;
  $("tc-bar-note").innerHTML = item.custom
    ? `<span class="dot-key"></span>全国加重平均の最低賃金（${nat.label}・${yen(nat.wage)}円）なら${fmtH(natH)}時間`
    : `<span class="dot-key"></span>全国（${item.short}${yen(item.national)}円、最低賃金の全国加重平均${yen(nat.wage)}円）なら${fmtH(natH)}時間`;

  if (punch) {
    const card = $("timecard");
    card.classList.remove("is-punched");
    void card.offsetWidth;
    card.classList.add("is-punched");
  }
}

const RAMP = ["#ffe8de", "#ff9a78", "#ff4f2e", "#b8200a"].map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);
export function rampColor(t) {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const c = RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * f));
  return `rgb(${c.join(",")})`;
}

function renderMap(item, ranked) {
  const hs = ranked.map((r) => r.hours);
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  const byCode = new Map(ranked.map((r) => [r.pref.code, r]));
  for (const tile of $("tilemap").children) {
    const r = byCode.get(Number(tile.dataset.code));
    const t = max === min ? 0.5 : (r.hours - min) / (max - min);
    tile.style.backgroundColor = rampColor(t);
    tile.style.color = t > 0.52 ? "#fff" : "var(--ink)";
    tile.querySelector(".t-h").textContent = Math.round(r.hours).toLocaleString("ja-JP");
    tile.setAttribute("aria-pressed", String(r.pref.code === state.pref));
    tile.setAttribute("aria-label", `${r.pref.name} ${fmtH(r.hours)}時間`);
  }
  if (map3d) {
    map3d.update(
      ranked.map((r) => {
        const t = max === min ? 0.5 : (r.hours - min) / (max - min);
        return { code: r.pref.code, hours: r.hours, color: rampColor(t), text: `${r.pref.name} ${fmtH(r.hours)}時間` };
      }),
      state.pref,
    );
  }
  const what = item.custom ? `${yen(item.national)}円` : `その県の${item.name}`;
  $("map-caption").textContent = `${what}を、その県の最低賃金で払うと何時間？（数字は時間）`;
}

function renderDuel(item) {
  const a = prefByCode(state.pref);
  const b = prefByCode(state.vs);
  const ha = hoursFor(item.priceOf(a), wageOf(a));
  const hb = hoursFor(item.priceOf(b), wageOf(b));
  const scale = Math.max(ha, hb) * 1.05;
  $("duel-bars").innerHTML = [
    [a, ha],
    [b, hb],
  ]
    .map(
      ([p, h]) => `
      <div class="duel-row">
        <div class="d-label"><span>${p.name}<small>${item.custom ? "" : `${item.short}${yen(item.priceOf(p))}円・`}時給${yen(wageOf(p))}円</small></span><b>${fmtH(h)}時間</b></div>
        <div class="d-track" aria-hidden="true"><div class="d-fill" style="transform:scaleX(${h / scale})"></div></div>
      </div>`,
    )
    .join("");
  const diff = Math.abs(ha - hb);
  if (roundHours(diff) === 0) {
    $("duel-diff").textContent = "どちらの県でも、かかる時間は同じです。";
  } else {
    const faster = ha < hb ? a : b;
    $("duel-diff").innerHTML = `${faster.name}のほうが<b>${fmtH(diff)}時間</b>早く払い終わります。8時間勤務に直すと${workdays(diff).toFixed(1)}日の差です。`;
  }
}

const namesAt = (list, r) =>
  list
    .filter((x) => x.rank === r)
    .map((x) => x.pref.name)
    .join("・");

function renderRanking(pref, ranked) {
  const list = ranked;
  const max = list[0].hours;
  const me = list.find((r) => r.pref.code === pref.code);
  const first = list[0];
  const last = list[list.length - 1];
  const tie = list.filter((r) => r.rank === me.rank).length;
  $("rank-lead").textContent =
    `時間が長い順です。${pref.name}は${me.rank}位${tie > 1 ? `（${tie}県が同順位）` : ""}。` +
    `いちばん長いのは${namesAt(list, first.rank)}の${fmtH(first.hours)}時間、いちばん短いのは${namesAt(list, last.rank)}の${fmtH(last.hours)}時間です。`;
  $("rank-list").innerHTML = list
    .map(
      (r) => `
      <li class="${r.pref.code === pref.code ? "is-me" : ""}">
        <span class="r-no">${r.rank}</span>
        <span class="r-name">${r.pref.name}</span>
        <span class="r-track" aria-hidden="true"><span class="r-fill" style="display:block;transform:scaleX(${r.hours / max})"></span></span>
        <span class="r-h">${fmtH(r.hours)}h</span>
      </li>`,
    )
    .join("");
}

function renderFormula(price, wage, hours) {
  $("formula").innerHTML = `${yen(price)}円<span class="op">÷</span>${yen(wage)}円<span class="op">=</span><span class="ans">${fmtH(hours)}時間</span>`;
}

function renderSources() {
  const m = mw();
  const items = DATA.items
    .map(
      (i) => `
    <li>
      ${i.name}：<a href="${i.source.url}" rel="noopener" target="_blank">${i.source.org}「${i.source.name}」</a>
      <span class="src-meta">${i.source.detail}。${i.source.org}の公表資料を加工して作成。</span>
    </li>`,
    )
    .join("");
  $("source-list").innerHTML = `
    <li>
      最低賃金：<a href="${m.source.url}" rel="noopener" target="_blank">${m.source.org}「全ての都道府県で地域別最低賃金の改定額が答申されました」</a>
      <span class="src-meta">${m.fiscalYear}の${m.status}と${m.oldLabel}の額、発効予定日。${m.source.org}の公表資料を加工して作成。取得日 ${ymd(m.retrieved)}。一覧は<a href="${m.listUrl}" rel="noopener" target="_blank">地域別最低賃金の全国一覧</a>。</span>
    </li>${items}
    <li>
      地図：<a href="${DATA.geo.url}" rel="noopener" target="_blank">${DATA.geo.org}「${DATA.geo.name}」</a>（${DATA.geo.license}）
      <span class="src-meta"><a href="${DATA.geo.viaUrl}" rel="noopener" target="_blank">${DATA.geo.via}</a>を簡略化し、小さな島を省いて表示しています。</span>
    </li>`;
}

/* ───────── シェア ───────── */
function shareModel() {
  const form = $("share").querySelector("form");
  const pref = prefByCode(state.pref);
  const item = currentItem();
  const wage = wageOf(pref);
  const hours = hoursFor(item.priceOf(pref), wage);
  const ranked = rank(mw().prefs, item.priceOf, wageOf);
  const vs = prefByCode(state.vs);
  return {
    shape: form.shape.value,
    figure: form.figure.value,
    pref,
    wage,
    wageLabel: wageLabel(pref),
    title: DATA.site.title,
    what: item.custom && !$("share-amount").checked ? "ある買い物" : itemLabel(item, pref),
    hours,
    hm: hm(hours),
    days: workdays(hours).toFixed(1),
    tiles: TILES,
    mapImage: state.mapMode === "3d" && map3d ? map3d.snapshot() : null,
    ranked,
    rampColor,
    vs: { pref: vs, hours: hoursFor(item.priceOf(vs), wageOf(vs)), wage: wageOf(vs) },
    fmtH,
    yen,
    credit:
      `最低賃金：${wageLabel(pref)}（${mw().source.org}）` +
      (item.custom ? "" : `、${item.short}：${item.source.credit}`) +
      (form.figure.value === "map" ? `、地図：国土数値情報（${DATA.geo.org}）` : "") +
      "を加工して作成。額面（税・社会保険料の控除前）。",
    url: `${location.origin}${location.pathname}`,
  };
}

async function redrawShare() {
  const canvas = $("share-canvas");
  $("share-amount-opt").hidden = state.item !== CUSTOM;
  await drawShareCard(canvas, shareModel());
}

function canvasBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function download(blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sore-nanjikan-${state.pref}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function bindShare() {
  const dialog = $("share");
  const status = $("share-status");
  $("open-share").addEventListener("click", async () => {
    status.textContent = "";
    dialog.showModal();
    await redrawShare();
  });
  dialog.querySelector("form").addEventListener("change", redrawShare);
  $("do-save").addEventListener("click", async () => {
    download(await canvasBlob($("share-canvas")));
    status.textContent = "画像を保存しました。";
  });
  $("do-share").addEventListener("click", async () => {
    const blob = await canvasBlob($("share-canvas"));
    const file = new File([blob], `sore-nanjikan-${state.pref}.png`, { type: "image/png" });
    const url = `${location.origin}${location.pathname}?${new URLSearchParams(location.search)}`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: DATA.site.title, url });
        status.textContent = "";
      } catch (err) {
        if (err.name !== "AbortError") status.textContent = "共有できませんでした。「画像を保存する」から保存して、SNSに添付してください。";
      }
    } else {
      download(blob);
      status.textContent = "この端末は画像の直接共有に対応していないため、画像を保存しました。保存した画像をSNSに添付してください。";
    }
  });
}

init();
