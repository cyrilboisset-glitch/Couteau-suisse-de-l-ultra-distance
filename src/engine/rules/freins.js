import { DISC_MOUNTS, RIM_MOUNTS } from '../../schema.js';
import { ok, known, degraded, incompatible, guard, fromEntry, physique, aSourcer } from '../finding.js';

const LEVERS = [['brake_lever', 'brake_caliper'], ['shifter', 'brake_caliper']];

// Une manette sans frein intégré n'a rien à dire à un étrier.
const noBrake = (lever) => lever.type === 'shifter' && !lever.attrs?.brakeActuation && !lever.virtual;

const brakeTypeOfMount = (m) => (DISC_MOUNTS.includes(m) ? 'disque' : RIM_MOUNTS.includes(m) ? 'jante' : null);

export const hydrauliqueMecanique = {
  id: 'freins.actionnement',
  label: 'Hydraulique ≠ mécanique',
  between: LEVERS,
  absolute: true,
  confidence: 'haute',
  source: physique('Un levier hydraulique pousse du fluide, un levier mécanique tire un câble : aucune transmission possible entre les deux.'),
  evaluate(lever, cal) {
    if (noBrake(lever)) return null;
    const g = guard(this, [[lever, ['brakeActuation']], [cal, ['brakeActuation']]]);
    if (g) return g.finding;
    const l = lever.attrs.brakeActuation;
    const c = cal.attrs.brakeActuation;
    const lbl = { mecanique: 'mécanique', hydraulique: 'hydraulique' };
    if (l !== c) return incompatible(this, `Levier ${lbl[l] ?? l} et frein ${lbl[c] ?? c} : jamais compatibles.`);
    return ok(this, `Freinage ${l} des deux côtés.`);
  },
};

export const fluide = {
  id: 'freins.fluide',
  label: 'Fluide minéral ≠ DOT',
  between: LEVERS,
  absolute: true,
  confidence: 'haute',
  source: physique('Le DOT détruit les joints prévus pour l\'huile minérale et inversement : ne JAMAIS mélanger.'),
  evaluate(lever, cal, kb) {
    if (noBrake(lever)) return null;
    if (lever.attrs?.brakeActuation !== 'hydraulique' || cal.attrs?.brakeActuation !== 'hydraulique') return null;
    const g = guard(this, [[lever, ['fluid']], [cal, ['fluid']]]);
    if (g) return g.finding;
    if (lever.attrs.fluid !== cal.attrs.fluid) {
      return incompatible(this, `Fluide ${lever.attrs.fluid} côté levier, ${cal.attrs.fluid} côté étrier : JAMAIS de mélange (joints détruits, perte de freinage).`);
    }
    const a = lever.attrs.fluidSpec;
    const b = cal.attrs.fluidSpec;
    if (a && b && a !== b) {
      const entry = kb.fluidFit(a, b);
      if (entry) return fromEntry(this, entry);
      // Les huiles minérales ne sont pas normalisées : joints prévus pour une huile précise.
      return incompatible(this, `Fluides différents (${a} / ${b}) : chaque constructeur impose son huile, joints non garantis.`, {
        absolute: false,
        source: { kind: 'officiel', ref: 'SRAM : huile minérale Maxima exclusivement pour Maven ; huiles minérales non normalisées', url: 'https://support.sram.com/hc/en-us/articles/23145900069275-Do-Maven-brakes-use-mineral-oil-or-DOT-fluid' },
      });
    }
    return ok(this, `Même fluide (${b ?? a ?? cal.attrs.fluid}).`);
  },
};

export const systemeHydraulique = {
  id: 'freins.systeme_hydraulique',
  label: 'Maître-cylindre ↔ pistons d\'étrier',
  between: LEVERS,
  confidence: 'moyenne',
  evaluate(lever, cal, kb) {
    if (noBrake(lever)) return null;
    if (lever.attrs?.brakeActuation !== 'hydraulique' || cal.attrs?.brakeActuation !== 'hydraulique') return null;
    if (lever.attrs.fluid !== cal.attrs.fluid) return null;
    const service = {
      adjustments: ['Raccorder la durite (olive et insert adaptés à la durite)', 'Purger le circuit'],
      tools: ['Kit de purge', `Fluide ${cal.attrs.fluid === 'dot' ? 'DOT' : 'minéral'} du constructeur`],
    };
    const g = guard(this, [[lever, ['hydraulicSystem']], [cal, ['hydraulicSystem']]]);
    if (g) return g.finding ? { ...g.finding, ...service } : null;
    const l = lever.attrs.hydraulicSystem;
    const c = cal.attrs.hydraulicSystem;
    if (l === c) {
      return ok(this, `Même système hydraulique (${l}).`, { ...service, source: { kind: 'officiel', ref: 'Système hydraulique identique (voir sources des pièces)' } });
    }
    const entry = kb.hydraulic(l, c);
    if (entry) {
      const f = fromEntry(this, entry);
      return { ...f, adjustments: [...service.adjustments, ...f.adjustments], tools: [...service.tools, ...f.tools] };
    }
    return degraded(this, `Même fluide mais systèmes différents (${l} / ${c}).`, {
      ...service,
      limitation: 'Rapport maître-cylindre / pistons non prévu : course du levier et puissance modifiées, raccords de durite spécifiques à chaque marque.',
      source: aSourcer('Croisement de systèmes non documenté'),
    });
  },
};

export const tirageCable = {
  id: 'freins.tirage_cable',
  label: 'Tirage câble court (route) ≠ long (V-brake / disque mécanique VTT)',
  between: LEVERS,
  absolute: true,
  confidence: 'haute',
  source: physique('Levier court + frein long : course insuffisante, les patins touchent à peine. Levier long + frein court : effet de levier excessif, blocage de roue. Dangereux dans les deux cas.'),
  evaluate(lever, cal) {
    if (noBrake(lever)) return null;
    if (lever.attrs?.brakeActuation !== 'mecanique' || cal.attrs?.brakeActuation !== 'mecanique') return null;
    const g = guard(this, [[lever, ['cablePull']], [cal, ['cablePull']]]);
    if (g) return g.finding;
    const l = lever.attrs.cablePull;
    const c = cal.attrs.cablePull;
    if (l === c) return ok(this, `Même tirage câble (${l}).`, { adjustments: ['Régler la tension de câble'] });
    return incompatible(this, l === 'court'
      ? 'Levier à tirage court sur frein à tirage long : course insuffisante, freinage inefficace.'
      : 'Levier à tirage long sur frein à tirage court : blocage brutal, aucun dosage.');
  },
};

export const porteeEtrier = {
  id: 'freins.portee',
  label: 'Portée de l\'étrier ↔ cadre / fourche',
  between: [['brake_caliper', 'frame']],
  confidence: 'haute',
  source: physique('Le patin doit atteindre la piste de la jante : la portée de l\'étrier doit couvrir la distance boulon → jante du cadre et de la fourche.'),
  evaluate(cal, frame) {
    if (cal.attrs?.brakeType !== 'jante' || cal.attrs?.mount !== 'etrier_central') return null;
    if (!frame.attrs?.brakeReach) return null;
    const g = guard(this, [[cal, ['reachMax']]]);
    if (g) return g.finding;
    const r = frame.attrs.brakeReach;
    const { reachMin: a, reachMax: b } = cal.attrs;
    // Le constructeur ne donne parfois que la portée maximale.
    if (a === undefined || a === null) {
      if (r <= b) {
        return ok(this, `Portée jusqu'à ${b} mm, cadre ${r} mm.`, {
          condition: 'Portée minimale non renseignée : vérifier que les patins ne descendent pas sous la piste de freinage.',
        });
      }
      return incompatible(this, `Portée maximale ${b} mm trop courte pour ce cadre (${r} mm) : les patins n'atteignent pas la jante.`, { absolute: false });
    }
    if (r >= a && r <= b) return ok(this, `Portée ${a}–${b} mm, cadre ${r} mm.`);
    return incompatible(this, r > b
      ? `Portée ${a}–${b} mm trop courte pour ce cadre (${r} mm) : les patins n'atteignent pas la jante.`
      : `Portée ${a}–${b} mm trop longue pour ce cadre (${r} mm) : les patins passent sous la jante (risque de toucher le pneu).`, {
      absolute: false,
    });
  },
};

export const disqueJanteCadre = {
  id: 'freins.fixation',
  label: 'Frein ↔ fixation du cadre (disque ≠ jante)',
  between: [['brake_caliper', 'frame']],
  absolute: true,
  confidence: 'haute',
  source: physique('Un étrier à disque ne se fixe pas sur des tenons de frein sur jante, et inversement.'),
  evaluate(cal, frame, kb) {
    const g = guard(this, [[cal, ['brakeType', 'mount']], [frame, ['brakeMount']]]);
    if (g) return g.finding;
    const frameType = brakeTypeOfMount(frame.attrs.brakeMount);
    if (frameType && frameType !== cal.attrs.brakeType) {
      return incompatible(this, `Frein ${cal.attrs.brakeType === 'disque' ? 'à disque' : 'sur jante'} sur un cadre prévu pour un frein ${frameType === 'disque' ? 'à disque' : 'sur jante'}.`);
    }
    const m = cal.attrs.mount;
    const f = frame.attrs.brakeMount;
    if (m === f) return ok(this, `Même fixation (${m}).`);
    const entry = kb.brakeMountAdapter(m, f);
    if (entry) {
      const f2 = fromEntry(this, entry);
      if (entry.adapter) f2.extraParts = [entry.adapter, ...f2.extraParts];
      return f2;
    }
    return incompatible(this, `Fixation ${m} sur cadre ${f} : aucun adaptateur documenté.`, {
      absolute: false, source: aSourcer('Aucune entrée dans la base'),
    });
  },
};

export const freinRoue = {
  id: 'freins.roue',
  label: 'Frein ↔ roue (disque ≠ jante)',
  between: [['brake_caliper', 'wheel']],
  absolute: true,
  confidence: 'haute',
  source: physique('Frein à disque : moyeu avec fixation disque. Frein sur jante : jante avec piste de freinage.'),
  evaluate(cal, wheel) {
    const g = guard(this, [[cal, ['brakeType']], [wheel, ['brakeInterface']]]);
    if (g) return g.finding;
    const w = wheel.attrs.brakeInterface;
    if (w === 'les_deux' || w === cal.attrs.brakeType) return ok(this, 'Roue adaptée au type de frein.');
    return incompatible(this, cal.attrs.brakeType === 'disque'
      ? 'Frein à disque sur une roue sans fixation de disque.'
      : 'Frein sur jante sur une jante sans piste de freinage.');
  },
};

export const etrierDisque = {
  id: 'freins.etrier_disque',
  label: 'Étrier ↔ disque',
  between: [['brake_caliper', 'rotor']],
  absolute: true,
  confidence: 'haute',
  source: physique('Un frein sur jante ne freine pas un disque.'),
  evaluate(cal) {
    const g = guard(this, [[cal, ['brakeType']]]);
    if (g) return g.finding;
    if (cal.attrs.brakeType !== 'disque') return incompatible(this, 'Frein sur jante : aucun usage d\'un disque.');
    return null;
  },
};

export const formePlaquette = {
  id: 'freins.forme_plaquette',
  label: 'Forme de plaquette ↔ étrier',
  between: [['brake_caliper', 'brake_pads']],
  absolute: true,
  confidence: 'haute',
  source: physique('Une plaquette ne se monte que dans un étrier de même forme.'),
  evaluate(cal, pads) {
    const g = guard(this, [[cal, ['padShape']], [pads, ['shape']]]);
    if (g) return g.finding;
    if (cal.attrs.padShape === pads.attrs.shape) return ok(this, `Même forme de plaquette (${pads.attrs.shape}).`);
    return incompatible(this, `Forme de plaquette ${pads.attrs.shape} ≠ ${cal.attrs.padShape} attendue par l'étrier.`);
  },
};

export const plaquetteDisque = {
  id: 'freins.compose',
  label: 'Composé de plaquette ↔ disque',
  between: [['brake_pads', 'rotor']],
  confidence: 'moyenne',
  source: { kind: 'officiel', ref: 'Restriction « résine seulement » indiquée sur le disque par le constructeur' },
  evaluate(pads, rotor) {
    if (rotor.attrs?.padCompat !== 'resine_seulement') return null;
    const g = guard(this, [[pads, ['compound']]]);
    if (g) return g.finding;
    if (pads.attrs.compound === 'resine') return ok(this, 'Plaquettes résine sur disque résine.');
    return degraded(this, 'Plaquettes métalliques sur disque prévu « résine seulement ».', {
      limitation: 'Usure rapide du disque et échauffement : à remplacer dès que possible.',
      source: aSourcer('Contraire à la doc constructeur ; tolérance de dépannage à valider'),
    });
  },
};

export const fixationDisque = {
  id: 'freins.fixation_disque',
  label: 'Disque 6 trous / Center Lock ↔ moyeu',
  between: [['rotor', 'wheel']],
  absolute: true,
  confidence: 'haute',
  source: physique('Un disque Center Lock n\'a pas de trous de vis ; un disque 6 trous se monte sur Center Lock par adaptateur.'),
  evaluate(rotor, wheel) {
    if (wheel.attrs?.brakeInterface === 'jante') return incompatible(this, 'Roue sans fixation de disque.');
    const g = guard(this, [[rotor, ['mount']], [wheel, ['rotorMount']]]);
    if (g) return g.finding;
    const r = rotor.attrs.mount;
    const w = wheel.attrs.rotorMount;
    if (r === w) return ok(this, `Même fixation (${r}).`);
    if (r === 'six_trous' && w === 'centerlock') {
      return known(this, 'Disque 6 trous sur moyeu Center Lock.', {
        extraParts: ['Adaptateur Center Lock → 6 trous'],
        tools: ['Outil de bague Center Lock'],
        source: physique('Adaptateur Center Lock → 6 trous'),
      });
    }
    return incompatible(this, 'Disque Center Lock sur moyeu 6 trous : impossible.');
  },
};

export const diametreMax = {
  id: 'freins.diametre_max',
  label: 'Diamètre de disque ↔ maximum du cadre / de la fourche',
  between: [['rotor', 'frame']],
  absolute: true,
  confidence: 'haute',
  source: { kind: 'officiel', ref: 'Diamètre maximal indiqué par le fabricant du cadre / de la fourche' },
  evaluate(rotor, frame) {
    if (!frame.attrs?.maxRotor) return null;
    const g = guard(this, [[rotor, ['diameter']]]);
    if (g) return g.finding;
    if (rotor.attrs.diameter > frame.attrs.maxRotor) {
      return incompatible(this, `Disque de ${rotor.attrs.diameter} mm au-delà des ${frame.attrs.maxRotor} mm autorisés : risque de rupture de la fixation.`);
    }
    return ok(this, `Disque de ${rotor.attrs.diameter} mm ≤ ${frame.attrs.maxRotor} mm autorisés.`);
  },
};

const PI_ROTORS = { kind: 'officiel', ref: 'Shimano productinfo C-461 – disques à piste étroite (2 pièces) incompatibles avec les étriers pour disque à piste large (interférence) ; disques à piste large réservés aux plaquettes résine', url: 'https://productinfo.shimano.com/en/compatibility/C-461' };

export const pisteDisque = {
  id: 'freins.piste_disque',
  label: 'Largeur de piste du disque ↔ étrier',
  between: [['brake_caliper', 'rotor']],
  absolute: true,
  confidence: 'haute',
  source: PI_ROTORS,
  evaluate(cal, rotor) {
    // Donnée propre à certains constructeurs : sans elle, la règle ne s'applique pas.
    const c = cal.attrs?.rotorTrack;
    const r = rotor.attrs?.rotorTrack;
    if (!c || !r) return null;
    if (c === 'large' && r === 'etroite') {
      return incompatible(this, 'Disque à piste étroite dans un étrier prévu pour disque à piste large : interférence.');
    }
    if (c === 'etroite' && r === 'large') {
      return ok(this, 'Disque à piste large accepté par cet étrier (plaquettes résine seulement).', {
        condition: 'Plaquettes résine uniquement avec ce disque.',
      });
    }
    return ok(this, `Piste de disque ${r} prévue pour cet étrier.`);
  },
};

export const FREINS_RULES = [diametreMax, porteeEtrier, pisteDisque, 
  hydrauliqueMecanique, fluide, systemeHydraulique, tirageCable,
  disqueJanteCadre, freinRoue, etrierDisque, formePlaquette, plaquetteDisque, fixationDisque,
];
