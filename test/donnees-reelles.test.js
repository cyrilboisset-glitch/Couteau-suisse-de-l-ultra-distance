// Cas réels sur la base pilote (data/). Les niveaux attendus découlent des
// sources citées dans les fichiers de données.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { checkData } from '../scripts/build-data.js';
import { checkPair, checkReplacement, findReplacements, LEVEL } from '../src/index.js';

const data = loadData();
const { kb, parts } = data;
const P = (id) => {
  const p = parts.find((x) => x.id === id);
  assert.ok(p, `pièce inconnue ${id}`);
  return p;
};
const wheel = (freehub) => ({ id: `roue-${freehub}`, type: 'wheel', virtual: false, brand: 'Test', ref: freehub, sources: [{ kind: 'officiel' }], attrs: { brakeInterface: 'disque', freehub, rotorMount: 'centerlock' } });

test('la base est valide : sources, statuts, familles, identifiants', () => {
  const { errors } = checkData(data);
  assert.deepEqual(errors, []);
  assert.ok(parts.length > 100);
});

describe('dérailleur arrière route 11v cassé (RD-R8000-GS)', () => {
  const broken = P('shimano-rd-r8000-gs');
  const res = findReplacements(broken, parts, { kb, includeIncompatible: true });
  const level = (id) => res.find((r) => r.part.id === id).result;

  test('GRX RX812 (gravel, tirage route) : compatible', () => {
    const r = level('shimano-rd-rx812');
    assert.ok(r.level <= LEVEL.KNOWN, r.reasons.join());
    assert.ok(r.changes.some((c) => /gravel/.test(c)));
  });
  test('microSHIFT Centos (Shimano compatible) : compatible connu, sous condition 30T', () => {
    const r = level('microshift-rd-centos-ss');
    assert.equal(r.level, LEVEL.KNOWN);
    assert.ok(r.conditions.some((c) => /30 dents/.test(c)));
    assert.equal(r.toValidate, true);
  });
  test('XT M8000 (VTT 11v) : incompatible, tirage', () => {
    const r = level('shimano-rd-m8000-gs');
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.match(r.reasons.join(), /ratios différents/);
  });
  test('GRX Di2 : exclusion absolue', () => {
    assert.equal(level('shimano-rd-rx815').absolute, true);
  });
  test('105 R7100 12v : incompatible (famille 12v non documentée avec manette 11v)', () => {
    assert.equal(level('shimano-rd-r7100').level, LEVEL.INCOMPATIBLE);
  });
});

describe('croisements route / gravel / VTT', () => {
  test('manette GRX 12v + dérailleur VTT 12v : incompatible (source revendeur)', () => {
    assert.equal(checkPair(P('shimano-st-rx820'), P('shimano-rd-m8100-sgs'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('manette GRX 12v + dérailleur GRX 1x 10-51 : compatible', () => {
    assert.ok(checkPair(P('shimano-st-rx820'), P('shimano-rd-rx822-sgs'), kb).level <= LEVEL.KNOWN);
  });
  test('mullet SRAM : leviers AXS route + dérailleur XPLR 13v : 100 % officiel', () => {
    assert.equal(checkPair(P('sram-st-axs-route'), P('sram-rd-red-xplr-e1'), kb).level, LEVEL.OFFICIAL);
  });
  test('leviers Apex 12v mécaniques + dérailleur GX Eagle : compatible + réglage en ligne', () => {
    const r = checkPair(P('sram-st-apex-12-meca'), P('sram-rd-gx-eagle'), kb);
    assert.ok(r.level <= LEVEL.KNOWN);
    assert.ok(r.extraParts.some((x) => /en ligne/.test(x)));
  });
  test('cassette VTT 11-42 pour remplacer une 11-32 route : entretoise + condition dérailleur', () => {
    const r = checkReplacement(P('shimano-cs-r8000-11-32'), P('shimano-cs-m8000-11-42'), { kb });
    assert.ok(r.extraParts.some((a) => /1.85/.test(a)));
    assert.ok(r.conditions.some((c) => /42 dents/.test(c)));
  });
  test('cassette SunRace (pas SRAM) avec manette Shimano 12v : dépannage', () => {
    const r = checkPair(P('sram-st-apex-12-meca'), P('sunrace-csmz90-11-50'), kb);
    assert.ok(r.level <= LEVEL.KNOWN);
    assert.equal(checkPair(P('shimano-sl-m8100-r'), P('sunrace-csmz90-11-50'), kb).level, LEVEL.DEGRADED);
  });
});

describe('chaînes', () => {
  test('Flattop route sur cassette Eagle : incompatible (SRAM)', () => {
    assert.equal(checkPair(P('sram-cn-flattop-12'), P('sram-pg-1230-11-50'), kb).level, LEVEL.INCOMPATIBLE);
  });
  test('chaîne Shimano 12v sur cassette Eagle : dépannage', () => {
    assert.equal(checkPair(P('shimano-cn-m8100'), P('sram-pg-1230-11-50'), kb).level, LEVEL.DEGRADED);
  });
  test('chaîne T-Type sur cassette T-Type : compatible', () => {
    assert.equal(checkPair(P('sram-cn-t-type'), P('sram-xs-1275-10-52'), kb).level, LEVEL.KNOWN);
  });
});

describe('corps de roue libre', () => {
  test('cassette XDR sur roue Shimano HG route : exclusion absolue', () => {
    assert.equal(checkPair(P('sram-xg-1251-10-44'), wheel('hg_11_route'), kb).absolute, true);
  });
  test('cassette Shimano 12v route sur corps 11v : compatible', () => {
    assert.ok(checkPair(P('shimano-cs-r9200-11-34'), wheel('hg_11_route'), kb).level <= LEVEL.KNOWN);
  });
  test('cassette 11v route sur corps HG L2 : incompatible', () => {
    assert.equal(checkPair(P('shimano-cs-r8000-11-28'), wheel('hg_l2'), kb).level, LEVEL.INCOMPATIBLE);
  });
});

describe('freins', () => {
  test('levier SRAM DOT + étrier Shimano minéral : exclusion absolue', () => {
    const r = checkPair(P('sram-st-axs-route'), P('shimano-br-r8070'), kb);
    assert.equal(r.absolute, true);
  });
  test('levier route Shimano + étrier VTT Shimano : refusé par sécurité, à valider (même huile, systèmes différents)', () => {
    const r = checkPair(P('shimano-st-r8020'), P('shimano-br-m8100'), kb);
    assert.equal(r.level, LEVEL.INCOMPATIBLE);
    assert.equal(r.toValidate, true);
  });
  test('plaquettes L05A dans un étrier GRX ; G05A refusées dans un étrier route', () => {
    assert.ok(checkPair(P('shimano-bp-l05a-rf'), P('shimano-br-rx820'), kb).level <= LEVEL.KNOWN);
    assert.equal(checkPair(P('shimano-bp-g05a-rx'), P('shimano-br-r7170'), kb).absolute, true);
  });
});

describe('pédalier', () => {
  test('pédalier DUB dans un boîtier Hollowtech II : exclusion absolue', () => {
    assert.equal(checkPair(P('sram-fc-red-d1-48-35'), P('shimano-sm-bbr60-bsa'), kb).absolute, true);
  });
  test('pédalier Sword (24 mm) dans un boîtier Shimano 24 mm : compatible', () => {
    assert.ok(checkPair(P('microshift-fc-sword'), P('shimano-bb-rs501'), kb).level <= LEVEL.KNOWN);
  });
});

describe('Claris R2000 (8v)', () => {
  test('la recherche « claris » trouve le groupe', async () => {
    const { searchParts } = await import('../src/search.js');
    const refs = searchParts('claris', parts).results.map((r) => r.part.ref);
    for (const ref of ['RD-R2000-SS', 'ST-R2000', 'FC-R2000 50-34', 'BR-R2000']) assert.ok(refs.includes(ref), ref);
  });
  test('manette Claris 8v + cassette HG50 8v : compatible ; + cassette 9v : dépannage seulement', () => {
    assert.ok(checkPair(P('shimano-st-r2000'), P('shimano-cs-hg50-8-11-32'), kb).level <= LEVEL.KNOWN);
    assert.equal(checkPair(P('shimano-st-r2000'), P('shimano-cs-hg200-9-11-32'), kb).level, LEVEL.DEGRADED);
  });
  test('chape courte R2000-SS limitée à 32 dents', () => {
    assert.ok(checkPair(P('shimano-rd-r2000-ss'), P('shimano-cs-hg50-8-11-32'), kb).level <= LEVEL.KNOWN);
    assert.ok(checkPair(P('shimano-rd-r2000-ss'), P('shimano-cs-hg50-8-11-34'), kb).level >= LEVEL.DEGRADED);
  });
});
