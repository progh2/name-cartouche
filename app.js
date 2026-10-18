(function () {
  'use strict';
  var C = window.NameConvert;
  var SITE_URL = 'https://progh2.github.io/name-cartouche/';
  var DEFAULT_NAME = '홍길동', STORE_KEY = 'name-cartouche:last';
  function loadSaved() { try { return localStorage.getItem(STORE_KEY) || ''; } catch (e) { return ''; } }
  function saveName(n) { try { localStorage.setItem(STORE_KEY, n); } catch (e) {} }
  var COL = { bg: '#F2E6C9', card: '#FBF5E6', cardBorder: '#E3D3AE', sand: '#D9C49A', gold: '#C9A227',
    goldDark: '#9C7A1A', text: '#3B2F1E', muted: '#7A6A4F' };
  var KEYS = C.SCRIPT_KEYS;
  var S = {
    roman:      { tab: '로마자',   label: '로마자',         font: 'Noto Serif', dir: '→ 왼쪽부터' },
    greek:      { tab: '그리스어', label: '그리스 문자',     font: 'Noto Serif', dir: '→ 왼쪽부터' },
    hiero:      { tab: '상형문자', label: '이집트 상형문자', font: 'Noto Sans Egyptian Hieroglyphs', dir: '↓ 위부터' },
    runic:      { tab: '룬',       label: '룬 문자',         font: 'Noto Sans Runic', dir: '→ 왼쪽부터', approx: true },
    phoenician: { tab: '페니키아', label: '페니키아 문자',   font: 'Noto Sans Phoenician', dir: '← 오른쪽부터', approx: true, rtl: true },
    ugaritic:   { tab: '쐐기',     label: '쐐기 문자 (우가리트)', font: 'Noto Sans Ugaritic', dir: '→ 왼쪽부터', approx: true },
    ogham:      { tab: '오검',     label: '오검 문자',       font: 'Noto Sans Ogham', dir: '↑ 아래부터 · 화면에선 →', approx: true }
  };
  var TABS = KEYS.concat(['all']);
  var $ = function (id) { return document.getElementById(id); };
  var state = { res: null, tab: 'hiero' };
  var fontOK = {};

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  // 글꼴 로드 확인 (미로드면 '—' 표시 후 로드되면 다시 그림)
  function loadFont(key, text) {
    var f = S[key].font;
    if (fontOK[f]) return Promise.resolve(true);
    if (!document.fonts) return Promise.resolve(true);
    return document.fonts.load('28px "' + f + '"', text || 'a').then(function (list) {
      var ok = list.length > 0 && document.fonts.check('28px "' + f + '"', text || 'a');
      if (ok) fontOK[f] = true; return ok;
    }, function () { return false; });
  }
  function loadAll(res) {
    return Promise.all(KEYS.map(function (k) { return loadFont(k, res[k]); })
      .concat(document.fonts ? ['500 56px "Noto Sans KR"', '600 32px "Noto Serif KR"', '400 26px "Noto Sans KR"'].map(function (f) {
        return document.fonts.load(f, '가' + res.korean).catch(function () {});
      }) : []));
  }

  /* ---------- 카르투슈 기하 (1차 지침: 폭 120, 슬롯 48, 위아래 24, 6자 초과 가로) ---------- */
  function geometry(n, o) {
    o = o || {};
    var k = (o.W || 120) / 120, W = 120 * k, slot = 48 * k, pad = 24 * k, SW = 3 * k, GAP = 4 * k, BAR = W + 16 * k;
    var vertical = n <= 6, L = n * slot + pad * 2;
    var cw = vertical ? W : L, ch = vertical ? L : W;
    var w = vertical ? Math.max(BAR, cw + SW) + SW : cw + SW + GAP + SW * 1.5;
    var h = vertical ? ch + SW + GAP + SW * 1.5 : Math.max(BAR, ch + SW) + SW;
    var x = vertical ? (w - cw) / 2 : SW / 2 + 1, y = vertical ? SW / 2 + 1 : (h - ch) / 2;
    var glyphs = [];
    for (var i = 0; i < n; i++) glyphs.push(vertical ? { x: x + cw / 2, y: y + pad + i * slot + slot / 2 } : { x: x + pad + i * slot + slot / 2, y: y + ch / 2 });
    var bar = vertical
      ? { x1: (w - BAR) / 2, y1: y + ch + SW / 2 + GAP + SW / 2, x2: (w + BAR) / 2, y2: y + ch + SW / 2 + GAP + SW / 2 }
      : { x1: x + cw + SW / 2 + GAP + SW / 2, y1: (h - BAR) / 2, x2: x + cw + SW / 2 + GAP + SW / 2, y2: (h + BAR) / 2 };
    return { vertical: vertical, w: w, h: h, x: x, y: y, cw: cw, ch: ch, r: W / 2, sw: SW, glyph: (o.glyph || 36), glyphs: glyphs, bar: bar };
  }
  function glyphList(s) { return Array.from(s).filter(function (c) { return c.trim(); }); }

  function cartoucheSVG(res) {
    var gl = glyphList(res.hiero), g = geometry(gl.length);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + g.w + '" height="' + g.h + '" viewBox="0 0 ' + g.w + ' ' + g.h +
      '" role="img" aria-label="' + esc(res.roman) + '">';
    s += '<rect x="' + g.x + '" y="' + g.y + '" width="' + g.cw + '" height="' + g.ch + '" rx="' + g.r + '" fill="' + COL.card +
      '" stroke="' + COL.goldDark + '" stroke-width="' + g.sw + '"/>';
    s += '<line x1="' + g.bar.x1 + '" y1="' + g.bar.y1 + '" x2="' + g.bar.x2 + '" y2="' + g.bar.y2 + '" stroke="' + COL.goldDark + '" stroke-width="3" stroke-linecap="round"/>';
    gl.forEach(function (c, i) {
      s += '<text x="' + g.glyphs[i].x + '" y="' + g.glyphs[i].y + '" font-family="Noto Sans Egyptian Hieroglyphs" font-size="36" fill="' + COL.text +
        '" text-anchor="middle" dominant-baseline="central" aria-hidden="true">' + c + '</text>';
    });
    return s + '</svg>';
  }

  /* ---------- 화면 ---------- */
  function buildTabs() {
    $('tabs').innerHTML = TABS.map(function (k) {
      return '<button type="button" class="chip" role="tab" id="tab-' + k + '" data-tab="' + k + '" aria-selected="' + (k === state.tab) +
        '" aria-controls="cards">' + (k === 'all' ? '전체' : S[k].tab) + '</button>';
    }).join('');
    $('tabs').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) selectTab(b.dataset.tab); });
    $('tabs').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = TABS.indexOf(state.tab) + (e.key === 'ArrowRight' ? 1 : -1);
      selectTab(TABS[(i + TABS.length) % TABS.length]); $('tab-' + state.tab).focus();
    });
  }
  function selectTab(k) {
    state.tab = k;
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) { b.setAttribute('aria-selected', b.dataset.tab === k); });
    var chip = $('tab-' + k), wrap = $('tabs');
    var left = chip.offsetLeft - wrap.offsetLeft, right = left + chip.offsetWidth;
    if (left < wrap.scrollLeft) wrap.scrollLeft = left - 8;
    else if (right > wrap.scrollLeft + wrap.clientWidth - 24) wrap.scrollLeft = right - wrap.clientWidth + 32;
    render();
  }

  function cardHTML(k, res, big) {
    var has = res && res.syllables.length, v = has ? res[k] : '';
    var ready = has && (k === 'roman' || fontOK[S[k].font]);
    var dir = S[k].dir;
    if (k === 'hiero' && has) dir = glyphList(res.hiero).length > 6 ? '→ 왼쪽부터' : '↓ 위부터';
    var val;
    if (!ready) val = '<div class="value empty">—</div>';
    else {
      var inner = k === 'ogham' ? '<span class="ogham-line">' + esc(v) + '</span>' : esc(v);
      var aria = k === 'roman' ? '' : ' aria-label="' + esc(S[k].label + ', 읽기: ' + res.roman) + '"';
      val = '<div class="value f-' + k + '"' + aria + (S[k].rtl ? ' dir="rtl"' : '') + '>' + inner + '</div>';
    }
    var cart = (big && k === 'hiero' && ready) ? '<div class="cartouche">' + cartoucheSVG(res) + '</div>' : '';
    return '<article class="card" data-script="' + k + '"><div class="label"><span>' + S[k].label + '</span><span class="dir">' + dir +
      '</span></div>' + val + cart + (S[k].approx ? '<div class="approx">소리 근사</div>' : '') + '</article>';
  }

  function render() {
    var res = state.res, has = !!(res && res.syllables.length);
    var keys = state.tab === 'all' ? KEYS : [state.tab];
    $('cards').className = 'cards' + (state.tab === 'all' ? ' all' : '');
    $('cards').setAttribute('aria-labelledby', 'tab-' + state.tab);
    $('cards').innerHTML = keys.map(function (k) { return cardHTML(k, res, state.tab !== 'all'); }).join('');
    ['btn-png', 'btn-copy', 'btn-feed', 'btn-story'].forEach(function (id) { $(id).disabled = !has; });
    $('table-wrap').hidden = !has;
    var col = (state.tab === 'all' || state.tab === 'roman') ? 'hiero' : state.tab;
    $('th-script').textContent = col === 'hiero' ? '상형' : S[col].tab;
    if (has) {
      var colReady = col === 'roman' || fontOK[S[col].font];
      $('syl-body').innerHTML = res.syllables.map(function (r) {
        var cell = colReady ? esc(r[col]) : '—';
        return '<tr><td class="k">' + esc(r.syllable) + '</td><td class="serif">' + esc(r.roman) + '</td>' +
          '<td class="s f-' + col + '"' + (colReady ? ' aria-label="' + esc(r.roman) + '"' : '') + (S[col].rtl ? ' dir="rtl"' : '') + '>' + cell + '</td>' +
          '<td class="note">' + esc([r.cho, r.jung, r.jong || '∅'].join('·')) + '</td></tr>';
      }).join('');
      // 아직 안 불러온 글꼴이 있으면 로드 후 다시 그림
      var pending = keys.concat([col]).filter(function (k) { return k !== 'roman' && !fontOK[S[k].font]; });
      if (pending.length) Promise.all(pending.map(function (k) { return loadFont(k, res[k]); })).then(function (oks) {
        if (oks.some(Boolean) && state.res === res) render();
      });
    }
    var w = $('warn');
    if (res && !has) { w.hidden = false; w.textContent = '한글 음절로 된 이름을 입력해 주세요.'; }
    else if (has && res.ignored.length) { w.hidden = false; w.textContent = '한글이 아닌 글자는 빼고 옮겼어요: ' + res.ignored.join(' '); }
    else w.hidden = true;
  }

  // opts.save: 마지막 이름 저장, opts.url: 주소에 ?n= 반영
  function convertNow(name, opts) {
    opts = opts || { save: true, url: true };
    state.res = C.convert(name);
    if (opts.save && state.res.syllables.length) saveName(name.trim());
    if (opts.url) try {
      var u = new URL(location.href);
      if (state.res.syllables.length) u.searchParams.set('n', name.trim()); else u.searchParams.delete('n');
      history.replaceState(null, '', u);
    } catch (e) {}
    render();
  }

  var toastTimer;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }
  function copyText() {
    var res = state.res; if (!res) return;
    var text = state.tab === 'all'
      ? res.korean + '\n' + KEYS.map(function (k) { return S[k].label + ': ' + res[k]; }).join('\n')
      : res.korean + '\n' + res.roman + (state.tab === 'roman' ? '' : '\n' + res[state.tab]);
    var done = function () { toast('복사했어요'); };
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('복사에 실패했어요'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }

  /* ---------- 캔버스 공통 ---------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fam(k) { return '"' + S[k].font + '"'; }
  function fit(ctx, text, family, size, maxW, weight) {
    var s = size;
    do { ctx.font = (weight || 400) + ' ' + s + 'px ' + family; if (ctx.measureText(text).width <= maxW) break; s -= 2; } while (s > 12);
    return s;
  }
  function drawCartouche(ctx, glyphStr, cx, cy, W, glyph, maxW, maxH) {
    var gl = glyphList(glyphStr), g = geometry(gl.length, { W: W, glyph: glyph });
    var sc = Math.min(1, maxW / g.w, maxH / g.h);
    ctx.save(); ctx.translate(cx - g.w * sc / 2, cy - g.h * sc / 2); ctx.scale(sc, sc);
    rr(ctx, g.x, g.y, g.cw, g.ch, g.r); ctx.fillStyle = COL.card; ctx.fill(); ctx.lineWidth = g.sw; ctx.strokeStyle = COL.goldDark; ctx.stroke();
    ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineWidth = g.sw; ctx.moveTo(g.bar.x1, g.bar.y1); ctx.lineTo(g.bar.x2, g.bar.y2); ctx.stroke();
    ctx.fillStyle = COL.text; ctx.font = glyph + 'px ' + fam('hiero'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    gl.forEach(function (c, i) { ctx.fillText(c, g.glyphs[i].x, g.glyphs[i].y); });
    ctx.restore();
    return g.h * sc;
  }
  function hieroSize(glyphStr, W, glyph, maxW, maxH) {
    var g = geometry(glyphList(glyphStr).length, { W: W, glyph: glyph }); return g.h * Math.min(1, maxW / g.w, maxH / g.h);
  }
  // 오검: 줄기선 + 문자. vertical이면 아래→위
  function drawOgham(ctx, text, cx, cy, size, maxLen, vertical, lineW) {
    var s = fit(ctx, text, fam('ogham'), size, maxLen);
    ctx.save(); ctx.translate(cx, cy); if (vertical) ctx.rotate(-Math.PI / 2);
    ctx.font = s + 'px ' + fam('ogham'); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var m = ctx.measureText('ᚐ'), base = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    var w = ctx.measureText(text).width;
    ctx.strokeStyle = COL.goldDark; ctx.lineWidth = lineW || 1.5; ctx.beginPath(); ctx.moveTo(-w / 2 - s * 0.15, 0); ctx.lineTo(w / 2 + s * 0.15, 0); ctx.stroke();
    ctx.fillStyle = COL.text; ctx.fillText(text, 0, base);
    ctx.restore();
    return vertical ? w : s;
  }
  function drawScriptLine(ctx, k, text, x, y, size, maxW, align) { // y = 가운데
    var family = fam(k), s = fit(ctx, text, family, size, maxW);
    ctx.save(); ctx.fillStyle = COL.text; ctx.textBaseline = 'middle'; ctx.textAlign = align || 'center';
    ctx.direction = S[k].rtl ? 'rtl' : 'ltr';
    if (k === 'phoenician' && align === 'left') { ctx.textAlign = 'right'; x = x + maxW; }
    if (k === 'runic' || k === 'ugaritic') { var sp = k === 'ugaritic' ? 4 : 2; if ('letterSpacing' in ctx) ctx.letterSpacing = (sp * s / 28) + 'px'; }
    ctx.fillText(text, x, y); ctx.restore();
    return s;
  }
  function frame(ctx, W, H) {
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    rr(ctx, 40, 40, W - 80, H - 80, 24); ctx.lineWidth = 4; ctx.strokeStyle = COL.gold; ctx.stroke();
  }
  function text(ctx, t, x, y, font, color, align, base) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'alphabetic'; ctx.fillText(t, x, y);
  }
  function rosetta(ctx, W, H, size, bottom, withUrl) {
    var y = H - bottom;
    ctx.fillStyle = COL.sand; ctx.fillRect(W / 2 - 100, y - size - 28, 200, 2);
    text(ctx, '로제타석처럼, 한 이름을 세 문자로.', W / 2, y, '400 ' + size + 'px "Noto Sans KR"', COL.muted);
    if (withUrl) text(ctx, SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), W / 2, y + 36, '400 18px "Noto Sans KR"', COL.muted);
  }

  // 주인공 높이/그리기 (가로 문자 size, 쐐기 작게, 상형 카르투슈, 오검 세로)
  function heroMeasure(k, res, o, maxW) {
    if (k === 'hiero') return hieroSize(res.hiero, o.cartW, o.cartW * 72 / 260, maxW, o.oghamMax);
    if (k === 'ogham') { var c = document.createElement('canvas').getContext('2d'); fit(c, res.ogham, fam('ogham'), o.size, o.oghamMax); return c.measureText(res.ogham).width; }
    return (k === 'ugaritic' ? o.cune : o.size) * 1.3;
  }
  function heroDraw(ctx, k, res, o, cx, top, h, maxW) {
    var cy = top + h / 2;
    if (k === 'hiero') return drawCartouche(ctx, res.hiero, cx, cy, o.cartW, o.cartW * 72 / 260, maxW, o.oghamMax);
    if (k === 'ogham') return drawOgham(ctx, res.ogham, cx, cy, o.size, o.oghamMax, true, 3);
    drawScriptLine(ctx, k, res[k], cx, cy, k === 'ugaritic' ? o.cune : o.size, maxW);
  }

  function feedCard(res, k) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'); frame(ctx, W, H);
    var maxW = W - 192;
    text(ctx, S[k].label, W / 2, 140, '600 32px "Noto Serif KR"', COL.goldDark, 'center', 'top');
    var o = { size: 120, cune: 96, cartW: 260, oghamMax: 600 };
    var hh = heroMeasure(k, res, o, maxW);
    var block = hh + 64 + 56 + 16 + 36, top = (H - block) / 2;
    heroDraw(ctx, k, res, o, W / 2, top, hh, maxW);
    var y = top + hh + 64;
    text(ctx, res.korean, W / 2, y, '500 56px "Noto Sans KR"', COL.text, 'center', 'top');
    text(ctx, res.roman, W / 2, y + 56 + 16, '400 36px "Noto Serif"', COL.muted, 'center', 'top');
    rosetta(ctx, W, H, 26, 110, true);
    return cv;
  }
  function storyCard(res, k) {
    var W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'); frame(ctx, W, H);
    var maxW = W - 192, areaTop = 250, areaH = 1330;
    var o = { size: 140, cune: 112, cartW: 300, oghamMax: 800 };
    var fixed = 36 + 80 + 80 + 64 + 48 + 40 + 48 + 28;
    var hh = Math.min(heroMeasure(k, res, o, maxW), areaH - fixed);
    o.oghamMax = Math.min(800, areaH - fixed);
    var top = areaTop + (areaH - (fixed + hh)) / 2, y = top;
    text(ctx, S[k].label, W / 2, y, '600 36px "Noto Serif KR"', COL.goldDark, 'center', 'top'); y += 36 + 80;
    heroDraw(ctx, k, res, o, W / 2, y, hh, maxW); y += hh + 80;
    text(ctx, res.korean, W / 2, y, '500 64px "Noto Sans KR"', COL.text, 'center', 'top'); y += 64 + 48;
    text(ctx, res.roman, W / 2, y, '400 40px "Noto Serif"', COL.muted, 'center', 'top'); y += 40 + 48;
    text(ctx, '로제타석처럼, 한 이름을 세 문자로.', W / 2, y, '400 28px "Noto Sans KR"', COL.muted, 'center', 'top');
    return cv;
  }
  function allCard(res, story) {
    var W = 1080, H = story ? 1920 : 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'); frame(ctx, W, H);
    var rowH = story ? 150 : 120, size = story ? 56 : 48, x0 = 96, valX = x0 + 220, valW = W - 96 - valX;
    var tableH = rowH * KEYS.length, headH = 64 + 16 + 32;
    var top = story ? 250 + (1330 - (headH + 48 + tableH + 48 + 28)) / 2 : 120;
    text(ctx, res.korean, W / 2, top, '500 64px "Noto Sans KR"', COL.text, 'center', 'top');
    text(ctx, res.roman, W / 2, top + 64 + 16, '400 32px "Noto Serif"', COL.muted, 'center', 'top');
    var ty = top + headH + 48;
    KEYS.forEach(function (k, i) {
      var cy = ty + i * rowH + rowH / 2;
      if (i) { ctx.fillStyle = COL.cardBorder; ctx.fillRect(x0, ty + i * rowH, W - 192, 1); }
      text(ctx, S[k].tab === '쐐기' ? '쐐기(우가리트)' : S[k].tab, x0, cy, '400 26px "Noto Sans KR"', COL.muted, 'left', 'middle');
      if (k === 'ogham') {
        var tmp = ctx; var s = fit(tmp, res.ogham, fam('ogham'), size, valW);
        tmp.font = s + 'px ' + fam('ogham'); var w = tmp.measureText(res.ogham).width;
        drawOgham(ctx, res.ogham, valX + w / 2, cy, s, valW, false, 1.5);
      } else drawScriptLine(ctx, k, res[k], valX, cy, k === 'ugaritic' ? Math.round(size * 0.85) : size, valW, 'left');
    });
    if (story) text(ctx, '로제타석처럼, 한 이름을 세 문자로.', W / 2, ty + tableH + 48, '400 28px "Noto Sans KR"', COL.muted, 'center', 'top');
    else rosetta(ctx, W, H, 26, 110, true);
    return cv;
  }

  // PNG 저장 (1차 지침 1080×1350 카르투슈 포스터)
  function posterCard(res) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'); ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    var g = geometry(glyphList(res.hiero).length), sc = Math.min(2.4, (W - 160) / g.w, 800 / g.h);
    drawCartouche(ctx, res.hiero, W / 2, 80 + 400, 120 * sc, 36 * sc, W - 160, 800);
    text(ctx, res.korean, W / 2, 1000, '500 40px "Noto Sans KR"', COL.text);
    text(ctx, res.roman, W / 2, 1066, '400 32px "Noto Serif"', COL.text);
    text(ctx, res.greek, W / 2, 1122, '400 32px "Noto Serif"', COL.text);
    text(ctx, '로제타석처럼, 한 이름을 세 문자로.', W / 2, 1280, '400 24px "Noto Sans KR"', COL.muted);
    return cv;
  }

  function download(cv, name) {
    cv.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, 'image/png');
  }
  function fileBase() { return state.res.roman.replace(/\s+/g, '_'); }

  var sheetCanvas = null, sheetName = '', lastFocus = null;
  function openSheet(kind) {
    var res = state.res; if (!res) return;
    loadAll(res).then(function () {
      var k = state.tab;
      sheetCanvas = k === 'all' ? allCard(res, kind === 'story') : (kind === 'story' ? storyCard(res, k) : feedCard(res, k));
      sheetName = 'cartouche-' + kind + '-' + k + '-' + fileBase() + '.png';
      $('sheet-img').src = sheetCanvas.toDataURL('image/png');
      $('sheet-img').alt = (kind === 'story' ? '인스타 스토리' : '인스타 피드') + ' 카드 미리보기: ' + res.korean + ' (' + res.roman + ')';
      lastFocus = document.activeElement; $('sheet').hidden = false; $('sheet-save').focus();
    });
  }
  function closeSheet() { $('sheet').hidden = true; if (lastFocus) lastFocus.focus(); }

  /* ---------- 이벤트 ---------- */
  buildTabs();
  $('form').addEventListener('submit', function (e) { e.preventDefault(); convertNow($('name').value); });
  $('btn-copy').addEventListener('click', copyText);
  $('btn-png').addEventListener('click', function () {
    if (!state.res) return; loadAll(state.res).then(function () { download(posterCard(state.res), 'cartouche-' + fileBase() + '.png'); });
  });
  $('btn-feed').addEventListener('click', function () { openSheet('feed'); });
  $('btn-story').addEventListener('click', function () { openSheet('story'); });
  $('sheet-save').addEventListener('click', function () { if (sheetCanvas) download(sheetCanvas, sheetName); });
  $('sheet').addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });

  render();
  // 첫 이름 우선순위: ?n= > 저장된 이름 > 홍길동
  var q = null; try { q = new URL(location.href).searchParams.get('n'); } catch (e) {}
  if (q && q.trim()) { $('name').value = q; convertNow(q, { save: true, url: false }); }
  else { var first = loadSaved() || DEFAULT_NAME; $('name').value = first; convertNow(first, { save: false, url: false }); }
  window.__cartouche = { geometry: geometry, state: state, feedCard: feedCard, storyCard: storyCard, allCard: allCard, posterCard: posterCard, loadAll: loadAll, selectTab: selectTab };
})();
