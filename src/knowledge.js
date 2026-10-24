// Base de connaissances « par standards » : faits constructeur au niveau des
// familles et des standards (jamais pièce A ↔ pièce B). Chaque entrée porte sa
// source, son niveau et son statut. Une paire absente n'est jamais supposée
// compatible.
//
// Format commun d'une entrée :
//   { ...clés, level: 'officiel'|'connu'|'depannage'|'incompatible',
//     message, limitation?, adjustments?, tools?,
//     source: { kind, ref, url? }, confidence, status: 'valide'|'a_valider' }

const TABLES = [
  'families',           // { id, brand, system, protocol?, speeds, disciplines[], label, source }
  'actuation',          // { shifterFamily, derailleurFamily, side: 'arriere'|'avant', ... }
  'freehubFits',        // { cassette, body, spacerMm?, ... }
  'hydraulic',          // { leverSystem, caliperSystem, ... }
  'brakeMountAdapters', // { caliperMount, frameMount, adapter, ... }
  'spindleFits',        // { crankSpindle, bbSpindle, ... }
  'hangerFits',         // { rdMount, frameHanger, ... }
];

export function createKnowledge(raw = {}) {
  const t = {};
  for (const name of TABLES) t[name] = Array.isArray(raw[name]) ? raw[name] : [];
  const find = (name, pred) => t[name].find(pred) ?? null;
  return {
    tables: t,
    family: (id) => find('families', (e) => e.id === id),
    actuation: (shifterFamily, derailleurFamily, side) => find('actuation', (e) =>
      e.shifterFamily === shifterFamily && e.derailleurFamily === derailleurFamily && (!e.side || e.side === side)),
    freehubFit: (cassette, body) => find('freehubFits', (e) => e.cassette === cassette && e.body === body),
    hydraulic: (leverSystem, caliperSystem) => find('hydraulic', (e) =>
      e.leverSystem === leverSystem && e.caliperSystem === caliperSystem),
    brakeMountAdapter: (caliperMount, frameMount) => find('brakeMountAdapters', (e) =>
      e.caliperMount === caliperMount && e.frameMount === frameMount),
    spindleFit: (crankSpindle, bbSpindle) => find('spindleFits', (e) =>
      e.crankSpindle === crankSpindle && e.bbSpindle === bbSpindle),
    hangerFit: (rdMount, frameHanger) => find('hangerFits', (e) =>
      e.rdMount === rdMount && e.frameHanger === frameHanger),
  };
}

export const EMPTY_KNOWLEDGE = createKnowledge();
