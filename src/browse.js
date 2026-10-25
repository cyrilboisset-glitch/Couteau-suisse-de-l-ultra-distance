// Navigation par arborescence : Marque → Gamme → Génération (année, vitesses)
// → Type de pièce → Pièces. La gamme et l'année viennent de la table
// `gammes` de la base ; l'année n'est affichée que si elle est sourcée.
import { EMPTY_KNOWLEDGE } from './knowledge.js';

export const GENERIC = 'Composants (standards)';
const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

/** Gamme déduite du nom de génération quand la table ne la donne pas (ex. « 105 5700 (10v) » → « 105 »). */
export function gammeFromGeneration(generation) {
  if (!generation) return GENERIC;
  const s = generation.replace(/\s*\(.*?\)/g, '').trim();
  const m = s.match(/^(.+?)\s+(R?[A-Z]{0,3}\d{3,5}[A-Z]?)$/);
  if (m) return m[1];
  const rest = s.replace(/\s+\d+$/, '');
  return /^\d/.test(rest) ? GENERIC : rest;
}

/** Place d'une pièce dans l'arbre. */
export function placeOf(part, kb = EMPTY_KNOWLEDGE) {
  const generation = part.generation ?? '';
  const entry = kb.tables.gammes.find((e) => e.brand === part.brand && e.generation === generation);
  return {
    brand: part.brand,
    gamme: entry?.gamme ?? gammeFromGeneration(generation),
    generation,
    year: entry?.year ?? null,
    yearSource: entry?.year ? entry.source : null,
  };
}

const speedsOf = (parts) => [...new Set(parts.map((p) => p.attrs?.speeds).filter((n) => Number.isFinite(n) && n > 3))].sort((a, b) => a - b);
const speedLabel = (list) => (list.length ? (list.length === 1 ? `${list[0]}v` : `${list[0]}-${list[list.length - 1]}v`) : '');
const yearSpan = (years) => {
  const ys = years.filter(Boolean);
  if (!ys.length) return null;
  const a = Math.min(...ys);
  const b = Math.max(...ys);
  return a === b ? String(a) : `${a}-${b}`;
};

/**
 * Contenu d'un niveau de l'arbre.
 * path : { brand?, gamme?, generation?, type? } ; speeds : filtre facultatif (nombre de vitesses).
 * Renvoie { level: 'brands'|'gammes'|'generations'|'types'|'parts', items }.
 */
export function browse(parts, kb = EMPTY_KNOWLEDGE, path = {}, { speeds = null } = {}) {
  const placed = parts.map((p) => ({ p, at: placeOf(p, kb) }));
  const inSpeed = (x) => !speeds || x.p.attrs?.speeds === speeds;
  let pool = placed.filter(inSpeed);

  if (!path.brand) {
    return { level: 'brands', items: group(pool, (x) => x.at.brand).map(([brand, xs]) => ({ key: brand, label: brand, count: xs.length })).sort((a, b) => b.count - a.count || collator.compare(a.label, b.label)) };
  }
  pool = pool.filter((x) => x.at.brand === path.brand);

  if (path.gamme === undefined) {
    const items = group(pool, (x) => x.at.gamme).map(([gamme, xs]) => ({
      key: gamme, label: gamme, count: xs.length,
      speeds: speedLabel(speedsOf(xs.map((x) => x.p))),
      years: yearSpan(xs.map((x) => x.at.year)),
      generations: new Set(xs.map((x) => x.at.generation)).size,
    }));
    items.sort((a, b) => (a.key === GENERIC) - (b.key === GENERIC) || collator.compare(a.label, b.label));
    return { level: 'gammes', items };
  }
  pool = pool.filter((x) => x.at.gamme === path.gamme);

  if (path.generation === undefined) {
    const items = group(pool, (x) => x.at.generation).map(([generation, xs]) => ({
      key: generation, label: generation || 'Sans génération', count: xs.length,
      year: xs[0].at.year, yearSource: xs[0].at.yearSource,
      speeds: speedLabel(speedsOf(xs.map((x) => x.p))),
    }));
    // Plus récent d'abord ; sans année, par nombre de vitesses décroissant.
    const sv = (it) => Number(String(it.speeds).split('-').pop().replace('v', '')) || 0;
    items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || sv(b) - sv(a) || collator.compare(b.label, a.label));
    return { level: 'generations', items };
  }
  pool = pool.filter((x) => x.at.generation === path.generation);

  if (path.type === undefined) {
    return { level: 'types', items: group(pool, (x) => x.p.type).map(([type, xs]) => ({ key: type, count: xs.length })) };
  }
  pool = pool.filter((x) => x.p.type === path.type);
  return { level: 'parts', items: pool.map((x) => x.p).sort((a, b) => collator.compare(a.ref, b.ref)) };
}

/** Nombres de vitesses présents sous un chemin (pour les filtres). */
export function speedsAvailable(parts, kb, path = {}) {
  const pool = parts.filter((p) => {
    const at = placeOf(p, kb);
    return (!path.brand || at.brand === path.brand) && (path.gamme === undefined || at.gamme === path.gamme);
  });
  return speedsOf(pool);
}

function group(xs, keyFn) {
  const m = new Map();
  for (const x of xs) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return [...m.entries()];
}
