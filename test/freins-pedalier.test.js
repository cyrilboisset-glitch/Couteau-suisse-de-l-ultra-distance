import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkPair, LEVEL } from '../src/index.js';
import { kb } from './fixtures/kb.js';
import * as P from './fixtures/parts.js';

describe('freins : exclusions absolues', () => {
  test('levier hydraulique + étrier mécanique', () => {
    const r = checkPair(P.shifterRoute11Hydro, P.caliperMechRoadDisc, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
  });
  test('levier hydraulique + frein sur jante à câble', () => {
    assert.equal(checkPair(P.shifterRoute11Hydro, P.rimCaliper, kb).absolute, true);
  });
  test('minéral ≠ DOT', () => {
    const r = checkPair(P.shifterRoute11Hydro, P.caliperDotFlat, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
    assert.match(r.reasons.join(), /JAMAIS/);
  });
  test('fluide non renseigné : refusé faute de vérification', () => {
    const noFluid = { ...P.caliperMineralFlat, attrs: { ...P.caliperMineralFlat.attrs, fluid: undefined } };
    const r = checkPair(P.shifterRoute11Hydro, noFluid, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.ok(r.missing.length);
  });
  test('levier route (tirage court) + V-brake (tirage long)', () => {
    const r = checkPair(P.shifterRoute11, P.vBrake, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
  });
  test('levier VTT à tirage long + étrier route à tirage court', () => {
    assert.equal(checkPair(P.leverLongPull, P.rimCaliper, kb).absolute, true);
  });
  test('étrier à disque sur cadre pour frein sur jante', () => {
    const r = checkPair(P.caliperMineralFlat, P.frameRim, kb);
    assert.equal(r.absolute, true);
  });
  test('frein sur jante sur roue sans piste de freinage / disque sur roue sans fixation', () => {
    assert.equal(checkPair(P.rimCaliper, P.wheelHg11, kb).absolute, true);
    assert.equal(checkPair(P.caliperMineralFlat, P.wheelRim, kb).absolute, true);
  });
  test('forme de plaquette différente', () => {
    assert.equal(checkPair(P.caliperMineralFlat, P.padsB, kb).absolute, true);
  });
  test('disque Center Lock sur moyeu 6 trous', () => {
    assert.equal(checkPair(P.rotorCenterlock, P.wheelHg, kb).absolute, true);
  });
});

describe('freins : compatibles et croisements', () => {
  test('même système hydraulique : 100 %, avec purge', () => {
    const r = checkPair(P.shifterRoute11Hydro, P.caliperMineralFlat, kb);
    assert.equal(r.level, LEVEL.OFFICIAL);
    assert.ok(r.adjustments.some((a) => /Purger/.test(a)));
    assert.ok(r.tools.some((t) => /minéral/.test(t)));
  });
  test('levier route + étrier VTT, croisement documenté : 100 %', () => {
    assert.equal(checkPair(P.shifterRoute11Hydro, P.caliperMineralPostVtt, kb).level, LEVEL.OFFICIAL);
  });
  test('même fluide, systèmes différents non documentés : refusé par sécurité, à valider', () => {
    const r = checkPair(P.shifterRoute11Hydro, P.caliperMineralFlatOther, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.toValidate, true);
    assert.equal(r.absolute, false);
    assert.match(r.reasons[0], /Sécurité freinage/);
  });
  test('étrier post mount sur cadre IS : adaptateur', () => {
    const frameIs = P.part('frame', 'FR-IS', { brakeMount: 'is' });
    const r = checkPair(P.caliperMineralPostVtt, frameIs, kb);
    assert.equal(r.level, LEVEL.OFFICIAL);
    assert.ok(r.extraParts.some((x) => /IS → post mount/.test(x)));
  });
  test('étrier post mount sur cadre flat mount : non documenté', () => {
    const r = checkPair(P.caliperMineralPostVtt, P.frameRoute, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
  });
  test('disque 6 trous sur moyeu Center Lock : adaptateur', () => {
    const r = checkPair(P.rotor6bolt, P.wheelHg11, kb);
    assert.equal(r.level, LEVEL.KNOWN);
    assert.ok(r.extraParts.length);
  });
  test('plaquettes métal sur disque « résine seulement » : refusé par sécurité', () => {
    assert.equal(checkPair(P.padsAMetal, P.rotorCenterlock, kb).level, LEVEL.INCOMPATIBLE);
    assert.equal(checkPair(P.padsA, P.rotorCenterlock, kb).level, LEVEL.OFFICIAL);
  });
});

describe('sécurité freinage', () => {
  test('aucun résultat 🟠 dépannage sur une paire de freinage', () => {
    for (const [a, b] of [[P.shifterRoute11Hydro, P.caliperMineralFlatOther], [P.padsAMetal, P.rotorCenterlock]]) {
      const r = checkPair(a, b, kb);
      assert.ok(r.findings.every((f) => f.level !== LEVEL.DEGRADED));
      assert.equal(r.safety, true);
    }
  });
});

describe('mode baroudeur', () => {
  const kbExp = { ...kb, expedition: true };
  test('dépannages de freinage affichés, marqués urgence', () => {
    for (const [a, b] of [[P.shifterRoute11Hydro, P.caliperMineralFlatOther], [P.padsAMetal, P.rotorCenterlock]]) {
      const r = checkPair(a, b, kbExp);
      assert.equal(r.level, LEVEL.DEGRADED);
      assert.equal(r.emergency, true);
      assert.equal(r.toValidate, true);
    }
  });
  test('les incompatibilités de freinage restent ❌', () => {
    const r = checkPair(P.padsAMetal, P.rotorCenterlock, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
  });
});

describe('pédalier et boîtier', () => {
  test('axe 24 mm dans boîtier 24 mm', () => {
    assert.equal(checkPair(P.crankRoute, P.bbBsa24, kb).level, LEVEL.OFFICIAL);
  });
  test('axe DUB dans boîtier 24 mm : exclusion absolue', () => {
    const r = checkPair(P.crankGravelDub, P.bbBsa24, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
  });
  test('boîtier PF30 dans coque BSA : exclusion absolue', () => {
    assert.equal(checkPair(P.bbPf30, P.frameRoute, kb).absolute, true);
  });
  test('pédalier VTT (coque 73) sur cadre route (68) : incompatible', () => {
    assert.equal(checkPair(P.crankVttBoost, P.frameRoute, kb).level, LEVEL.INCOMPATIBLE);
  });
  test('pédalier gravel sur cadre route 68 : compatible', () => {
    assert.equal(checkPair(P.crankGravelDub, P.frameRoute, kb).level, LEVEL.OFFICIAL);
  });
  test('plateau BCD 110 / 4 vis', () => {
    assert.equal(checkPair(P.crankRoute, P.ring110, kb).level, LEVEL.OFFICIAL);
    assert.equal(checkPair(P.crankRoute, P.ring130, kb).absolute, true);
  });
});

describe('règles A15 à A18', () => {
  test('A15 : disque plus grand que le maximum du cadre', () => {
    const fork = P.part('frame', 'FOURCHE-160', { maxRotor: 160 });
    const r203 = P.part('rotor', 'RT-203', { mount: 'six_trous', diameter: 203 });
    assert.equal(checkPair(r203, fork, kb).absolute, true);
    assert.equal(checkPair(P.rotor6bolt, fork, kb).level, LEVEL.OFFICIAL);
  });
  test('A16 : maillon rapide', () => {
    const link11 = P.part('quick_link', 'QL-11', { speeds: 11, flattop: false });
    const link12f = P.part('quick_link', 'QL-12-F', { speeds: 12, flattop: true });
    assert.equal(checkPair(link11, P.chain11, kb).level, LEVEL.OFFICIAL);
    assert.equal(checkPair(link11, P.chain10, kb).absolute, true);
    assert.equal(checkPair(link12f, P.chain12, kb).absolute, true);
    assert.equal(checkPair(link12f, P.chainFlattop, kb).level, LEVEL.OFFICIAL);
  });
  test('A17 : axe de roue', () => {
    const frameTa = P.part('frame', 'FR-TA', { axleType: 'axe_traversant', axleDiameter: 12, axleWidth: 142 });
    const wheelQr = P.part('wheel', 'WH-QR', { brakeInterface: 'disque', rotorMount: 'centerlock', axleType: 'serrage_rapide', axleDiameter: 5, axleWidth: 135 });
    const wheelTa148 = P.part('wheel', 'WH-148', { brakeInterface: 'disque', rotorMount: 'centerlock', axleType: 'axe_traversant', axleDiameter: 12, axleWidth: 148 });
    const wheelTa142 = P.part('wheel', 'WH-142', { brakeInterface: 'disque', rotorMount: 'centerlock', axleType: 'axe_traversant', axleDiameter: 12, axleWidth: 142 });
    assert.equal(checkPair(wheelQr, frameTa, kb).absolute, true);
    assert.equal(checkPair(wheelTa148, frameTa, kb).absolute, true);
    assert.equal(checkPair(wheelTa142, frameTa, kb).level, LEVEL.OFFICIAL);
  });
  test('A18 : générations électroniques non documentées : exclusion absolue', () => {
    const sh = P.part('shifter', 'ST-DI2-X', { side: 'arriere', speeds: 12, system: 'electronique', protocol: 'di2', family: 'T-DI2-12' });
    assert.equal(checkPair(sh, P.rdDi2, kb).absolute, true);
  });
});
