// LTWOO, SENSAH, Wheeltop ; nombre de vitesses programmable ; tri par discipline (Projet).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { checkPair, LEVEL } from '../src/index.js';
import { analyzeProject, groupConfig, disciplineRank } from '../src/project.js';

const { parts, kb } = loadData();
const P = (id) => {
  const p = parts.find((x) => x.id === id);
  assert.ok(p, `pièce absente : ${id}`);
  return p;
};

describe('LTWOO, SENSAH, Wheeltop', () => {
  test('toutes les gammes sont présentes (route, gravel, VTT, électronique)', () => {
    const gens = (brand) => new Set(parts.filter((p) => p.brand === brand).map((p) => p.generation));
    for (const g of ['R2 (7v)', 'R3 (8v)', 'R5 (9v)', 'R7 (10v)', 'R9 (11v)', 'RX (12v)', 'GR5 (9v)', 'GR7 (10v)', 'GR9 (11v)', 'GRT (12v)',
      'A5 (9v)', 'A7 (10v)', 'A9 (11v)', 'A12 (12v)', 'eRX (électronique)', 'eGR (électronique)']) assert.ok(gens('LTWOO').has(g), g);
    for (const g of ['Empire (11v)', 'Empire Pro (12v)', 'Team Pro (11v)', 'Reflex (8v)', 'SRX (11v)', 'XRX (12v)']) assert.ok(gens('SENSAH').has(g), g);
    for (const g of ['EDS TX', 'EDS GeX', 'EDS OX2.0']) assert.ok(gens('Wheeltop').has(g), g);
  });
  test('leviers LTWOO R9 et SENSAH Team Pro avec dérailleur Shimano route 11v : compatibles', () => {
    assert.ok(checkPair(P('ltwoo-st-r9-2x11'), P('shimano-rd-r8000-gs'), kb).level <= LEVEL.KNOWN);
    assert.ok(checkPair(P('sensah-st-team-pro-2x11'), P('shimano-rd-r7000-gs'), kb).level <= LEVEL.KNOWN);
  });
  test('gamme gravel LTWOO « L-TWOO only » : pas de mélange avec Shimano', () => {
    assert.equal(checkPair(P('ltwoo-st-gr9-1x11'), P('shimano-rd-rx812'), kb).level, LEVEL.INCOMPATIBLE);
    assert.ok(checkPair(P('ltwoo-st-gr9-1x11'), P('ltwoo-rd-gr9'), kb).level <= LEVEL.KNOWN);
  });
  test('protocoles électroniques : Wheeltop ≠ Di2, LTWOO ≠ AXS', () => {
    assert.equal(checkPair(P('wheeltop-st-eds-tx-hydro'), P('shimano-rd-r9250'), kb).level, LEVEL.INCOMPATIBLE);
    assert.equal(checkPair(P('ltwoo-st-erx'), P('sram-rd-red-axs-36'), kb).level, LEVEL.INCOMPATIBLE);
    assert.ok(checkPair(P('wheeltop-st-eds-tx-hydro'), P('wheeltop-rd-eds-tx'), kb).level <= LEVEL.KNOWN);
  });
  test('dérailleur électronique programmable : cassette 11v acceptée, réglage dans l\'application', () => {
    const r = checkPair(P('wheeltop-rd-eds-tx'), P('shimano-cs-r8000-11-28'), kb);
    assert.ok(r.level <= LEVEL.KNOWN);
    assert.ok(r.adjustments.some((a) => /11 vitesses/.test(a)));
    // Hors plage : LTWOO eRX (10-12v) sur cassette 9v.
    assert.equal(checkPair(P('ltwoo-rd-erx'), P('shimano-cs-hg50-9-13-25'), kb).level, LEVEL.DEGRADED);
  });
});

describe('Projet : type de vélo (route / gravel / VTT)', () => {
  test('rang de discipline : même discipline d\'abord, gravel accepte route et VTT', () => {
    assert.equal(disciplineRank({ discipline: 'vtt' }, 'vtt'), 0);
    assert.equal(disciplineRank({ discipline: 'route' }, 'gravel'), 1);
    assert.equal(disciplineRank({ discipline: 'autre' }, 'route'), 1);
    assert.equal(disciplineRank({ discipline: 'vtt' }, 'route'), 2);
    assert.equal(disciplineRank({ discipline: 'vtt' }, null), 0);
  });
  test('la pièce choisie pour un emplacement suit la discipline du vélo', () => {
    const config = { slots: groupConfig('105 R7000 (11v)', parts, kb), frame: {}, wheel: {} };
    const shifterFor = (discipline) => analyzeProject({ ...config, discipline }, 'sram-pg-1130-11-42', { kb, catalog: parts })
      .slots.find((s) => s.slot === 'shifter').after;
    assert.equal(shifterFor('vtt').discipline, 'vtt');
    assert.equal(shifterFor('route').discipline, 'route');
  });
});
