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
