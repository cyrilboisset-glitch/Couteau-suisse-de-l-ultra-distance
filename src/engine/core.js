import { LEVEL, LEVEL_INFO } from '../levels.js';
import { hasOfficialSource, needsValidation } from '../schema.js';
import { EMPTY_KNOWLEDGE } from '../knowledge.js';
import { TRANSMISSION_RULES } from './rules/transmission.js';
import { FREINS_RULES } from './rules/freins.js';
import { PEDALIER_RULES } from './rules/pedalier.js';
import { ROUES_RULES } from './rules/roues.js';
import { partLabel } from './finding.js';

export const RULES = [...TRANSMISSION_RULES, ...FREINS_RULES, ...PEDALIER_RULES, ...ROUES_RULES];

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
      for (const f of [out].flat()) if (f) findings.push({ ...f, against: partLabel(b) });
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
    reasons: uniq(decisive.map((f) => f.message)),
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
