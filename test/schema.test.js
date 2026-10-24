import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePart, LEVEL, levelFromName } from '../src/index.js';
import { aggregate } from '../src/engine/core.js';
import { rdRoute11 } from './fixtures/parts.js';

test('une pièce complète est valide', () => {
  const r = validatePart(rdRoute11);
  assert.equal(r.valid, true, r.errors.join('\n'));
  assert.deepEqual(r.missing, []);
});

test('les données manquantes sont signalées, jamais inventées', () => {
  const r = validatePart({ id: 'x', type: 'rear_derailleur', brand: 'B', ref: 'X', attrs: { speeds: 11 } });
  assert.equal(r.valid, true);
  for (const k of ['system', 'family', 'maxCog', 'totalCapacity', 'mount', 'sources']) assert.ok(r.missing.includes(k), k);
});

test('attribut conditionnel : protocole requis pour une commande électronique', () => {
  const r = validatePart({ ...rdRoute11, attrs: { ...rdRoute11.attrs, system: 'electronique' } });
  assert.ok(r.missing.includes('protocol'));
});

test('fluide requis pour un frein hydraulique', () => {
  const r = validatePart({ id: 'l', type: 'brake_lever', brand: 'B', ref: 'L', sources: [{ kind: 'officiel' }], attrs: { brakeActuation: 'hydraulique' } });
  assert.ok(r.missing.includes('fluid'));
});

test('valeurs hors liste, types faux et attributs inconnus sont des erreurs', () => {
  const r = validatePart({ ...rdRoute11, attrs: { ...rdRoute11.attrs, mount: 'scotch', speeds: '11', couleur: 'rouge' } });
  assert.equal(r.valid, false);
  assert.equal(r.errors.length, 3);
});

test('type inconnu', () => {
  assert.equal(validatePart({ id: 'x', type: 'selle', brand: 'B', ref: 'X' }).valid, false);
});

test('niveaux : le pire constat gagne', () => {
  const f = (level) => ({ level, message: String(level), adjustments: [], tools: [], extraParts: [], missing: [], confidence: 'haute' });
  assert.equal(aggregate([f(1), f(3), f(2)]).level, LEVEL.DEGRADED);
  assert.equal(levelFromName('incompatible'), LEVEL.INCOMPATIBLE);
  assert.throws(() => levelFromName('peut-etre'));
});
