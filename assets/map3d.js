// Three.js の立体日本地図。県ごとの必要時間を「高さ」と「色」で表す。
// 県境：国土交通省 国土数値情報「行政区域データ 2025年版」（CC BY 4.0）を加工。
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  Shape,
  Path,
  ExtrudeGeometry,
  ShapeGeometry,
  MeshToonMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  LineSegments,
  LineLoop,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Color,
  DataTexture,
  RedFormat,
  NearestFilter,
  HemisphereLight,
  DirectionalLight,
  Raycaster,
  Vector2,
  Vector3,
  SRGBColorSpace,
} from "./vendor/three.min.js";

const INK = 0x1c1633;
const DEG = Math.PI / 180;
const LON0 = 136.8;
const LAT0 = 36.4;
const COSLAT = Math.cos(36 * DEG);
// 高さは47県の中での相対値（最短の県＝MIN_HEIGHT、最長の県＝MAX_HEIGHT）
const MIN_HEIGHT = 0.12;
const MAX_HEIGHT = 0.85;
// 沖縄県は日本海側に移して表示する（地図の定番の配置）
const INSET = { 47: [7.2, 14.2] };

function project(lon, lat, code) {
  const d = INSET[code];
  if (d) {
    lon += d[0];
    lat += d[1];
  }
  return [(lon - LON0) * COSLAT, lat - LAT0];
}

function ringToPoints(ring, code) {
  const pts = ring.map(([lon, lat]) => new Vector2(...project(lon, lat, code)));
  if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop();
  return pts;
}

function toonGradient() {
  const tex = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export async function createMap3D(container, { geojsonUrl, onSelect }) {
  const geo = await (await fetch(geojsonUrl)).json();

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = "map3d-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.append(renderer.domElement);

  const label = document.createElement("div");
  label.className = "map3d-label";
  label.hidden = true;
  container.append(label);
  const hoverLabel = document.createElement("div");
  hoverLabel.className = "map3d-label is-hover";
  hoverLabel.hidden = true;
  container.append(hoverLabel);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 200);
  scene.add(new HemisphereLight(0xffffff, 0xffd23f, 1.6));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(-6, -10, 14);
  scene.add(sun);

  const world = new Group();
  scene.add(world);
  const tmp = new Vector3();
  const corners = [];
  const gradientMap = toonGradient();
  const lineMat = new LineBasicMaterial({ color: INK });
  const shadowMat = new MeshBasicMaterial({ color: INK });

  /** code -> { mesh, capMat, sideMat, height, targetHeight, center, x } */
  const prefs = new Map();
  let minX = Infinity;
  let maxX = -Infinity;
  const allShapes = [];

  for (const f of geo.features) {
    const code = Number(f.properties.code);
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    const shapes = [];
    const edge = [];
    let bestArea = -1;
    let center = new Vector2();
    for (const poly of polys) {
      const outer = ringToPoints(poly[0], code);
      const shape = new Shape(outer);
      for (const hole of poly.slice(1)) shape.holes.push(new Path(ringToPoints(hole, code)));
      shapes.push(shape);
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i];
        const b = outer[(i + 1) % outer.length];
        edge.push(a.x, a.y, 1, b.x, b.y, 1);
      }
      // ラベルは一番大きい島の重心に付ける
      let area = 0;
      const c = new Vector2();
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i];
        const b = outer[(i + 1) % outer.length];
        const cross = a.x * b.y - b.x * a.y;
        area += cross;
        c.x += (a.x + b.x) * cross;
        c.y += (a.y + b.y) * cross;
      }
      if (Math.abs(area) > bestArea) {
        bestArea = Math.abs(area);
        center = c.divideScalar(3 * area);
      }
      for (const p of outer) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      }
    }
    allShapes.push(...shapes);

    const geometry = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false });
    const capMat = new MeshToonMaterial({ color: 0xfff8ec, gradientMap });
    const sideMat = new MeshToonMaterial({ color: 0xffe0d0, gradientMap });
    const mesh = new Mesh(geometry, [capMat, sideMat]);
    mesh.userData.code = code;
    mesh.scale.z = 0.001;
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute("position", new Float32BufferAttribute(edge, 3));
    mesh.add(new LineSegments(lineGeo, lineMat));
    world.add(mesh);
    prefs.set(code, {
      mesh,
      capMat,
      sideMat,
      height: 0.001,
      from: 0.001,
      to: 0.001,
      colorFrom: new Color(0xfff8ec),
      colorTo: new Color(0xfff8ec),
      center,
      name: f.properties.name,
    });
  }

  // 墨色のずらし影（ページのボタンやカードと同じ「ポップ」な影）
  const shadow = new Mesh(new ShapeGeometry(allShapes), shadowMat);
  shadow.position.set(0.22, -0.22, -0.02);
  world.add(shadow);

  // 沖縄の移設を示す枠
  const oki = prefs.get(47);
  if (oki) {
    oki.mesh.geometry.computeBoundingBox();
    const bb = oki.mesh.geometry.boundingBox;
    const pad = 0.35;
    const frame = new BufferGeometry();
    frame.setAttribute(
      "position",
      new Float32BufferAttribute(
        [bb.min.x - pad, bb.min.y - pad, 0, bb.max.x + pad, bb.min.y - pad, 0, bb.max.x + pad, bb.max.y + pad, 0, bb.min.x - pad, bb.max.y + pad, 0],
        3,
      ),
    );
    world.add(new LineLoop(frame, lineMat));
  }

  // 地図の中心を原点に寄せ、カメラ合わせ用の外接箱を作る
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of prefs.values()) {
    p.mesh.geometry.computeBoundingBox();
    minY = Math.min(minY, p.mesh.geometry.boundingBox.min.y);
    maxY = Math.max(maxY, p.mesh.geometry.boundingBox.max.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  for (const child of world.children) {
    child.position.x -= cx;
    child.position.y -= cy;
  }
  // カメラ合わせには実際の県境の点を間引いて使う（外接箱だと斜めの列島で余白が大きくなる）
  for (const f of geo.features) {
    const code = Number(f.properties.code);
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) {
      poly[0].forEach(([lon, lat], i) => {
        if (i % 4) return;
        const [x, y] = project(lon, lat, code);
        corners.push(new Vector3(x - cx, y - cy, 0), new Vector3(x - cx, y - cy, MAX_HEIGHT + 0.25));
      });
    }
  }

  /* ───── カメラ操作：ドラッグで回転・傾き、タップで県を選ぶ ───── */
  let yaw = 0;
  let userRotated = false;
  let tilt = 38 * DEG;
  let width = 1;
  let height = 1;
  let selected = null;
  let hovered = null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 地図の外接箱の8隅が画面に収まる距離を二分探索で求める
  function setCamera(dist) {
    camera.position.set(0, -Math.sin(tilt) * dist, Math.cos(tilt) * dist);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }
  function fits() {
    for (const c of corners) {
      tmp.copy(c).applyMatrix4(world.matrixWorld).project(camera);
      if (Math.abs(tmp.x) > 0.94 || Math.abs(tmp.y) > 0.94 || tmp.z > 1) return false;
    }
    return true;
  }
  function placeCamera() {
    camera.aspect = width / height;
    world.rotation.z = yaw;
    world.updateMatrixWorld();
    let lo = 5;
    let hi = 200;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      setCamera(mid);
      if (fits()) hi = mid;
      else lo = mid;
    }
    setCamera(hi);
  }

  function resize() {
    const r = container.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    // 縦長の枠（スマホ）では列島を立てて置き、横長の枠では寝かせる。ドラッグ後は変えない
    if (!userRotated) {
      const ratio = width / height;
      yaw = (ratio < 1.2 ? 34 : ratio < 1.5 ? 4 : -34) * DEG;
    }
    renderer.setSize(width, height, false);
    placeCamera();
    requestRender();
  }
  new ResizeObserver(resize).observe(container);

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...prefs.values()].map((p) => p.mesh), false)[0];
    return hit ? hit.object.userData.code : null;
  }

  let drag = null;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, yaw, tilt, moved: false };
    el.setPointerCapture(ev.pointerId);
  });
  el.addEventListener("pointermove", (ev) => {
    if (drag) {
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      if (drag.moved) {
        userRotated = true;
        yaw = Math.max(-30 * DEG, Math.min(60 * DEG, drag.yaw + dx * 0.006));
        tilt = Math.max(15 * DEG, Math.min(62 * DEG, drag.tilt - dy * 0.005));
        placeCamera();
        requestRender();
      }
      return;
    }
    if (ev.pointerType !== "mouse") return;
    const code = pick(ev);
    if (code !== hovered) {
      hovered = code;
      el.style.cursor = code ? "pointer" : "grab";
      requestRender();
    }
  });
  el.addEventListener("pointerleave", () => {
    hovered = null;
    requestRender();
  });
  el.addEventListener("pointerup", (ev) => {
    const d = drag;
    drag = null;
    if (d && !d.moved) {
      const code = pick(ev);
      if (code) onSelect(code);
    }
  });

  /* ───── 描画 ───── */
  let anim = null;
  let frameQueued = false;
  function requestRender() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(frame);
  }

  function placeLabel(node, code, text) {
    const p = prefs.get(code);
    if (!p || !text) {
      node.hidden = true;
      return;
    }
    tmp
      .set(p.center.x + p.mesh.position.x, p.center.y + p.mesh.position.y, p.mesh.scale.z + p.mesh.position.z)
      .applyMatrix4(world.matrixWorld)
      .project(camera);
    node.hidden = false;
    node.textContent = text;
    node.style.transform = `translate(${((tmp.x + 1) / 2) * width}px, ${((1 - tmp.y) / 2) * height}px) translate(-50%, calc(-100% - 10px))`;
  }

  function frame(now) {
    frameQueued = false;
    if (anim) {
      let running = false;
      for (const [code, p] of prefs) {
        const t = Math.min(1, Math.max(0, (now - anim.start - anim.delay(code)) / anim.duration));
        if (t < 1) running = true;
        const e = easeOut(t);
        p.mesh.scale.z = p.from + (p.to - p.from) * e;
        p.capMat.color.copy(p.colorFrom).lerp(p.colorTo, e);
        p.sideMat.color.copy(p.capMat.color).multiplyScalar(0.74);
      }
      if (running) requestRender();
      else anim = null;
    }
    for (const [code, p] of prefs) {
      const lift = code === selected ? 0.18 : 0;
      p.mesh.position.z = lift;
      p.capMat.emissive.setHex(code === hovered ? 0x3a3000 : 0x000000);
    }
    world.updateMatrixWorld();
    renderer.render(scene, camera);
    placeLabel(label, selected, labels.get(selected));
    placeLabel(hoverLabel, hovered !== selected ? hovered : null, labels.get(hovered));
  }

  const labels = new Map();

  return {
    /**
     * values: [{ code, hours, color, text }]  高さは47県の中での相対値
     */
    update(values, selectedCode) {
      selected = selectedCode;
      const max = Math.max(...values.map((v) => v.hours));
      const min = Math.min(...values.map((v) => v.hours));
      for (const v of values) {
        const p = prefs.get(v.code);
        if (!p) continue;
        const t = max === min ? 0.5 : (v.hours - min) / (max - min);
        p.from = p.mesh.scale.z;
        p.to = MIN_HEIGHT + t * (MAX_HEIGHT - MIN_HEIGHT);
        p.colorFrom.copy(p.capMat.color);
        p.colorTo.set(v.color);
        labels.set(v.code, v.text);
      }
      const spanX = maxX - minX || 1;
      anim = {
        start: performance.now(),
        duration: reduced ? 1 : 700,
        delay: (code) => (reduced ? 0 : ((prefs.get(code).center.x - minX) / spanX) * 380),
      };
      requestRender();
    },
    select(code) {
      selected = code;
      requestRender();
    },
    /** シェア画像用：いまの見た目をそのまま返す */
    snapshot() {
      world.updateMatrixWorld();
      renderer.render(scene, camera);
      return renderer.domElement;
    },
    resize,
  };
}
