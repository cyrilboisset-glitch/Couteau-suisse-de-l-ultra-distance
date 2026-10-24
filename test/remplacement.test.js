import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkReplacement, findReplacements, checkAvailable, LEVEL } from '../src/index.js';
import { kb } from './fixtures/kb.js';
import * as P from './fixtures/parts.js';

describe('remplacement de dérailleur arrière (reste du vélo inconnu)', () => {
  test('même famille, même capacité : 100 %', () => {
    const twin = { ...P.rdRoute11, id: 'RD-ROUTE11-GS-BIS' };
    assert.equal(checkReplacement(P.rdRoute11, twin, { kb }).level, LEVEL.OFFICIAL);
  });

  test('dérailleur gravel à tirage route : compatible, ce qui change est expliqué', () => {
    const r = checkReplacement(P.rdRoute11, P.rdGravel11, { kb });
    assert.equal(r.level, LEVEL.OFFICIAL);
    assert.ok(r.changes.some((c) => /gravel à la place d'une pièce route/.test(c)));
    assert.ok(r.changes.some((c) => /pignons plus grands/.test(c)));
    // Capacité plus faible que l'original : condition sur la transmission réelle.
    assert.ok(r.conditions.some((c) => /≤ 31 dents/.test(c)));
  });

  test('dérailleur VTT à tirage différent : incompatible', () => {
    assert.equal(checkReplacement(P.rdRoute11, P.rdVtt11, { kb }).level, LEVEL.INCOMPATIBLE);
  });

  test('dérailleur électronique pour remplacer un mécanique : exclusion absolue', () => {
    const r = checkReplacement(P.rdRoute11, P.rdDi2, { kb });
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
  });

  test('chape courte à la place d\'une chape longue : condition sur le plus grand pignon', () => {
    const r = checkReplacement(P.rdRoute11, P.rdRoute11Short, { kb });
    assert.equal(r.level, LEVEL.OFFICIAL);
    assert.ok(r.conditions.some((c) => /30 dents au plus/.test(c)));
    assert.equal(r.basedOnHypotheses, true);
  });

  test('avec le vrai vélo, la condition devient un verdict', () => {
    const bike = [P.cassette11_34, P.crankRoute, P.shifterRoute11];
    const r = checkReplacement(P.rdRoute11, P.rdRoute11Short, { kb, bike });
    // 34 dents pour 30 admis (+4) : au-delà de la tolérance de dépannage.
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
  });

  test('capacité dépassée sur le vrai vélo : dépannage (croisements à éviter)', () => {
    const shortCage34 = { ...P.rdRoute11Short, id: 'RD-SS-34', attrs: { ...P.rdRoute11Short.attrs, maxCog: 34 } };
    const bike = [P.cassette11_34, P.crankRoute, P.shifterRoute11];
    const r = checkReplacement(P.rdRoute11, shortCage34, { kb, bike });
    // capacité requise (34-11)+(50-34) = 39 > 33
    assert.equal(r.level, LEVEL.DEGRADED);
    assert.ok(r.limitations.some((l) => /croisements/.test(l)));
  });

  test('dérailleur UDH direct : condition « cadre UDH »', () => {
    const r = checkReplacement(P.rdRoute11, P.rdUdhMech, { kb });
    assert.ok(r.conditions.some((c) => /UDH/.test(c)));
    const onRoad = checkReplacement(P.rdRoute11, P.rdUdhMech, { kb, bike: [P.frameRoute] });
    assert.equal(onRoad.absolute, true);
  });

  test('manette 9v réelle + dérailleur route 11v : dépannage documenté', () => {
    const r = checkReplacement(P.rdRoute11, P.rdRoute11Short, { kb, bike: [P.shifter9] });
    assert.equal(r.level, LEVEL.DEGRADED);
  });
});

describe('remplacement de cassette', () => {
  test('cassette 10v sur transmission 11v : dépannage (génération)', () => {
    const r = checkReplacement(P.cassette11_34, P.cassette10_36, { kb });
    assert.equal(r.level, LEVEL.DEGRADED);
    assert.ok(r.limitations.some((l) => /10 vitesses sur 11|cran/.test(l)));
    // Entretoise HG 8/9/10 sur corps HG 11 route.
    assert.ok(r.adjustments.some((a) => /Entretoise/.test(a)));
  });
  test('cassette VTT 11-42 sur vélo de route : condition sur le dérailleur', () => {
    const r = checkReplacement(P.cassette11_34, P.cassette11_42, { kb });
    // Corps HG 8/9/10 sur roue HG 11 route : entretoise, OK.
    assert.ok(r.conditions.some((c) => /au moins 42 dents/.test(c)));
    assert.ok(r.changes.some((c) => /chaîne probablement à rallonger/.test(c)));
  });
  test('cassette XD sur roue HG : exclusion absolue', () => {
    assert.equal(checkReplacement(P.cassette11_34, P.cassetteXd, { kb }).absolute, true);
  });
});

describe('remplacement de freins', () => {
  test('étrier à disque DOT pour un circuit minéral : exclusion absolue', () => {
    const r = checkReplacement(P.caliperMineralFlat, P.caliperDotFlat, { kb });
    assert.equal(r.absolute, true);
  });
  test('frein sur jante pour remplacer un étrier à disque : exclusion absolue', () => {
    assert.equal(checkReplacement(P.caliperMineralFlat, P.rimCaliper, { kb }).absolute, true);
  });
  test('étrier de même système mais plaquettes différentes : compatible, changement signalé', () => {
    const other = { ...P.caliperMineralFlat, id: 'BR-MIN-FLAT-2', attrs: { ...P.caliperMineralFlat.attrs, padShape: 'P-Z' } };
    const r = checkReplacement(P.caliperMineralFlat, other, { kb });
    assert.equal(r.level, LEVEL.OFFICIAL);
    assert.ok(r.changes.some((c) => /Plaquettes de rechange/.test(c)));
  });
  test('disque d\'un autre diamètre : adaptateur', () => {
    const r = checkReplacement(P.rotor6bolt, P.rotor6bolt140, { kb });
    assert.ok(r.extraParts.some((x) => /140 mm/.test(x)));
  });
});

describe('remplacement de pédalier', () => {
  test('autre standard d\'axe : boîtier à changer', () => {
    const r = checkReplacement(P.crankRoute, P.crankGravelDub, { kb });
    assert.ok(r.extraParts.some((x) => /sram_dub/.test(x)));
    assert.ok(r.changes.some((c) => /Ligne de chaîne 47.5 mm/.test(c)));
    assert.ok(r.changes.some((c) => /Pièce gravel/.test(c)));
  });
  test('ligne de chaîne très différente (≥ 5 mm) : dépannage à valider', () => {
    const r = checkReplacement(P.crankRoute, { ...P.crankVttBoost, attrs: { ...P.crankVttBoost.attrs, shellWidths: undefined } }, { kb });
    assert.equal(r.level, LEVEL.DEGRADED);
    assert.ok(r.findings.some((f) => f.rule === 'pedalier.ligne_chaine' && f.toValidate));
  });
  test('avec le vrai boîtier 24 mm : exclusion absolue', () => {
    assert.equal(checkReplacement(P.crankRoute, P.crankGravelDub, { kb, bike: [P.bbBsa24] }).absolute, true);
  });
});

describe('classement des résultats', () => {
  const catalog = [P.rdRoute11, P.rdRoute11Short, P.rdGravel11, P.rdVtt11, P.rdVttMullet, P.rdDi2, P.rdAxs, P.cassette11_34];

  test('exclut la pièce cassée, les autres types et les incompatibles ; trie par niveau', () => {
    const res = findReplacements(P.rdRoute11, catalog, { kb });
    const ids = res.map((r) => r.part.id);
    assert.ok(!ids.includes('RD-ROUTE11-GS'));
    assert.ok(!ids.includes('CS-11-34'));
    assert.ok(!ids.includes('RD-DI2-11'));
    assert.ok(ids.includes('RD-VTT11-MULLET'), 'le croisement VTT documenté doit apparaître');
    const levels = res.map((r) => r.result.level);
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
  });

  test('« j\'ai ça sous la main » : tout est évalué, incompatibles compris', () => {
    const res = checkAvailable(P.rdRoute11, [P.rdDi2, P.rdGravel11]);
    assert.equal(res.length, 2);
    assert.equal(res.at(-1).part.id, 'RD-DI2-11');
    assert.equal(res.at(-1).result.level, LEVEL.INCOMPATIBLE);
  });

  test('type différent : incompatible', () => {
    assert.equal(checkReplacement(P.rdRoute11, P.cassette11_34, { kb }).level, LEVEL.INCOMPATIBLE);
  });
});
