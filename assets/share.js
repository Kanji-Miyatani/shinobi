// シェアカード（F-06）をcanvasに描く。横長 1200×630 / 正方形 1080×1080。
const C = {
  ink: "#1c1633",
  paper: "#fff8ec",
  card: "#fffdf7",
  sun: "#ffd23f",
  tomato: "#ff4f2e",
  tomatoDeep: "#c42a10",
  mint: "#2ec4b6",
  bubble: "#ff8ac5",
};
const HEAD = '"Dela Gothic One", "Hiragino Sans", sans-serif';
const BODY = '"Zen Kaku Gothic New", "Hiragino Sans", sans-serif';
const DOT = '"DotGothic16", monospace';

async function loadFonts(m) {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load(`40px ${HEAD}`, `${m.title}${m.pref.name}${m.what}の最低賃金時給円を払うと`),
    document.fonts.load(`700 20px ${BODY}`, "最低賃金勤務"),
    document.fonts.load(`40px ${DOT}`, "0123456789時間分"),
  ]).catch(() => {});
}

function box(ctx, x, y, w, h, r, fill, { shadow = 8, line = 4 } = {}) {
  if (shadow) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.roundRect(x + shadow, y + shadow, w, h, r);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
}

/** 幅に収まるまで文字を小さくして描く */
function fitText(ctx, text, x, y, maxW, size, font, color = C.ink) {
  let s = size;
  ctx.font = `${s}px ${font}`;
  while (ctx.measureText(text).width > maxW && s > 12) {
    s -= 1;
    ctx.font = `${s}px ${font}`;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  return s;
}

/** 立体地図のスナップショットから、透明な余白を除いた範囲を求める */
function cropToContent(src) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  let x0 = c.width;
  let y0 = c.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (data[(y * c.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return { canvas: c, sx: 0, sy: 0, sw: c.width, sh: c.height };
  return { canvas: c, sx: x0, sy: y0, sw: x1 - x0 + 2, sh: y1 - y0 + 2 };
}

function drawMap(ctx, m, x, y, w, h) {
  if (m.mapImage && m.mapImage.width > 0) {
    const { canvas: img, sx, sy, sw, sh } = cropToContent(m.mapImage);
    const k = Math.min(w / sw, h / sh);
    const iw = sw * k;
    const ih = sh * k;
    ctx.drawImage(img, sx, sy, sw, sh, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    ctx.font = `700 22px ${BODY}`;
    ctx.fillStyle = C.ink;
    ctx.fillText("高く濃いほど長い", x, y + 22);
    return;
  }
  const cols = 13;
  const rows = 12;
  const gap = 4;
  const cell = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows);
  const ox = x + (w - (cell * cols + gap * (cols - 1))) / 2;
  const oy = y + (h - (cell * rows + gap * (rows - 1))) / 2;
  const hs = m.ranked.map((r) => r.hours);
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  const byCode = new Map(m.ranked.map((r) => [r.pref.code, r]));
  for (const [code, col, row] of m.tiles) {
    const r = byCode.get(code);
    const t = max === min ? 0.5 : (r.hours - min) / (max - min);
    const tx = ox + col * (cell + gap);
    const ty = oy + row * (cell + gap);
    const me = code === m.pref.code;
    ctx.fillStyle = m.rampColor(t);
    ctx.beginPath();
    ctx.roundRect(tx, ty, cell, cell, cell * 0.18);
    ctx.fill();
    ctx.lineWidth = me ? 5 : 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    if (me) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(tx + cell / 2, ty + cell / 2, cell * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.font = `700 ${Math.round(cell * 0.62)}px ${BODY}`;
  ctx.fillStyle = C.ink;
  ctx.fillText("濃いほど長い", ox, oy + cell * 0.7);
}

function drawBars(ctx, m, x, y, w, h) {
  const rows = [
    { p: m.pref, hours: m.hours, wage: m.wage, fill: C.sun },
    { p: m.vs.pref, hours: m.vs.hours, wage: m.vs.wage, fill: C.bubble },
  ];
  const scale = Math.max(rows[0].hours, rows[1].hours) * 1.05;
  const rowH = Math.min(120, h / 2.4);
  rows.forEach((r, i) => {
    const ry = y + i * (rowH + 28) + (h - (rowH * 2 + 28)) / 2;
    ctx.font = `${Math.round(rowH * 0.26)}px ${HEAD}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(r.p.name, x, ry + rowH * 0.26);
    ctx.font = `${Math.round(rowH * 0.3)}px ${DOT}`;
    const label = `${m.fmtH(r.hours)}時間`;
    ctx.fillText(label, x + w - ctx.measureText(label).width, ry + rowH * 0.28);
    const by = ry + rowH * 0.42;
    const bh = rowH * 0.5;
    box(ctx, x, by, w, bh, 8, C.card, { shadow: 5, line: 3 });
    ctx.fillStyle = r.fill;
    ctx.beginPath();
    ctx.roundRect(x + 2, by + 2, (w - 4) * (r.hours / scale), bh - 4, 6);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
  });
}

export async function drawShareCard(canvas, m) {
  await loadFonts(m);
  const W = m.shape === "square" ? 1080 : 1200;
  const H = m.shape === "square" ? 1080 : 630;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  // 背景
  ctx.fillStyle = C.sun;
  ctx.fillRect(0, 0, W, H);

  const pad = 48;
  const wide = m.shape !== "square";
  const textW = wide ? 640 : W - pad * 2;

  // ロゴ
  ctx.font = `30px ${HEAD}`;
  const logo = m.title;
  const lw = ctx.measureText(logo).width + 36;
  box(ctx, pad, pad, lw, 58, 29, C.ink, { shadow: 0, line: 0 });
  ctx.fillStyle = C.sun;
  ctx.fillText(logo, pad + 18, pad + 40);

  // 条件
  let y = pad + 58 + (wide ? 62 : 74);
  fitText(ctx, `${m.pref.name}の最低賃金（時給${m.yen(m.wage)}円）で`, pad, y, textW, wide ? 34 : 40, HEAD);
  y += wide ? 52 : 60;
  fitText(ctx, `${m.what}を払うと`, pad, y, textW, wide ? 34 : 40, HEAD);

  // タイムカード風の結果
  y += wide ? 30 : 40;
  const cardH = wide ? 200 : 230;
  ctx.save();
  ctx.translate(pad, y);
  ctx.rotate((-1.4 * Math.PI) / 180);
  box(ctx, 0, 0, textW, cardH, 10, C.card, { shadow: 10, line: 4 });
  ctx.font = `700 22px ${BODY}`;
  ctx.fillStyle = C.ink;
  ctx.fillText("必要な労働時間", 32, 46);
  fitText(ctx, m.hm, 30, wide ? 136 : 150, textW - 60, wide ? 92 : 108, DOT, C.tomatoDeep);
  ctx.font = `700 26px ${BODY}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(`8時間勤務で${m.days}日ぶん`, 32, cardH - 26);
  ctx.restore();

  // 図
  if (wide) {
    const fx = pad + textW + 56;
    const fw = W - fx - pad;
    if (m.figure === "map") drawMap(ctx, m, fx, pad + 10, fw, H - pad * 2 - 70);
    else drawBars(ctx, m, fx, pad + 70, fw, H - pad * 2 - 150);
  } else {
    const fy = y + cardH + 50;
    const fh = H - fy - 130;
    if (m.figure === "map") drawMap(ctx, m, pad, fy, W - pad * 2, fh);
    else drawBars(ctx, m, pad, fy, W - pad * 2, fh);
  }

  // 出典とURL
  ctx.font = `700 ${wide ? 17 : 19}px ${BODY}`;
  ctx.fillStyle = C.ink;
  const creditY = H - pad - (wide ? 26 : 34);
  fitText(ctx, m.credit, pad, creditY, W - pad * 2, wide ? 17 : 19, BODY);
  fitText(ctx, m.url, pad, creditY + (wide ? 28 : 34), W - pad * 2, wide ? 18 : 22, DOT);
}
