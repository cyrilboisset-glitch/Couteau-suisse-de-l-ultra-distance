// Pièces et standards des anciennes générations (7v à 11v), sur la base réelle.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { checkPair, findReplacements, LEVEL, searchParts } from '../src/index.js';

const { parts, kb } = loadData();
const P = (id) => {
  const p = parts.find((x) => x.id === id);
  assert.ok(p, `pièce absente : ${id}`);
  return p;
};
const wheel = (attrs) => ({ id: 'w', type: 'wheel', brand: 'test', ref: 'roue', attrs, sources: [{ kind: 'physique' }] });

describe('recherche des anciens groupes', () => {
  for (const [q, ref] of [['105 5700', 'ST-5700'], ['claris 2400', 'RD-2400-SS'], ['xt m772', 'RD-M772-SGS'], ['dura ace 7700', 'RD-7700-SS'], ['sram x7 9', 'RD X7 9v'], ['veloce 10', 'Ergopower Veloce 10v']]) {
    test(`« ${q} » trouve ${ref}`, () => {
      assert.ok(searchParts(q, parts).results.some((r) => r.part.ref === ref));
    });
  }
});

describe('transmissions anciennes', () => {
  test('leviers 105 5700 + dérailleur 105 5701 GS : même famille', () => {
    assert.ok(checkPair(P('shimano-st-5700'), P('shimano-rd-5701-gs'), kb).level <= LEVEL.KNOWN);
  });
  test('leviers route 11v 6800 + dérailleur R8000 : même famille route 11v', () => {
    assert.ok(checkPair(P('shimano-st-6800'), P('shimano-rd-r8000-gs'), kb).level <= LEVEL.KNOWN);
  });
  test('manette VTT 11v SL-M8000 + dérailleur M8000 : compatible', () => {
    assert.ok(checkPair(P('shimano-sl-m8000-r'), P('shimano-rd-m8000-gs'), kb).level <= LEVEL.KNOWN);
  });
  test('SRAM 9v 1:1 (X7) avec manette SRAM 10v Exact Actuation : incompatible', () => {
    const shifter = { ...P('sram-sl-x9-9'), attrs: { ...P('sram-sl-x9-9').attrs } };
    assert.equal(checkPair(shifter, P('sram-rd-x0-10'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('cassette 7v sur corps 8/9/10v : entretoise de 4 mm', () => {
    const r = checkPair(P('shimano-cs-hg41-7-11-28'), wheel({ freehub: 'hg_8_9_10' }), kb);
    assert.ok(r.level <= LEVEL.KNOWN);
    assert.ok(r.findings.some((f) => f.extraParts.some((x) => /4 mm/.test(x))));
  });
  test('cassette 9v sur corps 7v : non montable', () => {
    assert.equal(checkPair(P('shimano-cs-m770-11-32'), wheel({ freehub: 'hg_7' }), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('cassette Campagnolo 9v avec Ergopower 10v : nombre de vitesses différent', () => {
    assert.ok(checkPair(P('campagnolo-ep-veloce-10'), P('campagnolo-cs-veloce-9-13-26'), kb).level >= LEVEL.DEGRADED);
  });
  test('pédalier Octalink V2 dans un boîtier Octalink V1 : refusé', () => {
    assert.equal(checkPair(P('shimano-fc-m4000'), P('shimano-bb-5500'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('dérailleur 8v Claris cassé : remplaçants 8/9v Shimano proposés', () => {
    const refs = findReplacements(P('shimano-rd-2400-ss'), parts, { kb }).map((x) => x.part.ref);
    assert.ok(refs.includes('RD-R2000-SS'));
  });
});

describe('freins anciens', () => {
  test('BB7 Road (tirage court) avec levier V-brake (tirage long) : exclusion absolue', () => {
    const r = checkPair(P('shimano-bl-t4000'), P('avid-bb7-road'), kb);
    assert.equal(r.absolute, true);
  });
  test('étrier Magura (Royal Blood) avec levier Shimano (minéral Shimano) : refusé', () => {
    assert.equal(checkPair(P('shimano-bl-m8100'), P('magura-mt4'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('V-brake Deore M590 + patins M70T4 : compatibles', () => {
    assert.ok(checkPair(P('shimano-br-m590'), P('shimano-bs-m70t4'), kb).level <= LEVEL.KNOWN);
  });
  test('étrier BR-6700 + patins R55C4 : compatibles', () => {
    assert.ok(checkPair(P('shimano-br-6700'), P('shimano-bs-r55c4'), kb).level <= LEVEL.KNOWN);
  });
});
