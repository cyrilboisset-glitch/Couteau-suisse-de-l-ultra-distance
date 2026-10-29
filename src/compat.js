// Toutes les pièces d'autres types compatibles avec une pièce donnée.
import { LEVEL, levelFromName } from './levels.js';
import { checkPair } from './engine/core.js';
import { EMPTY_KNOWLEDGE } from './knowledge.js';

const listOf = (v) => (Array.isArray(v) ? v : String(v).split('|').map((s) => s.trim()).filter(Boolean));

/** Pas de pignons prévus par le tirage d'un dérailleur (ou d'une manette). */
function pitchesOf(p, kb) {
  if (p.attrs?.pitch) return listOf(p.attrs.pitch);
  return kb.family(p.attrs?.family)?.pitch ?? [];
}

/** Nombre de vitesses arrière porté par la pièce (dérailleur, cassette, chaîne, manette droite). */
function rearSpeeds(p) {
  if (p.type === 'shifter' && p.attrs?.side === 'avant') return null;
  return ['rear_derailleur', 'cassette', 'chain', 'shifter'].includes(p.type) ? p.attrs?.speeds ?? null : null;
}

/**
 * Contrôles de contexte : sans manette ni reste du vélo, une paire dérailleur ↔ cassette
 * ou chaîne ↔ transmission n'est « réellement » compatible que si le pas et le nombre de
 * vitesses correspondent à la transmission d'origine de la pièce.
 * Renvoie true si la paire est à écarter.
 */
function contextReject(a, b, kb) {
  const [rd, cas] = a.type === 'rear_derailleur' && b.type === 'cassette' ? [a, b]
    : b.type === 'rear_derailleur' && a.type === 'cassette' ? [b, a] : [null, null];
  if (rd && rd.attrs?.minCog && cas.attrs?.minCog && cas.attrs.minCog < rd.attrs.minCog) return true;
  if (rd && rd.attrs?.system !== 'electronique') {
    const pitches = pitchesOf(rd, kb);
    if (pitches.length) {
      const cp = cas.attrs?.pitch;
      if (!cp) return rearSpeeds(rd) && rearSpeeds(rd) === cas.attrs?.speeds ? null : true;
      if (!pitches.includes(cp)) {
        const fit = pitches.map((p) => kb.pitchFit(cp, p)).find(Boolean);
        if (!fit || levelFromName(fit.level) > LEVEL.KNOWN) return true;
      }
    }
  }
  const [chain, other] = a.type === 'chain' ? [a, b] : b.type === 'chain' ? [b, a] : [null, null];
  if (chain) {
    const s1 = chain.attrs?.speeds;
    const s2 = rearSpeeds(other);
    if (s1 && s2 && s1 !== s2 && !(s1 <= 8 && s2 <= 8)) return true;
  }
  return null;
}

// Ordre d'affichage des groupes : de la commande vers la transmission, puis le freinage.
const TYPE_ORDER = ['shifter', 'rear_derailleur', 'cassette', 'chain', 'quick_link', 'front_derailleur', 'crankset', 'chainring',
  'bottom_bracket', 'brake_lever', 'brake_caliper', 'brake_pads', 'rotor', 'wheel', 'frame'];

const speedGap = (p, q) => {
  const a = rearSpeeds(p);
  const b = rearSpeeds(q);
  return a && b ? Math.abs(a - b) : 0;
};

/**
 * Teste `part` contre chaque pièce du catalogue d'un autre type.
 * Ne garde que les paires couvertes par au moins une règle, dont le niveau ne dépasse
 * pas `maxLevel` (par défaut : officiel ou connu) et qui passent les contrôles de contexte.
 * Renvoie des groupes { type, items: [{ part, result }] } triés par niveau puis référence.
 */
export function findCompatible(part, catalog, { kb = EMPTY_KNOWLEDGE, maxLevel = LEVEL.KNOWN } = {}) {
  const byType = new Map();
  for (const other of catalog) {
    if (other.id === part.id || other.type === part.type) continue;
    const result = checkPair(part, other, kb);
    if (!result.related || result.level > maxLevel) continue;
    if (contextReject(part, other, kb)) continue;
    if (!byType.has(other.type)) byType.set(other.type, []);
    byType.get(other.type).push({ part: other, result });
  }
  return [...byType.entries()]
    .map(([type, items]) => ({
      type,
      // Niveau, puis même nombre de vitesses d'abord, puis référence.
      items: items.sort((a, b) => a.result.level - b.result.level
        || speedGap(part, a.part) - speedGap(part, b.part)
        || String(a.part.ref).localeCompare(String(b.part.ref))),
    }))
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
}
