// Données relevées dans les tableaux officiels productinfo.shimano.com.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { checkPair, LEVEL } from '../src/index.js';

const { parts, kb } = loadData();
const P = (id) => {
  const p = parts.find((x) => x.id === id);
  assert.ok(p, `pièce absente : ${id}`);
  return p;
};

describe('Shimano productinfo', () => {
  test('C-461 : disque à piste étroite dans un étrier pour disque large → incompatible', () => {
    assert.equal(checkPair(P('shimano-br-mt200'), P('shimano-sm-rt70-160'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('C-461 : disque à piste large dans un étrier étroit → accepté (résine seulement)', () => {
    assert.ok(checkPair(P('shimano-br-m8100'), P('shimano-sm-rt56-160'), kb).level < LEVEL.INCOMPATIBLE);
  });
  test('C-736 : levier LOW VISCOSITY et étrier à huile minérale standard → incompatible', () => {
    assert.equal(checkPair(P('shimano-bl-m8200'), P('shimano-br-m8100'), kb).level, LEVEL.INCOMPATIBLE);
    assert.ok(checkPair(P('shimano-bl-m8200'), P('shimano-br-m8200'), kb).level <= LEVEL.KNOWN);
  });
  test('mode baroudeur : minéral ↔ LOW VISCOSITY et minéral ↔ DOT restent incompatibles', () => {
    const kbExp = { ...kb, expedition: true };
    assert.equal(checkPair(P('shimano-bl-m8200'), P('shimano-br-m8100'), kbExp).level, LEVEL.INCOMPATIBLE);
    const dot = parts.find((p) => p.type === 'brake_caliper' && p.attrs?.fluid === 'dot');
    assert.equal(checkPair(P('shimano-bl-m8100'), dot, kbExp).level, LEVEL.INCOMPATIBLE);
  });
  test('C-192 : plaquettes 4 pistons sur étrier 4 pistons, pas sur un 2 pistons', () => {
    assert.ok(checkPair(P('shimano-br-m8120'), P('shimano-bp-n03a-rf'), kb).level <= LEVEL.KNOWN);
    assert.equal(checkPair(P('shimano-br-m8100'), P('shimano-bp-d03s-rx'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('C-254 : plages officielles des dérailleurs route', () => {
    for (const [id, cog] of [['shimano-rd-r9100', 30], ['shimano-rd-r8050-gs', 34], ['shimano-rd-6870-ss', 28], ['shimano-rd-rx825', 36]]) {
      assert.equal(P(id).attrs.maxCog, cog, id);
      assert.ok(P(id).sources.some((s) => s.url?.includes('productinfo.shimano.com')), id);
    }
    assert.equal(P('shimano-rd-r2000-gs').attrs.maxCog3x, 32);
  });
});

describe('Lignée Deore XT', () => {
  test('toutes les générations, du M700 (1983) au M8200 (12v)', () => {
    const gens = new Set(parts.filter((p) => p.brand === 'Shimano').map((p) => p.generation));
    for (const g of ['Deore XT M700 (1983)', 'Deore XT M730 (7v)', 'Deore XT M732 (7v)', 'Deore XT M735 (7v)', 'Deore XT M737 (8v)',
      'Deore XT M739 (8v)', 'Deore XT M750 (9v)', 'XT M760 (9v)', 'XT M770 (9v)', 'XT M780 (10v)', 'XT M8000 (11v)',
      'XT M8100 (12v)', 'XT M8200 (12v)', 'XT LinkGlide M8130 (11v)']) assert.ok(gens.has(g), g);
  });
  test('manette XT M8200 + dérailleur XT M8100 : compatibles (même tirage 12v)', () => {
    assert.ok(checkPair(P('shimano-sl-m8200-r'), P('shimano-rd-m8100-sgs'), kb).level <= LEVEL.KNOWN);
  });
});
