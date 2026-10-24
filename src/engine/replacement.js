// Remplacement d'une pièce cassée. Sans description du reste du vélo, on
// déduit de la pièce cassée des « voisins virtuels » (la manette, la cassette,
// le cadre… qui fonctionnaient avec elle) et on vérifie le candidat contre eux.
// Les pièces réelles fournies (`bike`) remplacent les voisins virtuels.
import { LEVEL } from '../levels.js';
import { EMPTY_KNOWLEDGE } from '../knowledge.js';
import { PART_TYPES } from '../schema.js';
import { aggregate, evaluatePair } from './core.js';
import { ok, degraded, incompatible, guard, partLabel, physique, aSourcer } from './finding.js';

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

function virtual(type, broken, attrs) {
  return {
    id: `virtuel:${type}`,
    type,
    virtual: true,
    discipline: broken.discipline,
    ref: `${PART_TYPES[type].label.toLowerCase()} d'origine (déduit de ${partLabel(broken)})`,
    attrs: clean(attrs),
  };
}

const HANGER_OF_MOUNT = { standard: 'standard', direct_mount: 'direct_mount', udh_direct: 'udh' };
const brakeOf = (x) => ({ brakeActuation: x.brakeActuation, fluid: x.fluid, cablePull: x.cablePull, hydraulicSystem: x.hydraulicSystem });

export function deriveNeighbors(broken) {
  const x = broken.attrs ?? {};
  const v = (type, attrs) => virtual(type, broken, attrs);
  switch (broken.type) {
    case 'rear_derailleur':
      return [
        v('shifter', { side: 'arriere', system: x.system, family: x.family, protocol: x.protocol, speeds: x.speeds }),
        v('cassette', { speeds: x.speeds, maxCog: x.maxCog }),
        v('frame', { rdHanger: HANGER_OF_MOUNT[x.mount] }),
        v('chain', { speeds: x.speeds }),
      ];
    case 'front_derailleur':
      return [
        v('shifter', { side: 'avant', system: x.system, family: x.family, protocol: x.protocol }),
        v('crankset', { chainrings: x.chainrings }),
        v('frame', { fdMount: x.mount }),
      ];
    case 'shifter': {
      const out = [];
      const shift = { system: x.system, family: x.family, protocol: x.protocol, speeds: x.speeds };
      if (x.side !== 'avant') out.push(v('rear_derailleur', shift), v('cassette', { speeds: x.speeds }));
      if (x.side === 'avant' || x.side === 'les_deux') out.push(v('front_derailleur', shift));
      if (x.brakeActuation) out.push(v('brake_caliper', brakeOf(x)));
      return out;
    }
    case 'cassette':
      return [
        v('wheel', { freehub: x.freehub, freewheelThread: x.freewheelThread }),
        v('shifter', { side: 'arriere', speeds: x.speeds }),
        v('rear_derailleur', { maxCog: x.maxCog, pitch: x.pitch }),
        v('chain', { speeds: x.chainSpeeds ?? x.speeds }),
      ];
    case 'chain':
      return [v('cassette', { speeds: x.speeds })];
    case 'crankset':
      return [v('bottom_bracket', { spindle: x.spindle })];
    case 'chainring':
      return [v('crankset', { ringInterface: x.ringInterface, bcd: x.bcd, bolts: x.bolts, dmType: x.dmType })];
    case 'bottom_bracket':
      return [v('frame', { bbShell: x.shell, bbShellWidth: x.shellWidth }), v('crankset', { spindle: x.spindle })];
    case 'brake_lever':
      return [v('brake_caliper', brakeOf(x))];
    case 'brake_caliper':
      // Pas de plaquettes virtuelles : un étrier neuf arrive avec les siennes.
      return [
        v('brake_lever', brakeOf(x)),
        v('frame', { brakeMount: x.mount }),
        v('wheel', { brakeInterface: x.brakeType }),
      ];
    case 'rotor':
      return [v('wheel', { brakeInterface: 'disque', rotorMount: x.mount })];
    case 'brake_pads':
      return [v('brake_caliper', { brakeType: 'disque', padShape: x.shape })];
    case 'quick_link':
      return [v('chain', { speeds: x.speeds, flattop: x.flattop })];
    case 'wheel': {
      // La cassette et le disque de la roue cassée sont remontés sur la nouvelle.
      const out = [v('frame', { axleType: x.axleType, axleDiameter: x.axleDiameter, axleWidth: x.axleWidth })];
      if (x.freehub) out.push(v('cassette', { kind: 'cassette', freehub: x.freehub }));
      if (x.freewheelThread) out.push(v('cassette', { kind: 'roue_libre', freewheelThread: x.freewheelThread }));
      if (x.rotorMount) out.push(v('rotor', { mount: x.rotorMount }));
      if (x.brakeInterface) out.push(v('brake_caliper', { brakeType: x.brakeInterface === 'les_deux' ? undefined : x.brakeInterface }));
      return out;
    }
    default:
      return [];
  }
}

const sameSlot = (a, b) => a.type === b.type
  && (a.type !== 'shifter' || !a.attrs?.side || !b.attrs?.side || a.attrs.side === b.attrs.side || b.attrs.side === 'les_deux');

function buildNeighbors(broken, bike) {
  const real = bike.filter((p) => p.id !== broken.id);
  const virtuals = deriveNeighbors(broken).filter((vp) => !real.some((p) => sameSlot(vp, p)));
  return [...real, ...virtuals];
}

const parseTeeth = (s) => String(s ?? '').split(/[-/]/).map(Number).filter((n) => Number.isFinite(n) && n > 0);

// --- Règles « système » : nécessitent plusieurs pièces réelles à la fois ---

const capaciteTotale = {
  id: 'transmission.capacite_totale',
  label: 'Capacité totale du dérailleur arrière',
  confidence: 'moyenne',
  source: physique('Capacité requise = (grand − petit pignon) + (grand − petit plateau).'),
  evaluate(rd, neighbors) {
    const cas = neighbors.find((p) => p.type === 'cassette' && !p.virtual);
    const crank = neighbors.find((p) => p.type === 'crankset' && !p.virtual);
    if (!cas || !crank) return null;
    const g = guard(this, [[rd, ['totalCapacity']], [cas, ['maxCog', 'minCog']]]);
    if (g) return g.finding;
    const teeth = parseTeeth(crank.attrs?.teeth);
    if (!teeth.length) return null;
    const need = (cas.attrs.maxCog - cas.attrs.minCog) + (Math.max(...teeth) - Math.min(...teeth));
    const cap = rd.attrs.totalCapacity;
    if (need <= cap) return ok(this, `Capacité requise ${need} dents ≤ ${cap} dents.`);
    return degraded(this, `Capacité requise ${need} dents pour ${cap} dents (−${need - cap}).`, {
      limitation: 'Chaîne réglée sur grand plateau / grand pignon : elle sera détendue en petit plateau / petits pignons. Éviter ces croisements.',
      adjustments: ['Longueur de chaîne calculée sur grand plateau + grand pignon'],
    });
  },
};

const pignonSelonPlateaux = {
  id: 'transmission.pignon_selon_plateaux',
  label: 'Plus grand pignon admis selon le nombre de plateaux',
  confidence: 'moyenne',
  source: { kind: 'officiel', ref: 'Plus grand pignon max en double / triple indiqué par le constructeur' },
  evaluate(rd, neighbors) {
    const cas = neighbors.find((p) => p.type === 'cassette' && !p.virtual);
    const crank = neighbors.find((p) => p.type === 'crankset' && !p.virtual);
    const n = crank?.attrs?.chainrings;
    const max = n === 3 ? (rd.attrs.maxCog3x ?? rd.attrs.maxCog2x) : n === 2 ? rd.attrs.maxCog2x : null;
    if (!cas?.attrs?.maxCog || !max) return null;
    if (cas.attrs.maxCog <= max) return ok(this, `${cas.attrs.maxCog} dents ≤ ${max} dents admis en ${n} plateaux.`);
    return incompatible(this, `En ${n} plateaux, ce dérailleur n'admet que ${max} dents (cassette : ${cas.attrs.maxCog}).`);
  },
};

const SYSTEM_RULES = { rear_derailleur: [capaciteTotale, pignonSelonPlateaux] };

// --- Comparaison pièce cassée / candidat : constats + « ce qui change » ---

function sameTypeChecks(broken, cand, neighbors) {
  const b = broken.attrs ?? {};
  const c = cand.attrs ?? {};
  const findings = [];
  const changes = [];
  const realCtx = (type) => neighbors.some((p) => p.type === type && !p.virtual);

  if (broken.discipline && cand.discipline && broken.discipline !== cand.discipline) {
    changes.push(`Pièce ${cand.discipline} à la place d'une pièce ${broken.discipline} : seuls les attributs techniques ci-dessous comptent.`);
  }
  if (broken.generation && cand.generation && broken.generation !== cand.generation) {
    changes.push(`Génération différente (${broken.generation} → ${cand.generation}).`);
  }
  if (b.speeds && c.speeds && b.speeds !== c.speeds) changes.push(`${b.speeds} vitesses → ${c.speeds} vitesses.`);

  switch (broken.type) {
    case 'rear_derailleur': {
      if (b.totalCapacity && c.totalCapacity) {
        if (c.totalCapacity > b.totalCapacity) {
          changes.push(`Capacité plus grande (${c.totalCapacity} au lieu de ${b.totalCapacity} dents) : chape plus longue, chaîne probablement à rallonger.`);
        } else if (c.totalCapacity < b.totalCapacity && !(realCtx('cassette') && realCtx('crankset'))) {
          findings.push(ok(capaciteTotale, `Capacité ${c.totalCapacity} dents (l'original : ${b.totalCapacity}).`, {
            condition: `La capacité requise par votre transmission doit rester ≤ ${c.totalCapacity} dents (sinon éviter les croisements).`,
          }));
        }
      }
      if (c.maxCog && b.maxCog && c.maxCog > b.maxCog) changes.push(`Accepte des pignons plus grands (${c.maxCog} au lieu de ${b.maxCog} dents).`);
      if (b.cageLength && c.cageLength && b.cageLength !== c.cageLength) changes.push(`Chape ${c.cageLength} au lieu de ${b.cageLength}.`);
      if (b.clutch === true && c.clutch === false) changes.push("Pas d'embrayage (clutch) : la chaîne bat davantage sur mauvais revêtement.");
      if (b.clutch === false && c.clutch === true) changes.push('Embrayage (clutch) : chaîne plus stable, passages un peu plus fermes.');
      if (b.maxFrontChainrings && c.maxFrontChainrings && c.maxFrontChainrings < b.maxFrontChainrings) {
        changes.push(`Prévu pour ${c.maxFrontChainrings} plateau(x) au plus : sur un double, vérifier la capacité.`);
      }
      if (b.mount && c.mount && b.mount !== c.mount) changes.push(`Fixation ${c.mount} au lieu de ${b.mount}.`);
      break;
    }
    case 'cassette': {
      if (b.maxCog && c.maxCog && c.maxCog !== b.maxCog) {
        changes.push(c.maxCog > b.maxCog
          ? `Plus grand pignon ${c.maxCog} dents (au lieu de ${b.maxCog}) : chaîne probablement à rallonger, vis B à régler.`
          : `Plus grand pignon ${c.maxCog} dents (au lieu de ${b.maxCog}) : braquets moins faciles en montée.`);
      }
      if (b.minCog && c.minCog && c.minCog !== b.minCog) changes.push(`Plus petit pignon ${c.minCog} dents (au lieu de ${b.minCog}).`);
      break;
    }
    case 'crankset': {
      if (b.armLength && c.armLength && b.armLength !== c.armLength) changes.push(`Manivelles de ${c.armLength} mm au lieu de ${b.armLength} mm.`);
      if (b.teeth && c.teeth && b.teeth !== c.teeth) changes.push(`Plateaux ${c.teeth} au lieu de ${b.teeth} : longueur de chaîne et dérailleur avant à revoir.`);
      if (b.chainrings && c.chainrings && b.chainrings !== c.chainrings) changes.push(`${c.chainrings} plateau(x) au lieu de ${b.chainrings}.`);
      if (b.chainline && c.chainline && b.chainline !== c.chainline) {
        const diff = Math.abs(c.chainline - b.chainline);
        const msg = `Ligne de chaîne ${c.chainline} mm au lieu de ${b.chainline} mm (écart ${diff} mm).`;
        if (diff >= 5) {
          findings.push(degraded({ id: 'pedalier.ligne_chaine', label: 'Ligne de chaîne', confidence: 'basse' }, msg, {
            limitation: 'Croisements plus marqués : bruit, usure accélérée, risque de déraillement (surtout en mono-plateau).',
            source: aSourcer('Seuil de 5 mm générique, à valider'),
          }));
        } else changes.push(msg);
      }
      break;
    }
    case 'rotor': {
      if (b.diameter && c.diameter && b.diameter !== c.diameter) {
        findings.push(ok({ id: 'freins.diametre_disque', label: 'Diamètre de disque', confidence: 'haute', source: physique("L'étrier est positionné pour un diamètre de disque donné.") },
          `Disque de ${c.diameter} mm au lieu de ${b.diameter} mm.`, {
            condition: `Ne pas dépasser le diamètre maximal autorisé par le cadre / la fourche.`,
            extraParts: [`Adaptateur d'étrier pour disque de ${c.diameter} mm`],
          }));
      }
      break;
    }
    case 'brake_caliper': {
      if (b.padShape && c.padShape && b.padShape !== c.padShape) changes.push(`Plaquettes de rechange différentes (forme ${c.padShape}).`);
      break;
    }
    case 'shifter': {
      if (b.form && c.form && b.form !== c.form) changes.push(`Forme ${c.form} au lieu de ${b.form} : vérifier le diamètre de cintre et la position.`);
      break;
    }
    case 'chain': {
      changes.push('Mettre la chaîne à la bonne longueur.');
      break;
    }
    default:
  }
  return { findings, changes };
}

/**
 * Le candidat peut-il remplacer la pièce cassée ?
 * @param {object} opts.kb   base de connaissances (createKnowledge)
 * @param {object[]} opts.bike pièces connues du vélo (facultatif)
 */
export function checkReplacement(broken, candidate, { kb = EMPTY_KNOWLEDGE, bike = [] } = {}) {
  if (broken.type !== candidate.type) {
    const rule = { id: 'remplacement.type', label: 'Type de pièce', absolute: true, confidence: 'haute', source: physique('Type de pièce différent') };
    return { ...aggregate([incompatible(rule, `Pas le même type de pièce (${candidate.type} ≠ ${broken.type}).`)]), changes: [] };
  }
  const neighbors = buildNeighbors(broken, bike);
  const findings = neighbors.flatMap((n) => evaluatePair(candidate, n, kb));
  for (const rule of SYSTEM_RULES[candidate.type] ?? []) {
    const f = rule.evaluate(candidate, neighbors, kb);
    if (f) findings.push(f);
  }
  const same = sameTypeChecks(broken, candidate, neighbors);
  findings.push(...same.findings);
  const realParts = [broken, candidate, ...neighbors.filter((n) => !n.virtual)];
  const result = aggregate(findings, realParts);
  return { ...result, changes: same.changes, basedOnHypotheses: neighbors.some((n) => n.virtual) };
}

const CONF = { haute: 0, moyenne: 1, basse: 2 };

function compare(broken) {
  return (x, y) => {
    const a = x.result;
    const b = y.result;
    return a.level - b.level
      || (a.conditions.length + a.extraParts.length) - (b.conditions.length + b.extraParts.length)
      || Number(a.toValidate) - Number(b.toValidate)
      || CONF[a.confidence] - CONF[b.confidence]
      // Simple départage : la discipline ne bloque jamais, elle ne fait que trier les ex æquo.
      || Number(x.part.discipline !== broken.discipline) - Number(y.part.discipline !== broken.discipline)
      || String(x.part.ref).localeCompare(String(y.part.ref));
  };
}

/** Toutes les pièces du catalogue pouvant remplacer la pièce cassée, classées. */
export function findReplacements(broken, catalog, { kb = EMPTY_KNOWLEDGE, bike = [], includeIncompatible = false } = {}) {
  return catalog
    .filter((p) => p.type === broken.type && p.id !== broken.id)
    .map((part) => ({ part, result: checkReplacement(broken, part, { kb, bike }) }))
    .filter((r) => includeIncompatible || r.result.level !== LEVEL.INCOMPATIBLE)
    .sort(compare(broken));
}

/** Mode « j'ai ça sous la main » : évalue chaque pièce disponible, y compris les incompatibles (avec la raison). */
export function checkAvailable(broken, available, opts = {}) {
  return findReplacements(broken, available, { ...opts, includeIncompatible: true });
}
