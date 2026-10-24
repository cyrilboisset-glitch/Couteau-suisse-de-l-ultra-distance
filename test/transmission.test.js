import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkPair, LEVEL, EMPTY_KNOWLEDGE } from '../src/index.js';
import { kb } from './fixtures/kb.js';
import * as P from './fixtures/parts.js';

const withoutSources = (p) => ({ ...p, sources: [] });

describe('exclusions absolues de commande', () => {
  test('manette mécanique + dérailleur électronique', () => {
    const r = checkPair(P.shifterRoute11, P.rdDi2, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
  });

  test('Di2 ≠ AXS', () => {
    const di2Shifter = P.part('shifter', 'ST-DI2', { side: 'les_deux', speeds: 11, system: 'electronique', protocol: 'di2', family: 'T-DI2-11' });
    const r = checkPair(di2Shifter, P.rdAxs, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
    assert.match(r.reasons.join(), /DI2 ≠ AXS/);
  });

  test('même protocole, génération non documentée : incompatible mais pas « absolu »', () => {
    const old = { ...P.rdDi2, id: 'RD-DI2-ANCIEN', attrs: { ...P.rdDi2.attrs, family: 'T-DI2-10' } };
    const sh = P.part('shifter', 'ST-DI2', { side: 'arriere', speeds: 11, system: 'electronique', protocol: 'di2', family: 'T-DI2-11' });
    const r = checkPair(sh, old, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, false);
  });

  test('même protocole et même famille (ex. AXS route + dérailleur AXS) : compatible', () => {
    assert.equal(checkPair(P.shifterAxs, P.rdAxs, kb).level, LEVEL.OFFICIAL);
  });
});

describe("familles d'actionnement", () => {
  test('même famille, données sourcées : 100 %', () => {
    assert.equal(checkPair(P.shifterRoute11, P.rdRoute11, kb).level, LEVEL.OFFICIAL);
  });

  test('même famille mais pièce non sourcée officiellement : plafonné à « connu »', () => {
    const r = checkPair(P.shifterRoute11, withoutSources(P.rdRoute11), kb);
    assert.equal(r.level, LEVEL.KNOWN);
    assert.equal(r.toValidate, true);
  });

  test('gravel qui reprend le tirage route : compatible avec une manette route', () => {
    assert.equal(checkPair(P.shifterRoute11, P.rdGravel11, kb).level, LEVEL.OFFICIAL);
  });

  test('manette route + dérailleur VTT à tirage différent : incompatible, explication croisée', () => {
    const r = checkPair(P.shifterRoute11, P.rdVtt11, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.match(r.reasons.join(), /Ratio de tirage différent/);
    assert.match(r.reasons.join(), /route → vtt/);
  });

  test('montage mixte documenté (mullet) : 100 %', () => {
    assert.equal(checkPair(P.shifterRoute11, P.rdVttMullet, kb).level, LEVEL.OFFICIAL);
  });

  test('sans entrée dans la base, le même mullet est refusé : rien n\'est supposé', () => {
    assert.equal(checkPair(P.shifterRoute11, P.rdVttMullet, EMPTY_KNOWLEDGE).level, LEVEL.INCOMPATIBLE);
  });

  test('la discipline seule ne bloque jamais', () => {
    const vttTwin = { ...P.rdRoute11, id: 'RD-JUMEAU-VTT', discipline: 'vtt' };
    assert.equal(checkPair(P.shifterRoute11, vttTwin, kb).level, LEVEL.OFFICIAL);
  });

  test('croisement de dépannage issu de la base : à valider, avec limitation', () => {
    const r = checkPair(P.shifter9, P.rdRoute11, kb);
    assert.equal(r.level, LEVEL.DEGRADED);
    assert.equal(r.toValidate, true);
    assert.ok(r.limitations.length > 0);
  });

  test('une manette arrière ne concerne pas le dérailleur avant', () => {
    assert.equal(checkPair(P.shifter9, P.fdDouble, kb).related, false);
  });
});

describe('croisements de générations (vitesses)', () => {
  test('manette 9v sur cassette 10v : dépannage avec limitation', () => {
    const r = checkPair(P.shifter9, P.cassette10_36, kb);
    assert.equal(r.level, LEVEL.DEGRADED);
    assert.match(r.limitations.join(), /9 vitesses sur 10/);
    assert.equal(r.toValidate, true);
  });

  test('dérailleur électronique 12v sur cassette 11v : dépannage', () => {
    assert.equal(checkPair(P.rdAxs, P.cassette11_34, kb).level, LEVEL.DEGRADED);
  });
});

describe('plus grand pignon', () => {
  test('dans la plage : compatible', () => {
    assert.equal(checkPair(P.rdRoute11, P.cassette11_34, kb).level, LEVEL.OFFICIAL);
  });
  test('+2 dents : dépannage, vis B', () => {
    const r = checkPair(P.rdRoute11, P.cassette11_36, kb);
    assert.equal(r.level, LEVEL.DEGRADED);
    assert.ok(r.adjustments.some((a) => /vis B/i.test(a)));
  });
  test('+8 dents (cassette VTT 11-42 sur dérailleur route) : incompatible', () => {
    assert.equal(checkPair(P.rdRoute11, P.cassette11_42, kb).level, LEVEL.INCOMPATIBLE);
  });
  test('cassette VTT 11-42 avec dérailleur gravel qui l\'accepte : compatible', () => {
    assert.equal(checkPair(P.rdGravel11, P.cassette11_42, kb).level, LEVEL.OFFICIAL);
  });
});

describe('corps de roue libre', () => {
  test('même standard', () => {
    assert.equal(checkPair(P.cassette11_34, P.wheelHg11, kb).level, LEVEL.OFFICIAL);
  });
  test('HG 8/9/10 sur corps HG 11 route : entretoise', () => {
    const r = checkPair(P.cassette10_36, P.wheelHg11, kb);
    assert.equal(r.level, LEVEL.OFFICIAL);
    assert.ok(r.adjustments.some((a) => /1.85 mm/.test(a)));
  });
  test('HG 11 route sur corps HG 8/9/10 : exclusion absolue', () => {
    const r = checkPair(P.cassette11_34, P.wheelHg, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
  });
  test('XD sur HG : exclusion absolue', () => {
    assert.equal(checkPair(P.cassetteXd, P.wheelHg, kb).absolute, true);
  });
  test('roue libre à visser sur corps de roue libre / cassette sur moyeu à visser', () => {
    assert.equal(checkPair(P.freewheel7, P.wheelHg, kb).absolute, true);
    assert.equal(checkPair(P.cassette10_36, P.wheelThreaded, kb).absolute, true);
    assert.equal(checkPair(P.freewheel7, P.wheelThreaded, kb).level, LEVEL.OFFICIAL);
  });
});

describe('chaîne', () => {
  test('même nombre de vitesses', () => {
    assert.equal(checkPair(P.chain11, P.cassette11_34, kb).level, LEVEL.OFFICIAL);
  });
  test('chaîne plus étroite d\'un cran (11v sur 10v) : compatible connu, à valider', () => {
    const r = checkPair(P.chain11, P.cassette10_36, kb);
    assert.equal(r.level, LEVEL.KNOWN);
    assert.equal(r.toValidate, true);
  });
  test('chaîne plus large d\'un cran (10v sur 11v) : dépannage', () => {
    assert.equal(checkPair(P.chain10, P.cassette11_34, kb).level, LEVEL.DEGRADED);
  });
  test('chaîne plus large de deux crans (9v sur 11v) : incompatible', () => {
    assert.equal(checkPair(P.chain9, P.cassette11_34, kb).level, LEVEL.INCOMPATIBLE);
  });
  test('plateaux Flattop exigent une chaîne Flattop', () => {
    assert.equal(checkPair(P.chain12, P.crankGravelDub, kb).level, LEVEL.INCOMPATIBLE);
    assert.notEqual(checkPair(P.chainFlattop, P.crankGravelDub, kb).level, LEVEL.INCOMPATIBLE);
  });
});

describe('patte de dérailleur', () => {
  test('dérailleur UDH direct sans cadre UDH : exclusion absolue', () => {
    const r = checkPair(P.rdUdhMech, P.frameRoute, kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.absolute, true);
  });
  test('dérailleur classique sur cadre UDH : compatible', () => {
    assert.equal(checkPair(P.rdRoute11, P.frameUdh, kb).level, LEVEL.OFFICIAL);
  });
});

describe('dérailleur avant', () => {
  test('braze-on sur cadre braze-on', () => {
    assert.equal(checkPair(P.fdDouble, P.frameRoute, kb).level, LEVEL.OFFICIAL);
  });
  test('braze-on sur tube rond : collier adaptateur', () => {
    const r = checkPair(P.fdDouble, P.frameRim, kb);
    assert.equal(r.level, LEVEL.KNOWN);
    assert.ok(r.extraParts.some((x) => /31.8/.test(x)));
  });
  test('double sur triple : dépannage', () => {
    assert.equal(checkPair(P.fdDouble, P.crankTriple, kb).level, LEVEL.DEGRADED);
  });
  test('double sur pédalier route 50-34 : compatible', () => {
    assert.equal(checkPair(P.fdDouble, P.crankRoute, kb).level, LEVEL.OFFICIAL);
  });
});

test('donnée manquante sur une pièce réelle : signalée, jamais supposée', () => {
  const noSystem = { ...P.rdRoute11, attrs: { ...P.rdRoute11.attrs, system: undefined } };
  const r = checkPair(P.shifterRoute11, noSystem, kb);
  assert.equal(r.level, LEVEL.INCOMPATIBLE);
  assert.equal(r.absolute, false);
  assert.ok(r.missing.length > 0);
});
