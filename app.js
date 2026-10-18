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
  var LABELS = ['즉위명 · 칭호', '탄생명 · 내 이름'];
  var E = window.Engrave;
  var MAT_KEY = 'name-cartouche:hieroMat', INFO_KEY = 'name-cartouche:infoAutoOpened';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var $ = function (id) { return document.getElementById(id); };
  var state = { res: null, tab: 'hiero', title: null, hieroMat: lsGet(MAT_KEY) === 'papyrus' ? 'papyrus' : 'limestone',
    stage: 'preview', stage3d: null, stageBusy: null, userConverted: false };
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

  function glyphList(s) { return Array.from(s).filter(function (c) { return c.trim(); }); }

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
    updateStage(true); // 탭 전환: 재료 크로스페이드 + 다시 새김
  }

  function cardHTML(k, res, big) {
    var has = res && res.syllables.length, v = has ? res[k] : '';
    var ready = has && (k === 'roman' || fontOK[S[k].font]);
    var dir = S[k].dir;
    if (k === 'hiero') dir = '↓ 위부터 (무대)';
    var val;
    if (!ready) val = '<div class="value empty">—</div>';
    else {
      var inner = k === 'ogham' ? '<span class="ogham-line">' + esc(v) + '</span>' : esc(v);
      var aria = k === 'roman' ? '' : ' aria-label="' + esc(S[k].label + ', 읽기: ' + res.roman) + '"';
      val = '<div class="value f-' + k + '"' + aria + (S[k].rtl ? ' dir="rtl"' : '') + '>' + inner + '</div>';
    }
    var cart = '';
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
    var hieroTab = state.tab === 'hiero' || state.tab === 'all';
    $('hiero-extra').hidden = !(hieroTab && has);
    $('info').hidden = state.tab !== 'hiero';
    if (state.title) { $('title-ko').textContent = state.title.ko; $('title-mean').textContent = '‘' + state.title.meaning + '’ · ' + state.title.roman; }
    Array.prototype.forEach.call(document.querySelectorAll('[data-mat]'), function (b) { b.setAttribute('aria-checked', b.dataset.mat === state.hieroMat); });
    var w = $('warn');
    if (res && !has) { w.hidden = false; w.textContent = '한글 음절로 된 이름을 입력해 주세요.'; }
    else if (has && res.ignored.length) { w.hidden = false; w.textContent = '한글이 아닌 글자는 빼고 옮겼어요: ' + res.ignored.join(' '); }
    else w.hidden = true;
  }

  // opts.save: 마지막 이름 저장, opts.url: 주소에 ?n= 반영
  function convertNow(name, opts) {
    opts = opts || { save: true, url: true };
    state.res = C.convert(name);
    if (!state.title) state.title = C.randomTitle();
    if (opts.save && state.res.syllables.length) saveName(name.trim());
    if (opts.url) try {
      var u = new URL(location.href);
      if (state.res.syllables.length) u.searchParams.set('n', name.trim()); else u.searchParams.delete('n');
      history.replaceState(null, '', u);
    } catch (e) {}
    render();
    if (opts.user && state.res.syllables.length) {
      state.userConverted = true;
      if (!lsGet(INFO_KEY)) { $('info').open = true; lsSet(INFO_KEY, '1'); } // 첫 변환 때 한 번만 자동 펼침
      activateStage().then(function () { updateStage(true); });
    } else if (state.stage !== 'preview') updateStage(true);
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
      : res.korean + '\n' + res.roman + (state.tab === 'roman' ? '' : '\n' + res[state.tab]) +
        (state.tab === 'hiero' && state.title ? '\n즉위명 ' + state.title.ko + ' ' + state.title.hiero : '');
    var done = function () { toast('복사했어요'); };
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('복사에 실패했어요'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }

  /* ---------- 무대: 미리보기 → (첫 변환) 3D 또는 2D ---------- */
  var qs = (function () { try { return new URL(location.href).searchParams; } catch (e) { return new URLSearchParams(''); } })();
  var reducedMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  function stageKey() { return state.tab === 'all' ? 'hiero' : state.tab; }
  function activateStage() {
    if (state.stage !== 'preview') return Promise.resolve();
    if (state.stageBusy) return state.stageBusy;
    var want2d = qs.get('mode') === '2d' || reducedMQ.matches || !webglOK();
    $('stage').classList.add('loading');
    state.stageBusy = (want2d ? Promise.reject(new Error('2d')) : import('./stage3d.js').then(function (m) {
      state.stage3d = m.createStage($('stage-3d'), { reduced: false }); state.stage = '3d';
    })).catch(function () { state.stage = '2d'; }).then(function () {
      $('stage').classList.remove('loading'); $('stage').dataset.mode = state.stage;
      $('stage-preview').hidden = true; $('stage-hint').hidden = true;
      $('stage-2d').hidden = state.stage !== '2d'; $('stage-3d').hidden = state.stage !== '3d';
    });
    return state.stageBusy;
  }
  function stageFonts(key) {
    var res = state.res, p = [loadFont(key === 'roman' ? 'greek' : key, res[key])];
    if (key === 'hiero') p.push(loadFont('hiero', (state.title ? state.title.hiero : '') + E.TITLE_SIGN.prenomen + E.TITLE_SIGN.nomen));
    if (document.fonts) p.push(document.fonts.load('500 22px "Noto Sans KR"', '즉위명'));
    return Promise.all(p).catch(function () {});
  }
  var stageSeq = 0;
  function updateStage(animate) {
    var res = state.res; if (!res || !res.syllables.length || state.stage === 'preview') return Promise.resolve();
    var key = stageKey(), mat = E.matFor(key, state.hieroMat), seq = ++stageSeq;
    var st = $('stage'); st.dataset.script = key; st.dataset.mat = mat;
    var aria = (key === 'hiero' ? '즉위명 ' + state.title.ko + ', 탄생명 ' + res.korean + ' 카르투슈 두 개' : S[key].label + ' ' + res.roman) + '를 ' + E.MATS[mat].name + '에 새긴 모습';
    st.setAttribute('aria-label', aria);
    $('stage-labels').hidden = key !== 'hiero';
    return stageFonts(key).then(function () {
      if (seq !== stageSeq) return;
      if (state.stage === '3d') return state.stage3d.show(key, res, state.title, mat, animate);
      return E.loadTex(mat).then(function (tex) {
        if (seq !== stageSeq) return;
        var c = $('stage-2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.round(st.clientWidth * dpr); c.height = Math.round(st.clientHeight * dpr);
        lastSize = st.clientWidth + 'x' + st.clientHeight;
        E.drawStage2D(c, key, res, state.title, mat, tex);
      });
    }).then(function () { if (seq === stageSeq) st.dataset.ready = '1'; });
  }

  /* ---------- 인스타 · PNG: 재료 질감 위 2D 음각 합성 ---------- */
  function frame(ctx, W, H) {
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    E.rrPath(ctx, 40, 40, W - 80, H - 80, 24); ctx.lineWidth = 4; ctx.strokeStyle = COL.gold; ctx.stroke();
  }
  function slab(ctx, mat, tex, x, y, w, h, r) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowOffsetY = 12; ctx.shadowBlur = 24;
    E.rrPath(ctx, x, y, w, h, r); ctx.fillStyle = E.MATS[mat].base; ctx.fill(); ctx.restore();
    ctx.save(); E.rrPath(ctx, x, y, w, h, r); E.fillStone(ctx, mat, tex, 1, x, y); ctx.restore();
    E.edgeShade(ctx, x, y, w, h, r, mat, 1);
  }
  function engraveOn(ctx, W, H, mat, big, small, clip) {
    ctx.save(); if (clip) { clip(ctx); ctx.clip(); }
    if (big.length) E.composite(ctx, E.renderMasks(big, W, H), mat, 2);
    if (small.length) E.composite(ctx, E.renderMasks(small, W, H), mat, 1);
    ctx.restore();
  }
  function T(str, fam, size, cx, cy, maxW, o) { return E.textUnits(str, fam, size, cx, cy, maxW, o); }
  function rule(x, y, w, h) { return { layer: 'carve', bbox: [x, y, w, h], draw: function (c) { c.fillRect(x, y, w, h); } }; }
  function siteUrl() { return SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''); }
  function scriptOpts(k) { return { rtl: k === 'phoenician', spacing: k === 'ugaritic' ? 0.14 : k === 'runic' ? 0.07 : 0 }; }

  // 주인공 단위 만들기. 반환 {units, h}
  function heroUnits(k, res, cx, top, maxW, maxH, o) {
    if (k === 'hiero') {
      var probe = E.twoCartouches(state.title.hiero, res.hiero, { x: cx - maxW / 2, y: 0, w: maxW, h: maxH }, { labelSize: o.label, labels: LABELS, maxWc: o.cartW });
      var hh = probe.height;
      var t = E.twoCartouches(state.title.hiero, res.hiero, { x: cx - maxW / 2, y: top, w: maxW, h: hh }, { labelSize: o.label, labels: LABELS, maxWc: o.cartW });
      return { units: t.units, h: hh };
    }
    var size = k === 'ugaritic' ? o.cune : o.size;
    var u = T(res[k], E.FONT[k], size, cx, top + size * 0.65, maxW, scriptOpts(k));
    return { units: u, h: size * 1.3 };
  }
  function oghamPillar(ctx, tex, cx, cy, len, size) {
    var w = Math.max(size * 1.9, 150), h = len + size * 1.2, x = cx - w / 2, y = cy - h / 2;
    slab(ctx, 'wood', tex, x, y, w, h, 6);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(cx, y, w / 2, h); ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fillRect(x, y, w / 2, h); ctx.restore();
    return { x: x, y: y, w: w, h: h };
  }

  function storyLayout(H) { return H === 1920; }
  // 피드(1080×1350) / 스토리(1080×1920) 단일 문자 카드
  function singleCard(res, k, story) {
    var W = 1080, H = story ? 1920 : 1350, cv = E.mk(W, H), ctx = cv.getContext('2d'), mat = E.matFor(k, state.hieroMat);
    return E.loadTex(mat).then(function (tex) {
      frame(ctx, W, H);
      var maxW = W - 192, big = [], small = [], ogham = k === 'ogham';
      var o = story ? { size: 140, cune: 112, cartW: 300, oghamMax: 800, label: 22 } : { size: 120, cune: 96, cartW: 260, oghamMax: 600, label: 22 };
      // (카르투슈 폭 260/300은 두 개 나란히 놓으므로 각 0.62배)
      var lab = S[k].label, labS = story ? 36 : 32, korS = story ? 64 : 56, romS = story ? 40 : 36;
      var heroMaxH = story ? 760 : 600, hero, heroH, y, top;
      if (ogham) {
        var probe = E.oghamUnits(res.ogham, 120, 0, 0, o.oghamMax); heroH = probe.len + 120 * 0.2;
      } else { hero = heroUnits(k, res, W / 2, 0, maxW, heroMaxH, o); heroH = hero.h; }
      if (story) {
        var fixed = labS + 80 + 80 + korS + 48 + romS + 48 + 28;
        top = 250 + (1330 - (fixed + heroH)) / 2; y = top;
      } else { top = (H - (heroH + 64 + korS + 16 + romS)) / 2; }
      var labY = story ? top + labS / 2 : 140 + labS / 2, heroTop = story ? top + labS + 80 : top;
      var korY = heroTop + heroH + (story ? 80 : 64) + korS / 2, romY = korY + korS / 2 + (story ? 48 : 16) + romS / 2;
      var rosY = story ? romY + romS / 2 + 48 + 14 : H - 110 - 13;
      var texts = function (arr, sm) {
        arr.push.apply(arr, T(lab, 'Noto Serif KR', labS, W / 2, labY, maxW, { weight: 600 }));
        arr.push.apply(arr, T(res.korean, 'Noto Sans KR', korS, W / 2, korY, maxW, { weight: 500 }));
        arr.push.apply(arr, T(res.roman, 'Noto Serif', romS, W / 2, romY, maxW));
        sm.push.apply(sm, T('로제타석처럼, 한 이름을 세 문자로.', 'Noto Sans KR', story ? 28 : 26, W / 2, rosY, maxW));
        if (!story) { sm.push(rule(W / 2 - 100, rosY - 13 - 28, 200, 2)); sm.push.apply(sm, T(siteUrl(), 'Noto Sans KR', 18, W / 2, rosY + 40, maxW)); }
      };
      if (ogham) {
        // 오검: 판 바깥 파피루스 배경에 글, 가운데 세로 기둥에 음각
        var lineTexts = [], lineSmall = []; texts(lineTexts, lineSmall);
        ctx.fillStyle = COL.text; [lineTexts, lineSmall].forEach(function (arr, i) { arr.forEach(function (u) { ctx.fillStyle = i ? COL.muted : COL.text; u.draw(ctx); }); });
        var cy = heroTop + heroH / 2, pu = E.oghamUnits(res.ogham, 120, W / 2, cy, o.oghamMax);
        var p = oghamPillar(ctx, tex, W / 2, cy, pu.len, pu.size);
        engraveOn(ctx, W, H, 'wood', pu, [], function (c) { E.rrPath(c, p.x, p.y, p.w, p.h, 6); });
        return cv;
      }
      var r = E.slabRadius(mat, W - 144); if (mat === 'clay') r = 48;
      slab(ctx, mat, tex, 72, 72, W - 144, H - 144, r);
      texts(big, small);
      hero = heroUnits(k, res, W / 2, heroTop, maxW, heroMaxH, o);
      hero.units.forEach(function (u) { (u.bbox[3] < 40 ? small : big).push(u); });
      engraveOn(ctx, W, H, mat, big, small, function (c) { E.rrPath(c, 72, 72, W - 144, H - 144, r); });
      return cv;
    });
  }
  // '전체' 카드
  function allCard(res, story) {
    var W = 1080, H = story ? 1920 : 1350, cv = E.mk(W, H), ctx = cv.getContext('2d'), mat = 'limestone';
    return E.loadTex(mat).then(function (tex) {
      frame(ctx, W, H); slab(ctx, mat, tex, 72, 72, W - 144, H - 144, E.slabRadius(mat, W - 144));
      var rowH = story ? 150 : 120, size = story ? 56 : 48, x0 = 112, valX = x0 + 220, valW = W - 112 - valX;
      var tableH = rowH * KEYS.length, headH = 64 + 16 + 32;
      var top = story ? 250 + (1330 - (headH + 48 + tableH + 48 + 28)) / 2 : 120;
      var big = [], small = [];
      big.push.apply(big, T(res.korean, 'Noto Sans KR', 64, W / 2, top + 32, W - 192, { weight: 500 }));
      big.push.apply(big, T(res.roman, 'Noto Serif', 32, W / 2, top + 64 + 16 + 16, W - 192));
      var ty = top + headH + 48;
      KEYS.forEach(function (k, i) {
        var cy = ty + i * rowH + rowH / 2;
        if (i) small.push(rule(x0, ty + i * rowH, W - 224, 1));
        small.push.apply(small, T(k === 'ugaritic' ? '쐐기(우가리트)' : S[k].tab, 'Noto Sans KR', 26, x0, cy, 210, { align: 'left' }));
        var sz = k === 'ugaritic' ? Math.round(size * 0.85) : size, so = scriptOpts(k);
        so.align = k === 'phoenician' ? 'right' : 'left';
        big.push.apply(big, T(res[k], E.FONT[k], sz, k === 'phoenician' ? valX + valW : valX, cy, valW, so));
      });
      var ry = story ? ty + tableH + 48 + 14 : H - 110 - 13;
      small.push.apply(small, T('로제타석처럼, 한 이름을 세 문자로.', 'Noto Sans KR', story ? 28 : 26, W / 2, ry, W - 192));
      if (!story) { small.push(rule(W / 2 - 100, ry - 41, 200, 2)); small.push.apply(small, T(siteUrl(), 'Noto Sans KR', 18, W / 2, ry + 40, W - 192)); }
      engraveOn(ctx, W, H, mat, big, small, function (c) { E.rrPath(c, 72, 72, W - 144, H - 144, E.slabRadius(mat, W - 144)); });
      return cv;
    });
  }
  // PNG 저장: 상형 포스터 (카르투슈 두 개 + 한글·로마자·그리스어)
  function posterCard(res) {
    var W = 1080, H = 1350, cv = E.mk(W, H), ctx = cv.getContext('2d'), mat = state.hieroMat;
    return E.loadTex(mat).then(function (tex) {
      ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
      var r = E.slabRadius(mat, W - 144); slab(ctx, mat, tex, 72, 72, W - 144, H - 144, r);
      var big = [], small = [];
      var hero = heroUnits('hiero', res, W / 2, 130, W - 240, 780, { cartW: 200, label: 22 });
      hero.units.forEach(function (u) { (u.bbox[3] < 40 ? small : big).push(u); });
      var y = 130 + hero.h + 60;
      big.push.apply(big, T(res.korean, 'Noto Sans KR', 40, W / 2, y, W - 240, { weight: 500 }));
      big.push.apply(big, T(res.roman, 'Noto Serif', 32, W / 2, y + 62, W - 240));
      big.push.apply(big, T(res.greek, 'Noto Serif', 32, W / 2, y + 114, W - 240));
      small.push.apply(small, T('로제타석처럼, 한 이름을 세 문자로.', 'Noto Sans KR', 24, W / 2, H - 130, W - 240));
      engraveOn(ctx, W, H, mat, big, small, function (c) { E.rrPath(c, 72, 72, W - 144, H - 144, r); });
      return cv;
    });
  }

  function download(cv, name) {
    cv.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, 'image/png');
  }
  function fileBase() { return state.res.roman.replace(/\s+/g, '_'); }
  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); }); }
  // 버튼은 누른 뒤에만 생성, 생성 중 '새기는 중…'
  function busy(btn, job) {
    if (btn.dataset.busy) return; var label = btn.textContent; btn.dataset.busy = '1'; btn.textContent = '새기는 중…'; btn.setAttribute('aria-busy', 'true');
    return nextFrame().then(job).catch(function (e) { console.warn(e); toast('이미지를 만들지 못했어요'); }).then(function () {
      btn.textContent = label; delete btn.dataset.busy; btn.removeAttribute('aria-busy');
    });
  }
  function ensureFonts(res) {
    var extra = document.fonts ? [document.fonts.load('600 32px "Noto Serif KR"', '문자'), document.fonts.load('500 22px "Noto Sans KR"', '즉위명 탄생명')] : [];
    return Promise.all([loadAll(res), loadFont('hiero', state.title.hiero + E.TITLE_SIGN.prenomen + E.TITLE_SIGN.nomen)].concat(extra)).catch(function () {});
  }

  var sheetCanvas = null, sheetName = '', lastFocus = null;
  function openSheet(kind, btn) {
    var res = state.res; if (!res) return;
    busy(btn, function () {
      return ensureFonts(res).then(function () {
        var k = state.tab, story = kind === 'story';
        return k === 'all' ? allCard(res, story) : singleCard(res, k, story);
      }).then(function (cv) {
        sheetCanvas = cv; sheetName = 'carved-' + kind + '-' + state.tab + '-' + fileBase() + '.png';
        $('sheet-img').src = cv.toDataURL('image/png');
        $('sheet-img').alt = (kind === 'story' ? '인스타 스토리' : '인스타 피드') + ' 카드 미리보기: ' + res.korean + ' (' + res.roman + ')';
        lastFocus = document.activeElement; $('sheet').hidden = false; $('sheet-save').focus();
      });
    });
  }
  function closeSheet() { $('sheet').hidden = true; if (lastFocus) lastFocus.focus(); }

  /* ---------- 이벤트 ---------- */
  buildTabs();
  $('form').addEventListener('submit', function (e) { e.preventDefault(); convertNow($('name').value, { save: true, url: true, user: true }); });
  $('btn-copy').addEventListener('click', copyText);
  $('btn-png').addEventListener('click', function () {
    var res = state.res; if (!res) return;
    busy($('btn-png'), function () { return ensureFonts(res).then(function () { return posterCard(res); }).then(function (cv) { download(cv, 'carved-' + fileBase() + '.png'); }); });
  });
  $('btn-feed').addEventListener('click', function () { openSheet('feed', $('btn-feed')); });
  $('btn-story').addEventListener('click', function () { openSheet('story', $('btn-story')); });
  $('sheet-save').addEventListener('click', function () { if (sheetCanvas) download(sheetCanvas, sheetName); });
  $('sheet').addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  $('btn-reroll').addEventListener('click', function () {
    state.title = C.randomTitle(null, state.title && state.title.ko); render(); updateStage(true);
  });
  $('mat-toggle').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mat]'); if (!b) return; state.hieroMat = b.dataset.mat; lsSet(MAT_KEY, state.hieroMat); render(); updateStage(true);
  });
  $('stage-preview-btn').addEventListener('click', function () { if (state.res && state.res.syllables.length) activateStage().then(function () { updateStage(true); }); });
  // 2D 대체 화면: 무대 크기가 실제로 바뀔 때만(150ms 묶음) 다시 그림
  var lastSize = '', rzTimer;
  if (window.ResizeObserver) new ResizeObserver(function () {
    clearTimeout(rzTimer); rzTimer = setTimeout(function () {
      var st = $('stage'), k = st.clientWidth + 'x' + st.clientHeight;
      if (k !== lastSize && state.stage === '2d') { lastSize = k; updateStage(false); }
    }, 150);
  }).observe($('stage'));

  render();
  // 첫 이름 우선순위: ?n= > 저장된 이름 > 홍길동
  var q = qs.get('n');
  if (q && q.trim()) { $('name').value = q; convertNow(q, { save: true, url: false }); }
  else { var first = loadSaved() || DEFAULT_NAME; $('name').value = first; convertNow(first, { save: false, url: false }); }
  window.__cartouche = { state: state, singleCard: singleCard, allCard: allCard, posterCard: posterCard, ensureFonts: ensureFonts, loadAll: loadAll, selectTab: selectTab, updateStage: updateStage, activateStage: activateStage };
})();
