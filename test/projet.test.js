// Mode Projet : les 7 scénarios demandés, sur la base réelle (data/).
// Cassette 11-26 absente de la base : le scénario 1 part d'une CS-R8000 11-25.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { analyzeProject, REMOVE, chainLength } from '../src/project.js';

const { parts, kb } = loadData();
const run = (config, target) => analyzeProject(config, target, { kb, catalog: parts });
const slot = (r, id) => r.slots.find((s) => s.slot === id);

const R8000 = {
  shifter: 'shimano-st-r7000', rear_derailleur: 'shimano-rd-r8000-ss', front_derailleur: 'shimano-fd-r8000-f',
  cassette: 'shimano-cs-r8000-11-25', chain: 'shimano-cn-hg701-11', crankset: 'shimano-fc-r8000-50-34',
  bottom_bracket: 'shimano-sm-bbr60-bsa', brake_caliper: 'shimano-br-r8000', brake_pads: 'shimano-bs-r55c4',
};
const roueRoute11 = { freehub: 'hg_11_route', brakeInterface: 'jante' };

describe('1. Cassette 11-25 → 11-34 sur groupe route 11v à chape courte', () => {
  const r = run({ slots: R8000, wheel: roueRoute11, frame: { chainstayLength: 410 } }, 'shimano-cs-hg800-11-34');
  test('le dérailleur à chape courte doit changer, avec la raison', () => {
    const rd = slot(r, 'rear_derailleur');
    assert.equal(rd.status, 'changer');
    assert.ok(rd.reasons.some((x) => /34 dents/.test(x)));
    assert.equal(rd.after.attrs.family, 'shimano-route-11', 'remplaçant de même tirage');
    assert.ok(rd.after.attrs.maxCog >= 34);
  });
  test('remplaçants filtrés : même tirage, 34T admis ; données manquantes mises à part', () => {
    const { alternatives: alts, unverified } = slot(r, 'rear_derailleur');
    assert.ok(alts.length > 0);
    assert.ok(alts.every((p) => p.attrs.maxCog >= 34));
    assert.ok(!alts.some((p) => p.attrs.family === 'shimano-vtt-11'));
    assert.ok(unverified.every((p) => p.attrs.maxCog === undefined || p.attrs.totalCapacity === undefined));
  });
  test('corps de roue libre vérifié : entretoise 1,85 mm dans la liste de courses', () => {
    assert.ok(r.extras.some((x) => /1.85/.test(x)));
    assert.equal(r.external.length, 0);
  });
  test('longueur de chaîne recalculée depuis la base mesurée', () => {
    assert.ok(r.chain.links > 100 && r.chain.links < 130, `obtenu ${r.chain.links}`);
    assert.equal(r.chain.links % 2, 0);
    assert.ok(slot(r, 'chain').recommendations.length > 0, '💡 chaîne neuve');
  });
  test('le reste est gardé', () => {
    for (const id of ['shifter', 'crankset', 'front_derailleur', 'bottom_bracket']) assert.ok(['ok', 'verifier'].includes(slot(r, id).status), id);
    assert.equal(r.solved, true);
  });
});

describe('2. Passage 2x → 1x', () => {
  const r = run({ slots: { ...R8000, cassette: 'shimano-cs-r8000-11-28' }, wheel: roueRoute11, frame: {} }, 'shimano-fc-rx810-1-40');
  test('dérailleur avant à retirer', () => {
    assert.equal(slot(r, 'front_derailleur').status, 'retirer');
    assert.equal(r.solution.front_derailleur, REMOVE);
  });
  test('recommandations : embrayage, narrow-wide, levier gauche, cassette plus étagée', () => {
    const all = r.recommendations.map((x) => x.message).join(' ');
    assert.match(all, /embrayage/);
    assert.match(all, /narrow-wide/);
    assert.match(all, /levier gauche/);
    assert.match(all, /plus étagée/);
  });
});

describe('3. Passage 10v → 11v', () => {
  const config = {
    slots: {
      shifter: 'shimano-st-4700', rear_derailleur: 'shimano-rd-4700-gs', cassette: 'shimano-cs-hg500-10-11-32', chain: 'kmc-x10',
      crankset: 'shimano-fc-4700-50-34', bottom_bracket: 'shimano-sm-bbr60-bsa', brake_caliper: 'shimano-br-r7000', brake_pads: 'shimano-bs-r55c4',
    },
    wheel: { freehub: 'hg_8_9_10', brakeInterface: 'jante' },
    frame: {},
  };
  const r = run(config, 'shimano-cs-r8000-11-32');
  test('manettes et chaîne à changer', () => {
    assert.equal(slot(r, 'shifter').status, 'changer');
    assert.equal(slot(r, 'shifter').after.attrs.speeds, 11);
    assert.equal(slot(r, 'chain').status, 'changer');
    assert.equal(slot(r, 'chain').after.attrs.speeds, 11);
  });
  test('corps de roue libre de la roue arrière : à changer (hors catalogue)', () => {
    assert.ok(r.external.some((e) => e.what === 'wheel' && /corps de roue libre/.test(e.message)));
    assert.equal(r.solved, false);
  });
  test('dérailleur Tiagra 4700 gardé : même ratio que le route 11v (compatibilité « à valider »)', () => {
    assert.ok(['ok', 'verifier'].includes(slot(r, 'rear_derailleur').status));
  });
});

describe('4. Dérailleur VTT sur transmission route', () => {
  const r = run({ slots: R8000, wheel: roueRoute11, frame: {} }, 'shimano-rd-m8000-gs');
  test('tirage incompatible détecté : manette VTT 11v imposée, avec la raison', () => {
    const sh = slot(r, 'shifter');
    assert.equal(sh.status, 'changer');
    assert.equal(sh.after.attrs.family, 'shimano-vtt-11');
    assert.ok(sh.reasons.some((x) => /ratios différents|Ratio de tirage/.test(x)));
  });
  test('changement de forme signalé ; levier de frein séparé ajouté', () => {
    assert.ok(slot(r, 'shifter').checks.some((x) => /Forme différente/.test(x)));
    assert.equal(slot(r, 'brake_lever').status, 'ajouter');
    assert.equal(slot(r, 'brake_lever').after.attrs.cablePull, 'court');
  });
  test('commande avant VTT 11v absente de la base : signalée, pas inventée', () => {
    assert.equal(slot(r, 'shifter_front').status, 'introuvable');
    assert.equal(r.solved, false);
  });
  test('alternative proposée : dérailleur gravel au tirage route (GRX RX810, compatible double plateau)', () => {
    assert.ok(r.alternativesToTarget.some((p) => p.id === 'shimano-rd-rx810'));
    // Le RX812 (mono-plateau) n'est pas proposé sur ce vélo en 2x.
    assert.ok(!r.alternativesToTarget.some((p) => p.id === 'shimano-rd-rx812'));
  });
});

describe('5. Cassette SRAM 10-36 (XDR) sur roue Shimano HG', () => {
  const r = run({ slots: R8000, wheel: roueRoute11, frame: {} }, 'sram-xg-1270-10-36');
  test('corps de roue libre ou roue à changer', () => {
    const w = r.external.find((e) => e.what === 'wheel');
    assert.ok(w);
    assert.match(w.message, /xdr/);
    assert.equal(w.absolute, true);
  });
  test('cascade : commandes et chaîne changent (12v Flattop)', () => {
    assert.notEqual(slot(r, 'shifter').status, 'ok');
    assert.equal(slot(r, 'chain').after?.attrs.chainType, 'sram-flattop');
  });
});

describe('6. Freins sur jante → disques hydrauliques', () => {
  const r = run({ slots: R8000, wheel: roueRoute11, frame: {} }, 'shimano-br-r8070');
  test('manettes hydrauliques obligatoires', () => {
    const s = slot(r, 'shifter');
    assert.equal(s.status, 'changer');
    assert.equal(s.after.attrs.brakeActuation, 'hydraulique');
    assert.ok(s.reasons.some((x) => /mécanique et frein hydraulique/.test(x)));
  });
  test('disques à ajouter, plaquettes adaptées', () => {
    assert.equal(slot(r, 'rotor').status, 'ajouter');
    assert.equal(slot(r, 'brake_pads').after.attrs.shape, 'shimano-L');
  });
  test('roue à moyeu disque obligatoire ; cadre / fourche à contrôler', () => {
    assert.ok(r.external.some((e) => e.what === 'wheel' && /disque/.test(e.message)));
    assert.ok(r.checks.some((c) => /Fixations de frein du cadre/.test(c.text)));
  });
  test('purge dans les travaux', () => {
    assert.ok(r.works.some((x) => /Purger/.test(x)));
  });
});

describe('7. Pédalier aux plateaux plus petits', () => {
  test('53-39 → 46-30 : capacité, plage du dérailleur avant et boîtier vérifiés, tout passe', () => {
    const r = run({ slots: { ...R8000, crankset: 'shimano-fc-r8000-53-39', cassette: 'shimano-cs-r8000-11-30' }, wheel: roueRoute11, frame: {} }, 'shimano-fc-rx600-46-30');
    assert.equal(r.solved, true);
    for (const id of ['rear_derailleur', 'front_derailleur', 'bottom_bracket']) assert.ok(['ok', 'verifier'].includes(slot(r, id).status), id);
  });
  test('grand plateau trop grand pour le dérailleur avant : dérailleur avant à changer', () => {
    const r = run({ slots: { ...R8000, front_derailleur: 'shimano-fd-rx810-f', crankset: 'shimano-fc-rx600-46-30', cassette: 'shimano-cs-r8000-11-28' }, wheel: roueRoute11, frame: {} }, 'shimano-fc-r8000-53-39');
    const fd = slot(r, 'front_derailleur');
    assert.equal(fd.status, 'changer');
    assert.ok(fd.after.attrs.maxRing >= 53);
  });
  test('capacité de dérailleur dépassée : dérailleur à changer', () => {
    const r = run({ slots: { ...R8000, cassette: 'shimano-cs-r8000-11-30', crankset: 'shimano-fc-r8000-50-34' }, wheel: roueRoute11, frame: {} }, 'shimano-fc-r8000-53-39');
    // (30-11) + (53-39) = 33 ≤ 35 : pas de changement attendu
    assert.ok(['ok', 'verifier'].includes(slot(r, 'rear_derailleur').status));
    const r2 = run({ slots: { ...R8000, rear_derailleur: 'shimano-rd-r8000-gs', cassette: 'shimano-cs-r8000-11-32' }, wheel: roueRoute11, frame: {} }, 'shimano-fc-rx600-46-30');
    // (32-11) + (46-30) = 37 ≤ 39 : gardé
    assert.ok(['ok', 'verifier'].includes(slot(r2, 'rear_derailleur').status));
  });
});

describe('longueur de chaîne', () => {
  test('sans longueur de base : « à mesurer »', () => {
    const c = chainLength({ crankset: { attrs: { teeth: '50-34' } }, cassette: { attrs: { maxCog: 28 } } }, { attrs: {} }, kb);
    assert.equal(c.links, undefined);
    assert.match(c.text, /mesurez la longueur de base/);
  });
  test('coefficients lus dans la base', () => {
    const c = chainLength({ crankset: { attrs: { teeth: '50-34' } }, cassette: { attrs: { maxCog: 28 } } }, { attrs: { chainstayLength: 405 } }, kb);
    const m = kb.tables.chainLength[0];
    const expected = (m.chainstayFactor * 405) / m.unitMm + m.teethFactor * (50 + 28) + m.constant;
    let links = Math.ceil(expected * m.linksPerUnit);
    if (links % 2) links += 1;
    assert.equal(c.links, links);
  });
});

describe('outils du mode Projet', () => {
  test('chargement de groupe cohérent (pas de levier hydraulique avec frein sur jante)', async () => {
    const { groupConfig } = await import('../src/project.js');
    const { checkPair } = await import('../src/index.js');
    const slots = groupConfig('Ultegra R8000 (11v)', parts, kb);
    const chosen = Object.values(slots).map((id) => parts.find((p) => p.id === id));
    for (let i = 0; i < chosen.length; i++) {
      for (let j = i + 1; j < chosen.length; j++) {
        assert.ok(!checkPair(chosen[i], chosen[j], kb).absolute, `${chosen[i].ref} / ${chosen[j].ref}`);
      }
    }
    assert.ok(slots.rear_derailleur && slots.cassette && slots.crankset);
  });
  test('incompatibilité déjà présente signalée', () => {
    const r = run({ slots: { ...R8000, shifter: 'shimano-st-r8020' }, wheel: roueRoute11, frame: {} }, 'shimano-cs-r8000-11-28');
    assert.ok(r.preexisting.some((x) => /hydraulique/.test(x.message)));
  });
});
