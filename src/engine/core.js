import { LEVEL, LEVEL_INFO } from '../levels.js';
import { hasOfficialSource, needsValidation } from '../schema.js';
import { EMPTY_KNOWLEDGE } from '../knowledge.js';
import { TRANSMISSION_RULES } from './rules/transmission.js';
import { FREINS_RULES } from './rules/freins.js';
import { PEDALIER_RULES } from './rules/pedalier.js';
import { ROUES_RULES } from './rules/roues.js';
import { partLabel } from './finding.js';

export const RULES = [...TRANSMISSION_RULES, ...FREINS_RULES, ...PEDALIER_RULES, ...ROUES_RULES];

// Organes de sécurité : en freinage, seules les solutions officielles ou connues sont proposées.
export const SAFETY_TYPES = new Set(['brake_lever', 'brake_caliper', 'rotor', 'brake_pads']);
export const isSafetyPart = (p) => SAFETY_TYPES.has(p?.type);
const isBrakeRule = (rule) => rule.id.startsWith('freins.') || rule.between.flat().some((t) => SAFETY_TYPES.has(t));

/** Un dépannage sur le freinage devient un refus : on ne bricole pas un frein. */
function brakeSafety(f) {
  if (f.level !== LEVEL.DEGRADED) return f;
  return {
    ...f,
    level: LEVEL.INCOMPATIBLE,
    absolute: false,
    toValidate: true,
    safety: true,
  };
}

export const BRAKE_SAFETY_NOTE = 'Sécurité freinage : les solutions de dépannage sont refusées sur les freins (seules les compatibilités officielles ou connues sont proposées).';

const CONFIDENCE_RANK = { haute: 3, moyenne: 2, basse: 1 };
const uniq = (xs) => [...new Set(xs.filter(Boolean))];

/** Applique toutes les règles qui concernent la paire (dans un sens ou l'autre). */
export function evaluatePair(a, b, kb = EMPTY_KNOWLEDGE) {
  const findings = [];
  for (const rule of RULES) {
    for (const [ta, tb] of rule.between) {
      let args = null;
      if (a.type === ta && b.type === tb) args = [a, b];
      else if (a.type === tb && b.type === ta) args = [b, a];
      if (!args) continue;
      const out = rule.evaluate(args[0], args[1], kb);
      for (const f of [out].flat()) {
        if (f) findings.push({ ...(isBrakeRule(rule) ? brakeSafety(f) : f), against: partLabel(b) });
      }
      break;
    }
  }
  return findings;
}

/**
 * Agrège des constats : le niveau est le pire constat. Un résultat ne peut
 * être « 100 % officiel » que si toutes les pièces réelles impliquées ont une
 * source constructeur ; sinon il est plafonné à « compatible connu ».
 */
export function aggregate(findings, parts = []) {
  const notes = [];
  let level;
  if (!findings.length) {
    level = LEVEL.DEGRADED;
    notes.push('Aucune règle ne permet de vérifier cette combinaison : à contrôler sur place.');
  } else {
    level = Math.max(...findings.map((f) => f.level));
  }
  let capped = false;
  const unsourced = parts.filter((p) => p && !p.virtual && !hasOfficialSource(p));
  if (level === LEVEL.OFFICIAL && unsourced.length) {
    level = LEVEL.KNOWN;
    capped = true;
    notes.push(`Données non sourcées officiellement : ${unsourced.map(partLabel).join(', ')}.`);
  }
  const pending = parts.filter((p) => p && !p.virtual && needsValidation(p));
  if (pending.length) notes.push(`Données à valider : ${pending.map(partLabel).join(', ')}.`);
  const sorted = [...findings].sort((x, y) => y.level - x.level);
  const decisive = sorted.filter((f) => f.level === level);
  const confidence = (decisive.length ? decisive : sorted)
    .map((f) => f.confidence)
    .reduce((min, c) => (CONFIDENCE_RANK[c] < CONFIDENCE_RANK[min] ? c : min), 'haute');
  return {
    level,
    info: LEVEL_INFO[level],
    absolute: findings.some((f) => f.absolute),
    findings: sorted,
    reasons: uniq([decisive.some((f) => f.safety) && BRAKE_SAFETY_NOTE, ...decisive.map((f) => f.message)]),
    safety: findings.some((f) => f.safety) || parts.some(isSafetyPart),
    conditions: uniq(findings.map((f) => f.condition)),
    limitations: uniq(findings.map((f) => f.limitation)),
    adjustments: uniq(findings.flatMap((f) => f.adjustments)),
    tools: uniq(findings.flatMap((f) => f.tools)),
    extraParts: uniq(findings.flatMap((f) => f.extraParts)),
    missing: uniq(findings.flatMap((f) => f.missing)),
    toValidate: capped || pending.length > 0 || findings.some((f) => f.toValidate && f.level > LEVEL.OFFICIAL),
    confidence: findings.length ? confidence : 'basse',
    notes,
  };
}

/** Compatibilité directe entre deux pièces de types différents (ex. manette ↔ dérailleur). */
export function checkPair(a, b, kb = EMPTY_KNOWLEDGE) {
  const findings = evaluatePair(a, b, kb);
  if (!findings.length) return { related: false, ...aggregate([], [a, b]) };
  return { related: true, ...aggregate(findings, [a, b]) };
}
