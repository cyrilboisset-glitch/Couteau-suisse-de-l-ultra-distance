import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/data-node.js';
import { searchParts, parseCriteria, substringDistance, normalize } from '../src/search.js';

const { parts } = loadData();
const first = (q) => searchParts(q, parts).results[0]?.part.id;
const ids = (q) => searchParts(q, parts).results.map((r) => r.part.id);

describe('normalisation et distance', () => {
  test('accents, casse, séparateurs', () => {
    assert.equal(normalize('Dérailleur  ARRIÈRE / 11-34'), 'derailleur arriere 11 34');
  });
  test('distance à une sous-chaîne', () => {
    assert.equal(substringDistance('rd8000', 'rdr8000gs'), 1);
    assert.equal(substringDistance('8000', 'rdr8000gs'), 0);
  });
});

describe('recherche par référence, tolérante aux fautes', () => {
  test('« RD-R8000-GS » exact', () => assert.equal(first('RD-R8000-GS'), 'shimano-rd-r8000-gs'));
  test('« r8000 gs »', () => assert.equal(first('r8000 gs'), 'shimano-rd-r8000-gs'));
  test('« rd8000 » remonte les R8000, puis des dérailleurs « 8000 »', () => {
    assert.ok(ids('rd8000').slice(0, 2).every((id) => /rd-r8000/.test(id)));
    assert.ok(ids('rd8000').slice(0, 5).every((id) => /8000/.test(id)));
  });
  test('faute de frappe « rx821 sgs » → RX822-SGS', () => assert.equal(first('rx822 sgs'), 'shimano-rd-rx822-sgs'));
  test('faute « m8100 sgss »', () => assert.ok(ids('m8100 sgss').includes('shimano-rd-m8100-sgs')));
  test('nom commercial « gx eagle »', () => assert.ok(ids('gx eagle').includes('sram-rd-gx-eagle')));
  test('rien d\'absurde pour « zzzz »', () => assert.equal(ids('zzzz').length, 0));
});

describe('recherche par critères', () => {
  test('analyse de « dérailleur arrière 11v route chape longue »', () => {
    const c = parseCriteria('dérailleur arrière 11v route chape longue');
    assert.equal(c.type, 'rear_derailleur');
    assert.equal(c.speeds, 11);
    assert.equal(c.discipline, 'route');
    assert.equal(c.cage.label, 'chape longue');
    assert.equal(c.text, '');
  });
  test('critère impossible relâché et signalé', () => {
    const r = searchParts('dérailleur arrière 11v route chape longue', parts);
    assert.ok(r.results.length > 0);
    assert.ok(r.relaxed.includes('chape'));
    assert.ok(r.results.every(({ part }) => part.type === 'rear_derailleur' && part.attrs.speeds === 11));
  });
  test('« cassette 11-34 »', () => {
    const r = searchParts('cassette 11-34', parts);
    assert.ok(r.results.length > 0);
    assert.ok(r.results.every(({ part }) => part.type === 'cassette' && part.attrs.maxCog === 34 && part.attrs.minCog === 11));
  });
  test('« dérailleur 12v gravel 1x » : uniquement mono-plateau', () => {
    const r = searchParts('dérailleur 12v gravel 1x', parts);
    assert.ok(r.results.length > 0);
    assert.ok(r.results.every(({ part }) => part.attrs.maxFrontChainrings === 1));
  });
  test('« chaîne 12v shimano »', () => {
    assert.ok(ids('chaîne 12v shimano').includes('shimano-cn-m8100'));
  });
  test('« levier de frein » n\'est pas un étrier', () => {
    assert.equal(parseCriteria('levier de frein hydraulique').type, 'brake_lever');
  });
  test('« 1x » n\'est pas lu comme 1 vitesse', () => {
    const c = parseCriteria('dérailleur 1x');
    assert.equal(c.speeds, undefined);
    assert.equal(c.front, 1);
  });
});

test('« fc-r8000 50-34 » : plateaux reconnus', () => {
  assert.equal(searchParts('fc-r8000 50-34', parts).results[0].part.id, 'shimano-fc-r8000-50-34');
  assert.ok(searchParts('fc-r8000 50-34', parts).results.every(({ part }) => part.attrs.teeth === '50-34'));
});
