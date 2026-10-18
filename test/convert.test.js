const assert = require('assert');
const { convert, decompose } = require('../convert.js');

const d = decompose('함');
assert.deepStrictEqual([d.cho, d.jung, d.jong], ['ㅎ', 'ㅏ', 'ㅁ']);

const r = convert('함기훈');
assert.strictEqual(r.roman, 'Ham Gihun');
assert.strictEqual(r.greek, 'Χαμ Γκιχούν');
assert.strictEqual(r.hiero, '𓉔𓄿𓅓 𓎼𓇋𓉔𓅱𓈖');
assert.strictEqual(convert('함 기훈').hiero, r.hiero);

for (const n of ['함기훈', '이철호', '김민지']) {
  const o = convert(n);
  console.log(`${n} → ${o.roman} | ${o.greek} | ${o.hiero}`);
}
assert.strictEqual(convert('이철호').roman, 'I Cheolho');
assert.strictEqual(convert('김민지').roman, 'Gim Minji');
console.log('OK: all assertions passed');
for (const n of ['함기훈', '이철호', '김민지']) {
  const o = convert(n);
  console.log(`${n} [${o.korean}] 룬 ${o.runic} | 페니키아 ${o.phoenician} | 우가리트 ${o.ugaritic} | 오검 ${o.ogham}`);
}
const h2 = convert('함기훈');
assert.strictEqual(h2.runic, 'ᚺᚨᛗ ᚷᛁᚺᚢᚾ');
assert.strictEqual(h2.ugaritic, '𐎅𐎀𐎎𐎟𐎂𐎛𐎅𐎜𐎐');
assert.strictEqual(h2.korean, '함기훈');
assert.strictEqual(convert('남궁 민수').korean, '남궁 민수');
console.log('OK: script assertions passed');
const hg = convert('홍길동');
console.log('홍길동 →', require('../convert.js').SCRIPT_KEYS.map(k => `${k}: ${hg[k]}`).join(' | '));
assert.strictEqual(hg.roman, 'Hong Gildong');
assert.strictEqual(hg.korean, '홍길동');
console.log('OK: 홍길동 passed');
const CV = require('../convert.js');
const t0 = CV.makeTitle(0, 0), t1 = CV.makeTitle(1, 0);
console.log('칭호', t0.ko, t0.meaning, t0.roman, t0.hiero, '/', t1.ko, t1.meaning, t1.hiero);
assert.strictEqual(t0.ko, '우세르마아트레');
assert.strictEqual(t0.meaning, '라의 진리는 강하다');
assert.strictEqual(t0.roman, 'Usermaatre');
assert.strictEqual(t1.meaning, '진리의 주인, 라');
assert.ok(!t0.hiero.includes(' '));
assert.strictEqual(CV.convert('함기훈').hiero, '𓉔𓄿𓅓 𓎼𓇋𓉔𓅱𓈖'); // 옵션 추가 후에도 회귀 없음
for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) { const t = CV.makeTitle(a, b); assert.ok(t.hiero.length > 0 && t.roman, t.ko); }
console.log('OK: 칭호 passed');
