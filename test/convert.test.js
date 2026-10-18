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
