/* 돌에 새긴 이름 — three.js 무대 (첫 변환 때 동적 로드) */
import * as T from './vendor/three.min.js';

var E = window.Engrave;
var DEG = Math.PI / 180;
var OG = { s: 0.8, H: 2.6 }; // 오검 기둥 단면·높이
// 판 크기(월드 단위) [폭, 높이, 두께, 모서리 반경, 베벨]
var DIMS = {
  hiero: [2.6, 2.0, 0.26, 0.08, 0.03], all: [2.6, 2.0, 0.26, 0.08, 0.03],
  roman: [3.0, 1.5, 0.18, 0.05, 0.02], greek: [3.0, 1.5, 0.18, 0.05, 0.02],
  runic: [2.8, 1.87, 0.34, 0.42, 0.04],
  phoenician: [2.8, 1.87, 0.22, 0.34, 0.16], ugaritic: [2.8, 1.87, 0.22, 0.34, 0.16]
};

function slabGeometry(d) {
  var w = d[0], h = d[1], r = d[3], s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  var g = new T.ExtrudeGeometry(s, { depth: d[2], bevelEnabled: true, bevelThickness: d[4], bevelSize: d[4], bevelSegments: d[4] > 0.1 ? 6 : 2, curveSegments: 10 });
  g.translate(0, 0, -d[2] / 2);
  // 앞·뒤 면 UV를 판 전체 0..1로
  var p = g.attributes.position, uv = g.attributes.uv;
  for (var i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}

export function createStage(host, opts) {
  opts = opts || {};
  var canvas = document.createElement('canvas'); canvas.className = 'stage-canvas';
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  host.appendChild(canvas);
  var scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
  var sun = new T.DirectionalLight(0xFFF1D6, 2.6); sun.position.set(-3.5, 4.2, 5); scene.add(sun);
  scene.add(new T.AmbientLight(0xffffff, 0.55));
  var mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 768, frameMin = mobile ? 1000 / 30 : 0;

  // 돌가루 입자 (최대 20개, 400ms)
  var PN = 20, pPos = new Float32Array(PN * 3).fill(-99), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN);
  var pGeo = new T.BufferGeometry(); pGeo.setAttribute('position', new T.Float32BufferAttribute(pPos, 3));
  var pMat = new T.PointsMaterial({ size: 0.035, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  var points = new T.Points(pGeo, pMat); scene.add(points); var pNext = 0;

  var cur = null, old = null, fade = null, carve = null, running = false, visible = true, last = 0, t0 = performance.now();
  var frames = 0;
  var drag = { on: false, x0: 0, target: 0, val: 0 };

  function size() {
    var w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fit();
  }
  function fit() {
    if (!cur) return; var bw = cur.bw, bh = cur.bh, t = Math.tan(camera.fov * DEG / 2);
    var dist = Math.max((bh / 2) / t, (bw / 2) / (t * camera.aspect)) * 1.18 + cur.depth;
    camera.position.set(0, cur.camY || 0, dist); camera.lookAt(0, 0, 0);
  }

  function makeTex(c, color) { var t = new T.CanvasTexture(c); t.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 4; return t; }

  function build(key, res, title, mat, tex) {
    var group = new T.Group(), M = E.MATS[mat], ogham = key === 'ogham', fw, fh, d;
    if (ogham) { fw = Math.round(1280 * OG.s / OG.H) * 2; fh = 1280; } else { d = DIMS[key]; fw = 1024; fh = Math.round(1024 * d[1] / d[0]); }
    var face = E.buildFace(key, res, title, mat, fw, fh, tex, { normals: true });
    var col = E.mk(fw, fh), nor = E.mk(fw, fh);
    col.getContext('2d').drawImage(face.base, 0, 0); nor.getContext('2d').drawImage(face.baseN, 0, 0);
    var sideTex = null, sideNor = null;
    if (tex) {
      sideTex = new T.CanvasTexture(tex.color); sideTex.colorSpace = T.SRGBColorSpace; sideTex.wrapS = sideTex.wrapT = T.RepeatWrapping; sideTex.repeat.set(2, 2);
      sideNor = new T.CanvasTexture(tex.normal); sideNor.colorSpace = T.NoColorSpace; sideNor.wrapS = sideNor.wrapT = T.RepeatWrapping; sideNor.repeat.set(2, 2);
    }
    var mats = [], texes = [];
    function faceMat(offsetX, repX) {
      var ct = makeTex(col, true), nt = makeTex(nor, false);
      if (repX) { ct.repeat.set(repX, 1); ct.offset.set(offsetX, 0); nt.repeat.set(repX, 1); nt.offset.set(offsetX, 0); }
      texes.push(ct, nt);
      var m = new T.MeshStandardMaterial({ map: ct, normalMap: nt, normalScale: new T.Vector2(1.3, 1.3), roughness: mat === 'marble' ? 0.55 : 0.92, metalness: 0, transparent: true, opacity: 0 });
      mats.push(m); return m;
    }
    var sideM = new T.MeshStandardMaterial({ color: sideTex ? 0xffffff : new T.Color(M.base), map: sideTex, normalMap: sideNor, roughness: 0.95, transparent: true, opacity: 0 });
    if (sideTex) sideM.color = new T.Color(0xe8e8e8);
    mats.push(sideM);
    var mesh, bw, bh, depth;
    if (ogham) {
      var s = OG.s, H = OG.H; bw = s * Math.SQRT2; bh = H; depth = s * 0.7;
      // 박스 면 순서: px, nx, py, ny, pz, nz — pz 오른쪽 끝과 px 왼쪽 끝이 맞닿는 모서리 = 줄기선
      var fa = faceMat(0, 0.5), fb = faceMat(0.5, 0.5);
      mesh = new T.Mesh(new T.BoxGeometry(s, H, s), [fb, sideM, sideM, sideM, fa, sideM]);
      mesh.rotation.y = -45 * DEG;
    } else {
      bw = d[0] + d[4] * 2; bh = d[1] + d[4] * 2; depth = d[2] / 2 + d[4];
      mesh = new T.Mesh(slabGeometry(d), [faceMat(), sideM]);
    }
    group.add(mesh);
    var g = { group: group, mesh: mesh, mats: mats, texes: texes, face: face, col: col, nor: nor, bw: bw, bh: bh, depth: depth, key: key, ogham: ogham, d: d,
      baseRotY: ogham ? -45 * DEG : 0, camY: ogham ? 0.25 : 0, dispose: function () {
        mesh.geometry.dispose(); mats.forEach(function (m) { m.dispose(); }); texes.forEach(function (t) { t.dispose(); }); if (sideTex) { sideTex.dispose(); sideNor.dispose(); } } };
    return g;
  }

  // 단위 좌표(px) → 판 위 3D 위치
  function unitPos(g, u) {
    var cx = (u.bbox[0] + u.bbox[2] / 2) / g.face.W, cy = (u.bbox[1] + u.bbox[3] / 2) / g.face.H;
    if (g.ogham) {
      var s = OG.s, H = OG.H, onA = cx < 0.5, t = onA ? cx * 2 : (cx - 0.5) * 2;
      var lx = onA ? (-s / 2 + t * s) : s / 2, lz = onA ? s / 2 : (s / 2 - t * s);
      var v = new T.Vector2(lx, lz), c = Math.cos(-45 * DEG), sn = Math.sin(-45 * DEG);
      return [v.x * c + v.y * sn, (0.5 - cy) * H, -v.x * sn + v.y * c + 0.02];
    }
    return [(cx - 0.5) * g.d[0], (0.5 - cy) * g.d[1], g.depth + 0.01];
  }
  function spawn(pos) {
    for (var k = 0; k < 3; k++) {
      var i = pNext++ % PN; pPos[i * 3] = pos[0] + (Math.random() - 0.5) * 0.08; pPos[i * 3 + 1] = pos[1]; pPos[i * 3 + 2] = pos[2];
      pVel[i * 3] = (Math.random() - 0.5) * 0.8; pVel[i * 3 + 1] = 0.3 + Math.random() * 0.5; pVel[i * 3 + 2] = 0.3 + Math.random() * 0.4; pLife[i] = 0.4;
    }
  }

  function startCarve(g, animate) {
    var units = g.face.units, n = units.length;
    if (!animate || opts.reduced) { paint(g, units.map(function () { return 1; })); carve = null; return; }
    var stagger = n > 1 ? Math.min(120, (1500 - 250) / (n - 1)) : 0;
    carve = { g: g, start: performance.now(), stagger: stagger, spawned: new Uint8Array(n), done: false };
  }
  function paint(g, prog) {
    var cx = g.col.getContext('2d'), nx = g.nor.getContext('2d'), f = g.face;
    cx.globalAlpha = 1; nx.globalAlpha = 1; cx.drawImage(f.base, 0, 0); nx.drawImage(f.baseN, 0, 0);
    f.units.forEach(function (u, i) {
      var p = prog[i]; if (p <= 0) return;
      var b = u.bbox, x = Math.max(0, Math.floor(b[0])), y = Math.max(0, Math.floor(b[1])), w = Math.min(f.W - x, Math.ceil(b[2]) + 2), h = Math.min(f.H - y, Math.ceil(b[3]) + 2);
      if (w <= 0 || h <= 0) return;
      cx.globalAlpha = p; nx.globalAlpha = p; cx.drawImage(f.full, x, y, w, h, x, y, w, h); nx.drawImage(f.fullN, x, y, w, h, x, y, w, h);
    });
    cx.globalAlpha = 1; nx.globalAlpha = 1;
    g.texes.forEach(function (t) { t.needsUpdate = true; });
  }

  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    if (frameMin && now - last < frameMin - 1) return;
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    // 흔들림 ±8° / 6초, 드래그 ±25°
    drag.val += (drag.target - drag.val) * (drag.on ? 0.35 : 0.08);
    var sway = opts.reduced ? 0 : Math.sin((now - t0) / 6000 * Math.PI * 2) * 8 * DEG * (drag.on ? 0.2 : 1);
    [cur, old].forEach(function (g) { if (g) g.group.rotation.y = sway + drag.val; });
    if (fade) {
      var k = Math.min(1, (now - fade.start) / 200);
      cur.mats.forEach(function (m) { m.opacity = k; });
      if (old) old.mats.forEach(function (m) { m.opacity = 1 - k; });
      if (k >= 1) { cur.mats.forEach(function (m) { m.transparent = false; m.needsUpdate = true; }); if (old) { scene.remove(old.group); old.dispose(); old = null; } fade = null; }
    }
    if (carve) {
      var el = now - carve.start, units = carve.g.face.units, prog = units.map(function (u, i) {
        var p = (el - i * carve.stagger) / 250; if (p > 0 && !carve.spawned[i] && u.layer === 'carve') { carve.spawned[i] = 1; spawn(unitPos(carve.g, u)); }
        return Math.max(0, Math.min(1, p));
      });
      paint(carve.g, prog);
      if (prog.every(function (p) { return p >= 1; })) carve = null;
    }
    var any = false;
    for (var i = 0; i < PN; i++) {
      if (pLife[i] <= 0) continue; any = true; pLife[i] -= dt;
      pVel[i * 3 + 1] -= 3.2 * dt; pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      if (pLife[i] <= 0) pPos[i * 3 + 1] = -99;
    }
    if (any) pGeo.attributes.position.needsUpdate = true;
    if (cur) pMat.color.set(E.MATS[cur.mat].base).multiplyScalar(0.92);
    renderer.render(scene, camera); frames++;
  }
  function setRunning(on) {
    on = on && visible && !document.hidden;
    if (on === running) return; running = on; if (on) { last = 0; requestAnimationFrame(tick); }
  }

  // 드래그(가로만, 확대 없음)
  canvas.addEventListener('pointerdown', function (e) { drag.on = true; drag.x0 = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function (e) { if (!drag.on) return; var dx = (e.clientX - drag.x0) / host.clientWidth; drag.target = Math.max(-25, Math.min(25, dx * 70)) * DEG; });
  function up() { drag.on = false; drag.target = 0; }
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);

  var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; setRunning(true); }, { threshold: 0.01 });
  io.observe(host);
  document.addEventListener('visibilitychange', function () { setRunning(true); });
  var ro = new ResizeObserver(size); ro.observe(host);

  var api = {
    renderer: renderer,
    get running() { return running; },
    get frames() { return frames; },
    fpsCap: mobile ? 30 : 60,
    show: function (key, res, title, mat, animate) {
      return E.loadTex(mat).then(function (tex) {
        var g = build(key, res, title, mat, tex); g.mat = mat;
        if (cur) { if (old) { scene.remove(old.group); old.dispose(); } old = cur; old.mats.forEach(function (m) { m.transparent = true; m.needsUpdate = true; }); }
        cur = g; scene.add(g.group); fade = { start: performance.now() }; fit(); size();
        startCarve(g, animate !== false);
        setRunning(true);
      });
    },
    destroy: function () { running = false; io.disconnect(); ro.disconnect(); if (cur) cur.dispose(); if (old) old.dispose(); renderer.dispose(); canvas.remove(); }
  };
  size();
  return api;
}
