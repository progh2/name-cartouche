/* 한글 이름 → 로마자 · 그리스어 · 이집트 상형문자 음역 (브라우저/Node 공용) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NameConvert = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  // 개정 로마자 (간단판: 동화·연음 규칙 없음)
  var CHO_R = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  var JUNG_R = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
  var JONG_R = ['','k','k','k','n','n','n','t','l','k','m','l','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];

  // 그리스어 (소문자로 만든 뒤 단어 첫 글자만 대문자)
  var CONS_G = { g:'γκ', kk:'κ', k:'κ', n:'ν', d:'ντ', tt:'τ', r:'ρ', l:'λ', m:'μ', b:'μπ', pp:'π', p:'π',
    s:'σ', ss:'σ', j:'τζ', jj:'τζ', ch:'τσ', t:'τ', h:'χ', ng:'γκ', '':'' };
  var VOW_G = { a:'α', ae:'ε', ya:'για', yae:'γε', eo:'ο', e:'ε', yeo:'γιο', ye:'γε', o:'ο', wa:'ουα',
    wae:'ουε', oe:'ουε', yo:'γιο', u:'ου', wo:'ουο', we:'ουε', wi:'ουι', yu:'γιου', eu:'ι', ui:'ουι', i:'ι' };
  var FINAL_G = { '':'', k:'κ', n:'ν', t:'τ', l:'λ', m:'μ', p:'π', ng:'γκ' };
  var ACCENT = { 'α':'ά', 'ε':'έ', 'ι':'ί', 'ο':'ό', 'υ':'ύ', 'η':'ή', 'ω':'ώ' };

  // 상형문자 단자음
  var H = { a:'𓄿', i:'𓇋', y:'𓇌', w:'𓅱', b:'𓃀', p:'𓊪', f:'𓆑', m:'𓅓', n:'𓈖', r:'𓂋', h:'𓉔',
    s:'𓋴', k:'𓎡', g:'𓎼', t:'𓏏', ch:'𓍿', d:'𓂧' };
  var CONS_H = { g:H.g, kk:H.k, k:H.k, n:H.n, d:H.d, tt:H.t, r:H.r, l:H.r, m:H.m, b:H.b, pp:H.p, p:H.p,
    s:H.s, ss:H.s, j:H.ch, jj:H.ch, ch:H.ch, t:H.t, h:H.h, ng:H.n + H.g, '':'' };
  var VOW_H = { a:H.a, ae:H.i, ya:H.y+H.a, yae:H.y+H.i, eo:H.w, e:H.i, yeo:H.y+H.w, ye:H.y+H.i, o:H.w,
    wa:H.w+H.a, wae:H.w+H.i, oe:H.w+H.i, yo:H.y+H.w, u:H.w, wo:H.w, we:H.w+H.i, wi:H.w+H.i,
    yu:H.y+H.w, eu:H.i, ui:H.w+H.i, i:H.i };

  // 룬 · 페니키아 · 우가리트(쐐기) · 오검: 로마자 토큰 → 문자 (소리 근사)
  // 모음은 기본 모음(a e i o u) + 반모음(y/w)으로 나눔. eo→o, eu→i, ae→e.
  var VP = { a:['','a'], ae:['','e'], ya:['y','a'], yae:['y','e'], eo:['','o'], e:['','e'], yeo:['y','o'],
    ye:['y','e'], o:['','o'], wa:['w','a'], wae:['w','e'], oe:['w','e'], yo:['y','o'], u:['','u'], wo:['w','o'],
    we:['w','e'], wi:['w','i'], yu:['y','u'], eu:['','i'], ui:['w','i'], i:['','i'] };
  var SCRIPTS = {
    runic: { // 고대 푸사르크
      cons: { g:'ᚷ', kk:'ᚲ', k:'ᚲ', n:'ᚾ', d:'ᛞ', tt:'ᛏ', t:'ᛏ', r:'ᚱ', l:'ᛚ', m:'ᛗ', b:'ᛒ', pp:'ᛈ', p:'ᛈ',
        s:'ᛋ', ss:'ᛋ', j:'ᛃ', jj:'ᛃ', ch:'ᛏᛋ', h:'ᚺ', ng:'ᛜ', '':'' },
      glide: { y:'ᛃ', w:'ᚹ' }, vowel: { a:'ᚨ', e:'ᛖ', i:'ᛁ', o:'ᛟ', u:'ᚢ' }, sep:' ' },
    phoenician: { // 자음 문자 + 모음은 알레프/요드/와우로 근사
      cons: { g:'𐤂', kk:'𐤊', k:'𐤊', n:'𐤍', d:'𐤃', tt:'𐤕', t:'𐤕', r:'𐤓', l:'𐤋', m:'𐤌', b:'𐤁', pp:'𐤐', p:'𐤐',
        s:'𐤎', ss:'𐤎', j:'𐤆', jj:'𐤆', ch:'𐤑', h:'𐤄', ng:'𐤍𐤂', '':'' },
      glide: { y:'𐤉', w:'𐤅' }, vowel: { a:'𐤀', e:'𐤉', i:'𐤉', o:'𐤅', u:'𐤅' }, sep:' ' },
    ugaritic: { // 우가리트 쐐기 알파벳, 단어 구분 𐎟
      cons: { g:'𐎂', kk:'𐎋', k:'𐎋', n:'𐎐', d:'𐎄', tt:'𐎚', t:'𐎚', r:'𐎗', l:'𐎍', m:'𐎎', b:'𐎁', pp:'𐎔', p:'𐎔',
        s:'𐎒', ss:'𐎒', j:'𐎇', jj:'𐎇', ch:'𐎕', h:'𐎅', ng:'𐎐𐎂', '':'' },
      glide: { y:'𐎊', w:'𐎆' }, vowel: { a:'𐎀', e:'𐎛', i:'𐎛', o:'𐎜', u:'𐎜' }, sep:'𐎟' },
    ogham: { // p 없음 → b, j → z(ᚎ), 단어 사이 오검 공백, 앞뒤 깃표
      cons: { g:'ᚌ', kk:'ᚉ', k:'ᚉ', n:'ᚅ', d:'ᚇ', tt:'ᚈ', t:'ᚈ', r:'ᚏ', l:'ᚂ', m:'ᚋ', b:'ᚁ', pp:'ᚁ', p:'ᚁ',
        s:'ᚄ', ss:'ᚄ', j:'ᚎ', jj:'ᚎ', ch:'ᚈᚄ', h:'ᚆ', ng:'ᚍ', '':'' },
      glide: { y:'ᚔ', w:'ᚒ' }, vowel: { a:'ᚐ', e:'ᚓ', i:'ᚔ', o:'ᚑ', u:'ᚒ' }, sep:'\u1680', pre:'᚛', post:'᚜' }
  };
  function scriptSyllable(key, d) {
    var S = SCRIPTS[key], vp = VP[d.rJung], gl = vp[0] ? S.glide[vp[0]] : '', v = S.vowel[vp[1]];
    if (gl === v) gl = ''; // wo→𐤅 처럼 같은 기호 중복 방지
    return S.cons[d.rCho] + gl + v + S.cons[d.rJong];
  }

  function isHangul(ch) { var c = ch.charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3; }

  function decompose(ch) {
    var code = ch.charCodeAt(0) - 0xAC00;
    var cho = Math.floor(code / (21 * 28));
    var jung = Math.floor((code % (21 * 28)) / 28);
    var jong = code % 28;
    return { syllable: ch, choIdx: cho, jungIdx: jung, jongIdx: jong,
      cho: CHO[cho], jung: JUNG[jung], jong: JONG[jong],
      rCho: CHO_R[cho], rJung: JUNG_R[jung], rJong: JONG_R[jong] };
  }

  function accentLastVowel(s) {
    for (var i = s.length - 1; i >= 0; i--) {
      if (ACCENT[s[i]]) return s.slice(0, i) + ACCENT[s[i]] + s.slice(i + 1);
    }
    return s;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function syllableParts(d) {
    var gv = VOW_G[d.rJung];
    return {
      roman: d.rCho + d.rJung + d.rJong,
      greekParts: [CONS_G[d.rCho], gv, FINAL_G[d.rJong]],
      hiero: CONS_H[d.rCho] + VOW_H[d.rJung] + CONS_H[d.rJong]
    };
  }

  // 입력을 단어(성/이름)로 나눔. 공백이 있으면 그대로, 없으면 첫 음절=성.
  function splitName(input) {
    var clean = String(input || '').trim();
    var ignored = [];
    var words = clean.split(/\s+/).map(function (w) {
      return Array.from(w).filter(function (c) { if (isHangul(c)) return true; ignored.push(c); return false; }).join('');
    }).filter(Boolean);
    var userSpace = words.length > 1;
    if (words.length === 1 && words[0].length > 1) words = [words[0].charAt(0), words[0].slice(1)];
    return { words: words, ignored: ignored, korean: words.join(userSpace ? ' ' : '') };
  }

  function convert(input) {
    var sp = splitName(input);
    var rows = [];
    var romanWords = [], greekWords = [], hieroWords = [];
    var ext = { runic: [], phoenician: [], ugaritic: [], ogham: [] };
    sp.words.forEach(function (w, wi) {
      var syls = Array.from(w).map(decompose);
      var r = '', g = '', h = '', x = { runic: '', phoenician: '', ugaritic: '', ogham: '' };
      syls.forEach(function (d, si) {
        var p = syllableParts(d);
        var gp = p.greekParts.slice();
        if (syls.length > 1 && si === syls.length - 1) gp[1] = accentLastVowel(gp[1]); // 마지막 음절 강세
        var gs = gp.join('');
        r += p.roman; g += gs; h += p.hiero;
        var row = { word: wi, syllable: d.syllable, cho: d.cho, jung: d.jung, jong: d.jong,
          roman: p.roman, greek: gs, hiero: p.hiero };
        Object.keys(x).forEach(function (k) { row[k] = scriptSyllable(k, d); x[k] += row[k]; });
        rows.push(row);
      });
      g = g.replace(/σ$/, 'ς');
      romanWords.push(cap(r)); greekWords.push(cap(g)); hieroWords.push(h);
      Object.keys(x).forEach(function (k) { ext[k].push(x[k]); });
    });
    var out = { korean: sp.korean, roman: romanWords.join(' '), greek: greekWords.join(' '), hiero: hieroWords.join(' '),
      words: hieroWords, syllables: rows, ignored: sp.ignored };
    Object.keys(ext).forEach(function (k) {
      var S = SCRIPTS[k];
      out[k] = ext[k].length ? (S.pre || '') + ext[k].join(S.sep) + (S.post || '') : '';
    });
    return out;
  }

  return { SCRIPT_KEYS: ['roman','greek','hiero','runic','phoenician','ugaritic','ogham'], decompose: decompose, convert: convert, splitName: splitName, isHangul: isHangul };
});
