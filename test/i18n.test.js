// Traductions : couverture du catalogue, modèles de messages, noms de pièces.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { collectKeys, TARGETS } from '../scripts/i18n.js';
import { findReplacements } from '../src/index.js';
import { setLang, tr, t, trName, detectLang, missingKeys } from '../src/i18n/index.js';

const { parts, kb } = loadData();
const P = (id) => parts.find((x) => x.id === id);

describe('traductions', () => {
  test('chaque texte français a sa traduction dans les 4 langues', () => {
    const keys = collectKeys();
    for (const code of TARGETS) assert.deepEqual(missingKeys(keys, code), [], code);
  });
  test('un message construit par le moteur est reconnu par son modèle', () => {
    setLang('en');
    assert.equal(tr('Portée 39–49 mm, cadre 60 mm.'), 'Reach 39–49 mm, frame 60 mm.');
    setLang('de');
    assert.equal(tr('Chaîne 11v prévue pour cette cassette 11v.'), '11-fach-Kette für diese 11-fach-Kassette vorgesehen.');
    setLang('fr');
  });
  test('les verdicts réels sont traduits (anglais)', () => {
    setLang('en');
    const res = findReplacements(P('shimano-rd-r8000-gs'), parts, { kb, includeIncompatible: true }).slice(0, 40);
    const msgs = res.flatMap(({ result: r }) => [...r.reasons, ...r.limitations, ...r.findings.map((f) => f.message)]);
    assert.ok(msgs.length > 20);
    const untranslated = msgs.filter((m) => tr(m) === m && !/ → \w+$/.test(m));
    assert.deepEqual(untranslated, []);
    setLang('fr');
  });
  test('noms de pièces : glossaire technique', () => {
    setLang('en');
    assert.equal(trName('Ultegra 6800 chape courte'), 'Ultegra 6800 short cage');
    assert.equal(trName('Deore M590 manette gauche 3 plateaux (9v)'), 'Deore M590 left shifter 3 chainrings (9s)');
    setLang('it');
    assert.equal(trName('Boîtier axe carré BSA 68'), 'Movimento centrale perno quadro BSA 68');
    setLang('fr');
    assert.equal(trName('Ultegra 6800 chape courte'), 'Ultegra 6800 chape courte');
  });
  test('paramètres d\'interface et langue du navigateur', () => {
    setLang('es');
    assert.equal(t('Remplacements ({0} possibles)', 12), 'Recambios (12 posibles)');
    setLang('fr');
    assert.equal(t('Remplacements ({0} possibles)', 12), 'Remplacements (12 possibles)');
    assert.equal(detectLang(['de-CH', 'en']), 'de');
    assert.equal(detectLang(['pt-BR']), 'fr');
  });
});
