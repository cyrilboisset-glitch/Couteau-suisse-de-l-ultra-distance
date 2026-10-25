// Vélos vintage : friction, filetages de roue libre, premiers systèmes indexés.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { checkPair, findReplacements, LEVEL } from '../src/index.js';
import { analyzeProject } from '../src/project.js';

const { parts, kb } = loadData();
const P = (id) => {
  const p = parts.find((x) => x.id === id);
  assert.ok(p, `pièce absente : ${id}`);
  return p;
};
const wheel = (attrs) => ({ id: 'w', type: 'wheel', brand: 'test', ref: 'roue', attrs, sources: [{ kind: 'physique' }] });

describe('manettes à friction', () => {
  test('manette à friction + n\'importe quel dérailleur mécanique : compatible connu', () => {
    for (const rd of ['shimano-rd-r8000-gs', 'campagnolo-rd-record-friction', 'sram-rd-x7-9', 'shimano-rd-m8000-gs']) {
      const r = checkPair(P('diacompe-ciclo-downtube'), P(rd), kb);
      assert.ok(r.level <= LEVEL.KNOWN, `${rd} : ${r.level}`);
    }
  });
  test('manette à friction + cassette 11v : pas de contrainte de nombre de vitesses', () => {
    assert.ok(checkPair(P('suntour-barcon-friction'), P('shimano-cs-r8000-11-28'), kb).level <= LEVEL.KNOWN);
  });
  test('dérailleur d\'avant l\'indexation avec manette indexée : dépannage', () => {
    assert.equal(checkPair(P('shimano-st-r7000'), P('simplex-rd-prestige'), kb).level, LEVEL.DEGRADED);
  });
  test('manette indexée cassée : la manette à friction fait partie des dépannages proposés', () => {
    const refs = findReplacements(P('shimano-sl-7400'), parts, { kb }).map((x) => x.part.id);
    assert.ok(refs.includes('diacompe-ciclo-downtube'));
  });
  test('mode Projet : une manette indexée n\'est pas remplacée d\'office par une friction', () => {
    const r = analyzeProject({
      slots: { shifter: 'shimano-st-r7000', rear_derailleur: 'shimano-rd-r8000-ss', cassette: 'shimano-cs-r8000-11-25', crankset: 'shimano-fc-r8000-50-34', front_derailleur: 'shimano-fd-r8000-f' },
      wheel: { freehub: 'hg_11_route' }, frame: {},
    }, 'shimano-rd-m8000-gs', { kb, catalog: parts });
    const sh = r.slots.find((s) => s.slot === 'shifter');
    assert.notEqual(sh.after?.attrs.family, 'friction');
  });
});

describe('roues libres à visser', () => {
  test('filetage français sur moyeu anglais : refusé', () => {
    const r = checkPair(P('regina-extra-bx-6-13-23'), wheel({ freewheelThread: 'iso_anglais' }), kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
  });
  test('filetage anglais sur moyeu italien : connu, avec limitation', () => {
    const r = checkPair(P('regina-extra-oro-bx-5-14-22'), wheel({ freewheelThread: 'italien' }), kb);
    assert.equal(r.level, LEVEL.KNOWN);
    assert.ok(r.limitations.some((x) => /Angle de filet/.test(x)));
  });
  test('cassette Hyperglide sur corps Uniglide : refusée', () => {
    assert.equal(checkPair(P('shimano-cs-hg200-7-12-28'), wheel({ freehub: 'uniglide' }), kb).level, LEVEL.INCOMPATIBLE);
  });
});

describe('premiers systèmes indexés Shimano', () => {
  test('dérailleur SIS 6v (600 EX) avec manette 7v Shimano : compatible connu', () => {
    assert.equal(checkPair(P('shimano-sl-rv400-7r'), P('shimano-rd-6207'), kb).level, LEVEL.KNOWN);
  });
  test('manette Dura-Ace 7400 avec un autre dérailleur Shimano : dépannage (mode friction)', () => {
    assert.equal(checkPair(P('shimano-sl-7400'), P('shimano-rd-6207'), kb).level, LEVEL.DEGRADED);
  });
});

describe('freins sur jante : portée', () => {
  const frame = (r) => ({ id: 'f', type: 'frame', brand: 'test', ref: 'cadre', attrs: { brakeReach: r, brakeMount: 'etrier_central' }, sources: [{ kind: 'physique' }] });
  test('cadre vintage 60 mm : Tektro R559 (55-73) passe, BR-R650 (47-57) trop court', () => {
    assert.ok(checkPair(P('tektro-r559'), frame(60), kb).level <= LEVEL.KNOWN);
    const r = checkPair(P('shimano-br-r650'), frame(60), kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.ok(r.reasons.some((x) => /trop courte/.test(x)));
  });
  test('portée inconnue de l\'étrier : donnée manquante signalée', () => {
    const r = checkPair(P('shimano-br-r8000'), frame(52), kb);
    assert.ok(r.missing.some((x) => /reachMin|reachMax/.test(x)));
  });
});

describe('boîtiers vintage', () => {
  const frame = (shell) => ({ id: 'f', type: 'frame', brand: 'test', ref: 'cadre', attrs: { bbShell: shell }, sources: [{ kind: 'physique' }] });
  test('boîtier français dans une coque française : compatible ; dans une coque anglaise : refusé', () => {
    assert.ok(checkPair(P('velo-orange-grand-cru-bb-fr'), frame('francais'), kb).level <= LEVEL.KNOWN);
    assert.equal(checkPair(P('velo-orange-grand-cru-bb-fr'), frame('bsa'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('boîtier sans filetage dans une coque italienne abîmée : dépannage', () => {
    assert.equal(checkPair(P('yst-bb-sans-filetage'), frame('ita'), kb).level, LEVEL.DEGRADED);
  });
});
