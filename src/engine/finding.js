// Un « constat » est le verdict d'une règle sur une paire de pièces.
import { LEVEL, levelFromName } from '../levels.js';

export const physique = (ref) => ({ kind: 'physique', ref });
export const aSourcer = (ref) => ({ kind: 'a_sourcer', ref });

export const partLabel = (p) => (p.virtual ? p.ref : `${p.brand ?? ''} ${p.ref ?? p.id}`.trim());

export function makeFinding(rule, level, message, extra = {}) {
  const source = extra.source ?? rule.source ?? aSourcer(null);
  // Toute compatibilité « connu » ou « dépannage » non sourcée officiellement est à valider.
  const toValidate = extra.toValidate
    ?? ((level === LEVEL.KNOWN || level === LEVEL.DEGRADED) && source.kind !== 'officiel');
  return {
    rule: rule.id,
    level,
    message,
    absolute: level === LEVEL.INCOMPATIBLE && (extra.absolute ?? Boolean(rule.absolute)),
    limitation: extra.limitation ?? null,
    // Hypothèse non vérifiable sans connaître le reste du vélo.
    condition: extra.condition ?? null,
    adjustments: extra.adjustments ?? [],
    tools: extra.tools ?? [],
    // Pièces supplémentaires à se procurer.
    extraParts: extra.extraParts ?? [],
    missing: extra.missing ?? [],
    source,
    confidence: extra.confidence ?? rule.confidence ?? 'moyenne',
    toValidate,
  };
}

export const ok = (rule, msg, extra) => makeFinding(rule, LEVEL.OFFICIAL, msg, extra);
export const known = (rule, msg, extra) => makeFinding(rule, LEVEL.KNOWN, msg, extra);
export const degraded = (rule, msg, extra) => makeFinding(rule, LEVEL.DEGRADED, msg, extra);
export const incompatible = (rule, msg, extra) => makeFinding(rule, LEVEL.INCOMPATIBLE, msg, extra);

const isEmpty = (v) => v === undefined || v === null || v === '';

/**
 * Vérifie la présence des attributs nécessaires à une règle.
 * - attribut absent sur une pièce réelle → constat « donnée manquante »
 *   (incompatible pour une règle absolue : on ne garantit pas ce qu'on ne sait pas) ;
 * - attribut absent sur une pièce virtuelle (déduite de la pièce cassée) →
 *   la règle est simplement ignorée, faute de contexte.
 * Renvoie `null` si la règle peut s'appliquer.
 */
export function guard(rule, pairs) {
  const missing = [];
  let noContext = false;
  for (const [p, keys] of pairs) {
    for (const k of keys) {
      if (!isEmpty(p.attrs?.[k])) continue;
      if (p.virtual) noContext = true;
      else missing.push(`${partLabel(p)} → ${k}`);
    }
  }
  if (missing.length) {
    return {
      finding: makeFinding(rule, rule.absolute ? LEVEL.INCOMPATIBLE : LEVEL.DEGRADED,
        `Donnée manquante, vérification impossible (${rule.label}) : ${missing.join(', ')}.`,
        { missing, absolute: false, confidence: 'basse', toValidate: true, source: aSourcer('Donnée absente de la base') }),
    };
  }
  return noContext ? { finding: null } : null;
}

/** Transforme une entrée de la base de connaissances en constat. */
export function fromEntry(rule, entry, extra = {}) {
  const level = levelFromName(entry.level);
  return makeFinding(rule, level, entry.message, {
    limitation: entry.limitation,
    adjustments: entry.adjustments,
    tools: entry.tools,
    extraParts: entry.extraParts,
    source: entry.source,
    confidence: entry.confidence,
    toValidate: entry.status === 'a_valider'
      || ((level === LEVEL.KNOWN || level === LEVEL.DEGRADED) && entry.source?.kind !== 'officiel'),
    ...extra,
  });
}
