/* 돌에 새긴 이름 — 재료 질감 + 음각(2D) 공용 모듈. 3D 무대, 2D 대체 화면, 인스타 PNG가 함께 씀 */
(function (root) {
  'use strict';
  var MATS = {
    limestone: { name: '석회암', base: '#D9D2C3', engrave: '#8F8676', paint: '#C9A227', tile: 360, edge: 0.10 },
    papyrus:   { name: '파피루스', base: '#E8D7A8', engrave: '#2B241C', paint: '#C9A227', ink: true, tile: 300, edge: 0.06 },
    granite:   { name: '화강암', base: '#8A8C88', engrave: '#454742', pigment: '#A33A2A', tile: 260, edge: 0.16 },
    clay:      { name: '점토', base: '#B98A5E', engrave: '#7A5232', tile: 420, edge: 0.26, pillow: true },
    wood:      { name: '나무 기둥', base: '#8B6A45', engrave: '#4F3A24', tile: 300, edge: 0.10 },
    marble:    { name: '대리석', base: '#EDEBE6', engrave: '#9A958B', tile: 520, edge: 0.07 }
  };
  var SCRIPT_MAT = { roman: 'marble', greek: 'marble', hiero: 'limestone', runic: 'granite', phoenician: 'clay', ugaritic: 'clay', ogham: 'wood', all: 'limestone' };
  var FONT = { roman: 'Noto Serif', greek: 'Noto Serif', hiero: 'Noto Sans Egyptian Hieroglyphs', runic: 'Noto Sans Runic',
    phoenician: 'Noto Sans Phoenician', ugaritic: 'Noto Sans Ugaritic', ogham: 'Noto Sans Ogham' };
  var TITLE_SIGN = { prenomen: '𓇓𓆤', nomen: '𓅭𓇳' }; // 사초·벌(nswt-bjtj, 상·하 이집트의 왕) / 라의 아들(sꜣ-Rꜥ)
  var BASE = (function () { try { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : ''; } catch (e) { return ''; } })();

  function matFor(key, hieroMat) { return key === 'hiero' || key === 'all' ? (hieroMat || 'limestone') : SCRIPT_MAT[key]; }

  var texCache = {};
  function loadImg(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.decoding = 'async'; i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }
  function loadTex(name) {
    if (!texCache[name]) texCache[name] = Promise.all([loadImg(BASE + 'assets/tex/' + name + '-color.webp'), loadImg(BASE + 'assets/tex/' + name + '-normal.webp')])
      .then(function (a) { return { color: a[0], normal: a[1] }; }, function () { delete texCache[name]; return null; });
    return texCache[name];
  }

  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function rrPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function darken(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) * k, g = ((n >> 8) & 255) * k, b = (n & 255) * k;
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }
  function pattern(ctx, img, tilePx, ox, oy) {
    var p = ctx.createPattern(img, 'repeat'); var s = tilePx / img.width;
    if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, ox || 0, oy || 0]));
    return p;
  }
  // 재료 판 채우기 (path는 이미 잡힌 상태에서 호출)
  function fillStone(ctx, mat, tex, scale, ox, oy) {
    var M = MATS[mat];
    ctx.fillStyle = M.base; ctx.fill();
    if (tex && tex.color) { ctx.fillStyle = pattern(ctx, tex.color, M.tile * (scale || 1), ox, oy); ctx.fill(); }
  }
  // 판 가장자리 음영 (점토는 베개처럼 부푼 느낌)
  function edgeShade(ctx, x, y, w, h, r, mat, scale) {
    var M = MATS[mat], k = scale || 1, lw = (M.pillow ? 60 : 24) * k;
    ctx.save(); rrPath(ctx, x, y, w, h, r); ctx.clip();
    ctx.filter = 'blur(' + Math.round((M.pillow ? 26 : 10) * k) + 'px)';
    ctx.strokeStyle = 'rgba(40,25,10,' + M.edge + ')'; ctx.lineWidth = lw; rrPath(ctx, x, y, w, h, r); ctx.stroke();
    ctx.filter = 'none';
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255,248,230,' + (M.pillow ? 0.22 : 0.10) + ')'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (M.pillow ? 0.14 : 0.06) + ')');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  /* ---------- 음각 단위(unit) 만들기: 글자 하나 = 한 단위 ---------- */
  var mctx = mk(8, 8).getContext('2d');
  function fontStr(fam, size, weight) { return (weight || 400) + ' ' + size + 'px "' + fam + '"'; }
  function textUnits(str, fam, size, cx, cy, maxW, o) {
    o = o || {};
    var chars = Array.from(str), sp = (o.spacing || 0) * size, s = size, widths, total;
    do {
      mctx.font = fontStr(fam, s, o.weight); widths = chars.map(function (c) { return mctx.measureText(c).width; });
      total = widths.reduce(function (a, b) { return a + b; }, 0) + sp * Math.max(0, chars.length - 1) * (s / size);
      if (total <= maxW || s <= 10) break; s = Math.floor(s * 0.94);
    } while (true);
    var spS = sp * (s / size), font = fontStr(fam, s, o.weight), units = [];
    var x = o.align === 'left' ? cx : o.align === 'right' ? cx - total : cx - total / 2;
    var order = chars.map(function (c, i) { return i; });
    var pos = [], acc = x;
    order.forEach(function (i) { pos[i] = acc; acc += widths[i] + spS; });
    if (o.rtl) { // 논리 순서 첫 글자가 오른쪽 끝
      acc = x + total; chars.forEach(function (c, i) { acc -= widths[i]; pos[i] = acc; acc -= spS; });
    }
    chars.forEach(function (c, i) {
      if (!c.trim()) return;
      var px = pos[i], w = widths[i];
      units.push({ layer: o.layer || 'carve', bbox: [px - s * 0.15, cy - s * 0.85, w + s * 0.3, s * 1.5],
        draw: function (ctx) { ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(c, px, cy); } });
    });
    units.size = s; units.width = total;
    return units;
  }
  // 세로(아래→위) 오검: 줄기선이 cx 위치
  function oghamUnits(str, size, cx, cy, maxLen) {
    var chars = Array.from(str), s = size, widths, total;
    do { mctx.font = fontStr(FONT.ogham, s); widths = chars.map(function (c) { return mctx.measureText(c).width; });
      total = widths.reduce(function (a, b) { return a + b; }, 0); if (total <= maxLen || s <= 10) break; s = Math.floor(s * 0.94); } while (true);
    var font = fontStr(FONT.ogham, s), m; mctx.font = font; m = mctx.measureText('ᚐ');
    var base = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2, units = [], acc = cy + total / 2;
    // 줄기선(모서리) 자체도 한 단위로 먼저 새김
    units.push({ layer: 'carve', bbox: [cx - 4, cy - total / 2 - s * 0.2, 8, total + s * 0.4],
      draw: function (ctx) { ctx.fillRect(cx - Math.max(1, s * 0.03), cy - total / 2 - s * 0.15, Math.max(2, s * 0.06), total + s * 0.3); } });
    chars.forEach(function (c, i) {
      var y0 = acc, w = widths[i]; acc -= w;
      units.push({ layer: 'carve', bbox: [cx - s * 0.75, y0 - w - 2, s * 1.5, w + 4],
        draw: function (ctx) { ctx.save(); ctx.translate(cx, y0); ctx.rotate(-Math.PI / 2); ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(c, 0, base); ctx.restore(); } });
    });
    units.size = s; units.len = total;
    return units;
  }
  // 세로 카르투슈 하나 (위에 칭호 기호, 아래 받침줄). 반환: 단위 목록과 크기
  function cartoucheUnits(glyphStr, sign, cx, top, Wc) {
    var gl = Array.from(glyphStr).filter(function (c) { return c.trim(); });
    // 7자 이상이면 실제 카르투슈처럼 두 줄로 묶어 쌓음 (왼→오, 위→아래)
    var cols = gl.length > 6 ? 2 : 1, rows = Math.ceil(gl.length / cols);
    var g = Wc * (cols === 2 ? 0.27 : 0.3), slot = Wc * 0.4, pad = Wc * 0.2, sw = Math.max(3, Wc * 0.045), headH = Wc * 0.46;
    var len = Math.max(1, rows) * slot + pad * 2, x = cx - Wc / 2, y = top + headH, units = [];
    var signUnits = textUnits(sign, FONT.hiero, g * 0.9, cx, top + headH * 0.42, Wc * 1.2);
    units.push.apply(units, signUnits);
    units.push({ layer: 'paint', bbox: [x - sw - 4, y - sw - 4, Wc + sw * 2 + 8, len + Wc * 0.2 + sw * 2 + 8], draw: function (ctx) {
      ctx.save(); ctx.lineWidth = sw; ctx.strokeStyle = '#fff'; rrPath(ctx, x, y, Wc, len, Wc / 2); ctx.stroke();
      ctx.lineCap = 'round'; ctx.beginPath(); var by = y + len + sw / 2 + Wc * 0.035 + sw / 2; ctx.moveTo(cx - Wc * 0.567, by); ctx.lineTo(cx + Wc * 0.567, by); ctx.stroke(); ctx.restore(); } });
    gl.forEach(function (c, i) {
      var row = cols === 2 ? Math.floor(i / 2) : i, gx = cols === 2 ? cx + (i % 2 ? 1 : -1) * Wc * 0.19 : cx;
      if (cols === 2 && i === gl.length - 1 && i % 2 === 0) gx = cx; // 홀수 개면 마지막은 가운데
      var gy = y + pad + row * slot + slot / 2;
      units.push({ layer: 'carve', bbox: [gx - slot / 2 - 4, gy - slot / 2 - 4, slot + 8, slot + 8], draw: function (ctx) {
        ctx.font = fontStr(FONT.hiero, g); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c, gx, gy); } });
    });
    return { units: units, height: headH + len + Wc * 0.1 + sw * 2, bottom: y + len + Wc * 0.1 + sw * 2 };
  }
  function colHeightFactor(n) { var rows = n > 6 ? Math.ceil(n / 2) : Math.max(1, n); return 0.46 + rows * 0.4 + 0.4 + 0.1 + 0.09; }
  // 두 카르투슈(왼쪽 즉위명, 오른쪽 탄생명)
  function twoCartouches(titleHiero, nameHiero, rect, o) {
    o = o || {};
    var n1 = Array.from(titleHiero || '').filter(function (c) { return c.trim(); }).length;
    var n2 = Array.from(nameHiero || '').filter(function (c) { return c.trim(); }).length;
    if (o.empty) { n1 = n2 = 3; }
    var labelH = o.labelSize ? o.labelSize * 2 : 0, nmax = Math.max(n1, n2);
    var Wc = Math.min(rect.w * 0.3, o.maxWc || 1e9, (rect.h - labelH) / colHeightFactor(nmax));
    var blockH = Wc * colHeightFactor(nmax) + labelH, top = rect.y + (rect.h - blockH) / 2;
    var gap = Wc * 0.95, cxL = rect.x + rect.w / 2 - gap, cxR = rect.x + rect.w / 2 + gap;
    var L = cartoucheUnits(o.empty ? '' : titleHiero, TITLE_SIGN.prenomen, cxL, top, Wc);
    var R = cartoucheUnits(o.empty ? '' : nameHiero, TITLE_SIGN.nomen, cxR, top, Wc);
    var units = L.units.concat(R.units);
    var labelY = top + Wc * colHeightFactor(nmax) + labelH * 0.5;
    if (o.labelSize && o.labels) {
      units = units.concat(textUnits(o.labels[0], 'Noto Sans KR', o.labelSize, cxL, labelY, Wc * 2, { weight: 500 }),
        textUnits(o.labels[1], 'Noto Sans KR', o.labelSize, cxR, labelY, Wc * 2, { weight: 500 }));
    }
    return { units: units, Wc: Wc, cxL: cxL, cxR: cxR, top: top, height: blockH, labelY: labelY };
  }

  // 무대 앞면 내용: 문자별
  function faceUnits(key, res, title, W, H, o) {
    o = o || {};
    if (key === 'hiero' || key === 'all') return twoCartouches(title && title.hiero, res && res.hiero, { x: W * 0.05, y: H * 0.05, w: W * 0.9, h: H * 0.9 }, o).units;
    if (key === 'ogham') return oghamUnits(res.ogham, W * 0.3, W / 2, H / 2, H * 0.88);
    var size = H * (key === 'ugaritic' ? 0.26 : 0.32);
    return textUnits(res[key], FONT[key], size, W / 2, H / 2, W * 0.84,
      { rtl: key === 'phoenician', spacing: key === 'ugaritic' ? 0.14 : key === 'runic' ? 0.07 : 0 });
  }

  function renderMasks(units, W, H) {
    var c = mk(W, H), p = mk(W, H), cc = c.getContext('2d'), pc = p.getContext('2d');
    cc.fillStyle = pc.fillStyle = '#fff';
    units.forEach(function (u) { u.draw(u.layer === 'paint' ? pc : cc); });
    return { carve: c, paint: p };
  }
  function tint(mask, color, alpha) {
    var c = mk(mask.width, mask.height), x = c.getContext('2d');
    x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-in'; x.globalAlpha = alpha == null ? 1 : alpha; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function rimOf(mask, dx, dy) { var c = mk(mask.width, mask.height), x = c.getContext('2d'); x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'destination-out'; x.drawImage(mask, dx, dy); return c; }
  function inner(mask, r) { var c = mk(mask.width, mask.height), x = c.getContext('2d'); x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, r, r); x.drawImage(mask, -r, -r); return c; }
  // 음각 합성: 채움 → 왼쪽 위 어두운 안쪽 그림자 → 오른쪽 아래 밝은 하이라이트 → (룬) 붉은 안료 / (금) 칠
  function composite(ctx, masks, mat, rim) {
    var M = MATS[mat], r = rim || 2;
    if (M.ink) { ctx.drawImage(tint(masks.carve, M.engrave), 0, 0); ctx.drawImage(tint(masks.paint, M.paint), 0, 0); return; }
    [['carve', M.pigment], ['paint', M.paint]].forEach(function (L) {
      var m = masks[L[0]];
      ctx.drawImage(tint(m, M.engrave), 0, 0);
      ctx.drawImage(tint(rimOf(m, r, r), darken(M.engrave, 0.6)), 0, 0);
      ctx.drawImage(tint(rimOf(m, -r, -r), '#ffffff', 0.35), 0, 0);
      if (L[1]) ctx.drawImage(tint(inner(m, r), L[1], 0.92), 0, 0);
    });
  }

  // 3D용 노멀 맵: 기본 질감 노멀 + 음각(마스크 흐림 → 기울기)
  function carvedNormal(baseN, masks, depth) {
    var W = baseN.width, H = baseN.height, u = mk(W, H), ux = u.getContext('2d');
    ux.filter = 'blur(1.5px)'; ux.drawImage(masks.carve, 0, 0); ux.drawImage(masks.paint, 0, 0); ux.filter = 'none';
    var A = ux.getImageData(0, 0, W, H).data, out = mk(W, H), ox = out.getContext('2d');
    ox.drawImage(baseN, 0, 0); var img = ox.getImageData(0, 0, W, H), D = img.data, k = depth || 3;
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var i = (y * W + x) * 4;
      var dx = (A[i + 4 + 3] - A[i - 4 + 3]) / 255, dy = (A[i + W * 4 + 3] - A[i - W * 4 + 3]) / 255;
      if (dx === 0 && dy === 0) continue;
      // 높이 = -마스크 → 법선 x = +dx, y(이미지 아래 방향 뒤집음) = -dy
      var nx = (D[i] / 255 * 2 - 1) + dx * k, ny = (D[i + 1] / 255 * 2 - 1) - dy * k, nz = (D[i + 2] / 255 * 2 - 1);
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      D[i] = (nx / l * 0.5 + 0.5) * 255; D[i + 1] = (ny / l * 0.5 + 0.5) * 255; D[i + 2] = (nz / l * 0.5 + 0.5) * 255;
    }
    ox.putImageData(img, 0, 0);
    return out;
  }

  // 앞면 텍스처 세트 (3D·2D 공용). base(빈 판) / full(다 새긴 판)
  function buildFace(key, res, title, mat, W, H, tex, o) {
    o = o || {};
    var units = (o.empty || !res) ? faceUnits(key, res, title, W, H, { empty: true }) : faceUnits(key, res, title, W, H, o);
    var base = mk(W, H), bx = base.getContext('2d');
    bx.beginPath(); bx.rect(0, 0, W, H); fillStone(bx, mat, tex, W / 1024);
    var masks = renderMasks(units, W, H), full = mk(W, H), fx = full.getContext('2d');
    fx.drawImage(base, 0, 0); composite(fx, masks, mat, Math.max(1, Math.round(W / 512)));
    var res3 = { base: base, full: full, units: units, masks: masks, W: W, H: H };
    if (o.normals) {
      var bn = mk(W, H), bnx = bn.getContext('2d'); bnx.beginPath(); bnx.rect(0, 0, W, H);
      if (tex && tex.normal) { bnx.fillStyle = pattern(bnx, tex.normal, MATS[mat].tile * (W / 1024)); bnx.fill(); bnx.fillStyle = 'rgba(128,128,255,0.45)'; bnx.fill(); } else { bnx.fillStyle = '#8080ff'; bnx.fill(); }
      res3.baseN = bn; res3.fullN = carvedNormal(bn, masks, 4);
    }
    return res3;
  }

  // 2D 판 그리기 (대체 화면 · 미리보기). 판은 cw×ch 캔버스 안 가운데
  var SLAB = { hiero: [1.3, 1], all: [1.3, 1], roman: [2, 1], greek: [2, 1], runic: [1.5, 1], phoenician: [1.5, 1], ugaritic: [1.5, 1], ogham: [0.62, 2] };
  function slabRadius(mat, w) { return mat === 'clay' ? w * 0.09 : mat === 'granite' ? w * 0.14 : mat === 'marble' ? w * 0.015 : w * 0.03; }
  function drawStage2D(canvas, key, res, title, mat, tex, o) {
    o = o || {};
    var ctx = canvas.getContext('2d'), CW = canvas.width, CH = canvas.height, ar = SLAB[key];
    ctx.clearRect(0, 0, CW, CH);
    var maxW = CW * 0.86, maxH = CH * 0.84, w = Math.min(maxW, maxH * ar[0] / ar[1]), h = w * ar[1] / ar[0];
    var x = (CW - w) / 2, y = (CH - h) / 2 - CH * 0.01, r = slabRadius(mat, w);
    if (key === 'ogham') { h = maxH; w = h * ar[0] / ar[1]; x = (CW - w) / 2; y = (CH - h) / 2; r = 4; }
    var fw = Math.round(key === 'ogham' ? 800 : 1024), fh = Math.round(fw * h / w);
    var face = buildFace(key, res, title, mat, fw, fh, tex, o);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowOffsetY = CH * 0.03; ctx.shadowBlur = CH * 0.06;
    rrPath(ctx, x, y, w, h, r); ctx.fillStyle = MATS[mat].base; ctx.fill(); ctx.restore();
    ctx.save(); rrPath(ctx, x, y, w, h, r); ctx.clip(); ctx.drawImage(face.full, x, y, w, h);
    if (key === 'ogham') { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x + w / 2, y, w / 2, h); ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fillRect(x, y, w / 2, h); }
    ctx.restore();
    edgeShade(ctx, x, y, w, h, r, mat, CW / 1000);
    return { x: x, y: y, w: w, h: h };
  }

  root.Engrave = { MATS: MATS, SCRIPT_MAT: SCRIPT_MAT, FONT: FONT, TITLE_SIGN: TITLE_SIGN, SLAB: SLAB, matFor: matFor, loadTex: loadTex, mk: mk,
    rrPath: rrPath, fillStone: fillStone, edgeShade: edgeShade, pattern: pattern, textUnits: textUnits, oghamUnits: oghamUnits,
    twoCartouches: twoCartouches, cartoucheUnits: cartoucheUnits, faceUnits: faceUnits, renderMasks: renderMasks, composite: composite,
    buildFace: buildFace, drawStage2D: drawStage2D, slabRadius: slabRadius };
})(typeof self !== 'undefined' ? self : this);
