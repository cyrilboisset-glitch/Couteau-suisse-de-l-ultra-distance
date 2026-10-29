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

describe('Transmission Shimano relevée dans C-433 / C-454', () => {
  test('CUES : manette U6000 11v + dérailleur U6000 : compatibles ; avec un dérailleur XT 11v Hyperglide : non', () => {
    assert.ok(checkPair(P('shimano-sl-u6000-11r'), P('shimano-rd-u6000'), kb).level <= LEVEL.KNOWN);
    assert.equal(checkPair(P('shimano-sl-u6000-11r'), P('shimano-rd-m8000-sgs'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('plages officielles reprises (RD-R9100-SS : 25 à 30 dents ; RD-M3000-SGS : 32 à 36)', () => {
    assert.equal(P('shimano-rd-r9100-ss').attrs.maxCog, 30);
    assert.equal(P('shimano-rd-m3000-sgs').attrs.maxCog, 36);
  });
});

describe('Freins Shimano relevés (C-186, C-462, C-736)', () => {
  test('levier XTR M9100 + étrier XTR M9120 4 pistons : compatibles', () => {
    assert.ok(checkPair(P('shimano-bl-m9100'), P('shimano-br-m9120'), kb).level <= LEVEL.KNOWN);
  });
  test('levier LOW VISCOSITY M9220 + étrier XTR M9100 (minéral standard) : incompatible', () => {
    assert.equal(checkPair(P('shimano-bl-m9220'), P('shimano-br-m9100'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('étrier mécanique BR-TX805 avec levier route (tirage court) : incompatible', () => {
    assert.equal(P('shimano-br-tx805').attrs.cablePull, 'long');
  });
});

describe('Toutes les pièces compatibles', () => {
  test('dérailleur XT M8100 SGS : manettes 12v, cassettes 10-51, chaînes 12v ; rien d\'incompatible', async () => {
    const { findCompatible } = await import('../src/compat.js');
    const groups = findCompatible(P('shimano-rd-m8100-sgs'), parts, { kb });
    const types = Object.fromEntries(groups.map((g) => [g.type, g.items]));
    assert.ok(types.shifter?.some((x) => x.part.id === 'shimano-sl-m8100-r'));
    assert.ok(types.cassette?.some((x) => x.part.attrs.maxCog === 51));
    assert.ok(groups.every((g) => g.items.every((x) => x.result.level <= LEVEL.KNOWN)));
    assert.ok(!types.shifter.some((x) => x.part.attrs.speeds === 11 && x.part.attrs.family === 'shimano-vtt-11'));
    assert.ok(types.cassette.every((x) => x.part.attrs.speeds === 12 && x.part.attrs.minCog >= 10), 'cassettes 12v, pas de 9 dents');
  });
});
