// Navigation par arborescence : Marque → Gamme → Génération → Type → Pièce.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { browse, placeOf, gammeFromGeneration, GENERIC } from '../src/browse.js';

const { parts, kb } = loadData();

describe('gamme déduite du nom de génération', () => {
  for (const [g, exp] of [['105 5700 (10v)', '105'], ['Dura-Ace 7700 (9v)', 'Dura-Ace'], ['XT M780 (10v)', 'XT'], ['Veloce 10', 'Veloce'], ['10v', GENERIC], ['', GENERIC]]) {
    test(`« ${g} » → ${exp}`, () => assert.equal(gammeFromGeneration(g), exp));
  }
});

describe('arbre sur la base réelle', () => {
  test('toutes les pièces sont rangées sous une marque', () => {
    const total = browse(parts, kb).items.reduce((s, it) => s + it.count, 0);
    assert.equal(total, parts.length);
  });
  test('Shimano → 105 → générations de la plus récente à la plus ancienne connue', () => {
    const gens = browse(parts, kb, { brand: 'Shimano', gamme: '105' }).items;
    assert.equal(gens[0].year, 2022);
    assert.ok(gens.some((g) => g.key === '105 5700 (10v)'));
  });
  test('année affichée seulement si sourcée', () => {
    const p = parts.find((x) => x.id === 'shimano-rd-7700-ss');
    const at = placeOf(p, kb);
    assert.equal(at.year, 1996);
    assert.ok(at.yearSource?.url);
    const sans = browse(parts, kb, { brand: 'Shimano', gamme: 'Tiagra' }).items.find((g) => g.key === 'Tiagra 4600 (10v)');
    assert.equal(sans.year, null);
  });
  test('jusqu\'aux pièces : Shimano › Claris › R2000 › dérailleur arrière', () => {
    const types = browse(parts, kb, { brand: 'Shimano', gamme: 'Claris', generation: 'Claris R2000 (8v)' }).items.map((t) => t.key);
    assert.ok(types.includes('rear_derailleur'));
    const refs = browse(parts, kb, { brand: 'Shimano', gamme: 'Claris', generation: 'Claris R2000 (8v)', type: 'rear_derailleur' }).items.map((p) => p.ref);
    assert.deepEqual(refs, ['RD-R2000-GS', 'RD-R2000-SS']);
  });
  test('filtre par nombre de vitesses', () => {
    const gammes = browse(parts, kb, { brand: 'Shimano' }, { speeds: 7 }).items.map((g) => g.key);
    assert.ok(gammes.includes('Tourney'));
    assert.ok(gammes.includes('Dura-Ace')); // Dura-Ace 7401 (1987)
    assert.ok(!gammes.includes('GRX'));
  });
});
