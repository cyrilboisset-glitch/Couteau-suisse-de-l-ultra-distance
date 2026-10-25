import { ok, known, degraded, incompatible, guard, fromEntry, physique, aSourcer } from '../finding.js';

// Dépassement toléré du plus grand pignon en dépannage (vis B au maximum).
// Valeur générique « à valider » : dépend fortement du dérailleur.
export const DEPANNAGE_COG_MARGIN = 2;

const sideOf = (der) => (der.type === 'rear_derailleur' ? 'arriere' : 'avant');

function sideMatches(shifter, der) {
  const side = shifter.attrs?.side;
  return !side || side === 'les_deux' || side === sideOf(der);
}

const commandsRear = (sh) => !sh.attrs?.side || sh.attrs.side !== 'avant';
const isFriction = (sh) => sh.attrs?.indexed === false || sh.attrs?.family === 'friction';
const FRICTION_SRC = { kind: 'communaute', ref: 'BikeForums – en mode friction, toute manette fonctionne avec tout dérailleur et tout nombre de pignons ; les manettes 5/6v anciennes peuvent manquer de course', url: 'https://www.bikeforums.net/7875417-post2.html' };
const THREAD_SRC = { kind: 'communaute', ref: 'Sheldon Brown – roues libres à visser : italien 35 × 24 tpi, ISO 34,92 × 24 tpi, anglais 34,80 × 24 tpi (interchangeables), français 34,7 × 1 mm (incompatible)', url: 'https://www.sheldonbrown.com/freewheels.html' };

export const commandeSysteme = {
  id: 'transmission.systeme',
  label: 'Électronique ≠ mécanique ; protocoles électroniques distincts',
  between: [['shifter', 'rear_derailleur'], ['shifter', 'front_derailleur']],
  absolute: true,
  confidence: 'haute',
  source: physique("Une commande électronique ne tire pas de câble et une manette à câble ne pilote pas un moteur ; Di2, AXS et EPS sont des protocoles propriétaires distincts."),
  evaluate(sh, der) {
    if (!sideMatches(sh, der)) return null;
    const g = guard(this, [[sh, ['system']], [der, ['system']]]);
    if (g) return g.finding;
    const s = sh.attrs.system;
    const d = der.attrs.system;
    if (s !== d) {
      const lbl = { mecanique: 'mécanique', electronique: 'électronique' };
      return incompatible(this, `Commande ${lbl[s] ?? s} et dérailleur ${lbl[d] ?? d} : impossible de mélanger électronique et mécanique.`);
    }
    if (s === 'electronique') {
      const g2 = guard(this, [[sh, ['protocol']], [der, ['protocol']]]);
      if (g2) return g2.finding;
      if (sh.attrs.protocol !== der.attrs.protocol) {
        return incompatible(this, `Protocoles électroniques différents (${sh.attrs.protocol.toUpperCase()} ≠ ${der.attrs.protocol.toUpperCase()}) : aucun dialogue possible.`);
      }
    }
    return ok(this, 'Même type de commande.');
  },
};

export const familleActionnement = {
  id: 'transmission.famille',
  label: "Famille d'actionnement (ratio de tirage / génération électronique)",
  between: [['shifter', 'rear_derailleur'], ['shifter', 'front_derailleur']],
  confidence: 'moyenne',
  evaluate(sh, der, kb) {
    if (!sideMatches(sh, der)) return null;
    const g = guard(this, [[sh, ['system', 'family']], [der, ['system', 'family']]]);
    if (g) return g.finding;
    // Les exclusions absolues sont traitées par transmission.systeme.
    if (sh.attrs.system !== der.attrs.system) return null;
    if (sh.attrs.system === 'electronique' && sh.attrs.protocol !== der.attrs.protocol) return null;

    const sf = sh.attrs.family;
    const df = der.attrs.family;
    // Manette à friction : aucun cran, l'utilisateur place le dérailleur à l'oreille.
    if (isFriction(sh)) {
      return known(this, 'Manette à friction : déplace n\'importe quel dérailleur mécanique, sans indexation.', {
        condition: 'Course de câble suffisante pour couvrir tous les pignons (certaines manettes 5/6v anciennes manquent de course au-delà de 7-8 pignons).',
        adjustments: ['Régler les butées haute et basse du dérailleur', 'Trouver chaque vitesse à l\'oreille'],
        source: FRICTION_SRC,
      });
    }
    // Dérailleur d'avant l'indexation avec une manette indexée.
    if (df === 'friction') {
      return degraded(this, 'Dérailleur conçu pour le changement de vitesse à friction, manette indexée.', {
        limitation: 'Déplacement par cran non garanti : passer la manette en mode friction si elle en a un, sinon indexation approximative.',
        source: { kind: 'communaute', ref: 'Sheldon Brown – drivetrain mixing : tirage et déplacement différents selon les marques et époques', url: 'https://www.sheldonbrown.com/drivetrain-mixing.shtml' },
      });
    }
    if (sf === df) {
      return ok(this, `Même famille d'actionnement (${sf}).`, {
        source: { kind: 'officiel', ref: "Famille d'actionnement identique définie par le constructeur (voir sources des pièces)" },
      });
    }
    const entry = kb.actuation(sf, df, sideOf(der));
    if (entry) return fromEntry(this, entry);

    const cross = sh.discipline && der.discipline && sh.discipline !== der.discipline
      ? ` Croisement ${sh.discipline} → ${der.discipline} : la manette ne déplace pas ce dérailleur de la bonne distance à chaque cran.`
      : '';
    const what = sh.attrs.system === 'electronique'
      ? `Générations électroniques non interopérables connues (${sf} ≠ ${df}).`
      : `Ratio de tirage différent : manette famille ${sf}, dérailleur famille ${df}, aucune compatibilité documentée.`;
    return incompatible(this, what + cross, {
      // A18 : deux générations électroniques non documentées comme compatibles ne dialoguent pas.
      absolute: sh.attrs.system === 'electronique',
      source: aSourcer('Aucune entrée dans la base pour ce couple de familles — ajoutez-la si une source existe'),
    });
  },
};

export const vitessesManetteCassette = {
  id: 'transmission.vitesses_manette_cassette',
  label: 'Nombre de crans de la manette ↔ nombre de pignons',
  between: [['shifter', 'cassette']],
  confidence: 'moyenne',
  source: physique("L'indexation de la manette est calculée pour l'écartement des pignons d'un nombre de vitesses donné."),
  evaluate(sh, cas) {
    if (!commandsRear(sh)) return null;
    if (sh.attrs?.system === 'electronique') return null; // indexation portée par le dérailleur
    if (isFriction(sh)) {
      return known(this, 'Manette à friction : indépendante du nombre de pignons.', {
        condition: (cas.attrs?.speeds ?? 0) > 7 ? 'Vérifier que la course de la manette couvre tous les pignons.' : undefined,
        source: FRICTION_SRC,
      });
    }
    const g = guard(this, [[sh, ['speeds']], [cas, ['speeds']]]);
    if (g) return g.finding;
    const s = sh.attrs.speeds;
    const c = cas.attrs.speeds;
    if (s === c) return ok(this, `Manette et cassette ${s} vitesses.`);
    const limitation = s < c
      ? `Passe au mieux ${s} vitesses sur ${c}, et l'écartement des pignons ne correspond pas à l'indexation : seules quelques vitesses passent proprement.`
      : `La manette a ${s - c} cran(s) de trop et un pas d'indexation différent : crans inutilisés, passages imprécis.`;
    return degraded(this, `Manette ${s}v sur cassette ${c}v (croisement de générations).`, {
      limitation,
      adjustments: ['Régler la tension de câble pour que les pignons du milieu passent proprement', 'Régler les butées haute et basse'],
    });
  },
};

export const vitessesElectronique = {
  id: 'transmission.vitesses_electronique',
  label: "Dérailleur électronique : nombre de vitesses figé",
  between: [['rear_derailleur', 'cassette']],
  confidence: 'moyenne',
  source: physique("L'indexation d'un dérailleur électronique est programmée pour un nombre de pignons donné."),
  evaluate(rd, cas) {
    if (rd.attrs?.system !== 'electronique') return null;
    const g = guard(this, [[rd, ['speeds']], [cas, ['speeds']]]);
    if (g) return g.finding;
    if (rd.attrs.speeds === cas.attrs.speeds) return ok(this, `Dérailleur et cassette ${cas.attrs.speeds} vitesses.`);
    return degraded(this, `Dérailleur électronique ${rd.attrs.speeds}v sur cassette ${cas.attrs.speeds}v.`, {
      limitation: "Indexation non prévue pour cet écartement : seules quelques vitesses passent proprement.",
      adjustments: ['Micro-réglage électronique pour centrer les pignons du milieu'],
    });
  },
};

export const plusGrandPignon = {
  id: 'transmission.plus_grand_pignon',
  label: 'Plus grand pignon ↔ capacité max du dérailleur',
  between: [['rear_derailleur', 'cassette']],
  confidence: 'moyenne',
  source: { kind: 'officiel', ref: 'Plus grand pignon max indiqué par le constructeur du dérailleur' },
  evaluate(rd, cas) {
    const g = guard(this, [[rd, ['maxCog']], [cas, ['maxCog']]]);
    if (g) return g.finding;
    const max = rd.attrs.maxCog;
    const cog = cas.attrs.maxCog;
    if (cog <= max) return ok(this, `Plus grand pignon ${cog} dents ≤ ${max} dents admis.`);
    const excess = cog - max;
    if (rd.virtual) {
      return ok(this, `Cassette jusqu'à ${cog} dents.`, {
        condition: `Votre dérailleur doit accepter au moins ${cog} dents (la cassette d'origine montait à ${max} dents).`,
        adjustments: ['Vérifier la longueur de chaîne (probablement à rallonger)', 'Régler la vis B'],
      });
    }
    if (cas.virtual) {
      return ok(this, `Dérailleur limité à ${max} dents.`, {
        condition: `Votre plus grand pignon doit faire ${max} dents au plus (le dérailleur d'origine acceptait ${cog} dents).`,
      });
    }
    if (excess <= DEPANNAGE_COG_MARGIN) {
      return degraded(this, `Plus grand pignon ${cog} dents pour ${max} dents admis (+${excess}).`, {
        limitation: `Hors spécification de ${excess} dent(s) : passage sur le grand pignon dégradé, risque de contact galet / pignon.`,
        adjustments: ['Vis B serrée au maximum', 'Vérifier la longueur de chaîne en grand plateau / grand pignon'],
        source: aSourcer('Tolérance générique de dépassement, à valider par dérailleur'),
      });
    }
    return incompatible(this, `Plus grand pignon ${cog} dents bien au-delà des ${max} dents admis (+${excess}).`);
  },
};

export const patteDerailleur = {
  id: 'transmission.patte',
  label: 'Fixation du dérailleur arrière ↔ patte du cadre',
  between: [['rear_derailleur', 'frame']],
  absolute: true,
  confidence: 'haute',
  source: physique('Un dérailleur à montage direct UDH se fixe sur l\'axe de roue d\'un cadre UDH ; il ne peut pas se monter sur une patte classique.'),
  evaluate(rd, frame, kb) {
    const g = guard(this, [[rd, ['mount']], [frame, ['rdHanger']]]);
    if (g) return g.finding;
    const m = rd.attrs.mount;
    const h = frame.attrs.rdHanger;
    if (m === 'udh_direct') {
      if (h === 'udh') return ok(this, 'Montage direct sur cadre UDH.');
      if (frame.virtual) {
        return ok(this, 'Dérailleur à montage direct UDH.', { condition: 'Votre cadre doit avoir une patte UDH.' });
      }
      return incompatible(this, 'Dérailleur à montage direct UDH : impossible sans cadre UDH.');
    }
    if (m === 'standard' && (h === 'standard' || h === 'udh')) {
      return ok(this, 'Fixation sur patte classique (une patte UDH est une patte classique).', {
        source: physique('La patte UDH reçoit un dérailleur à fixation classique'),
      });
    }
    if (m === h) return ok(this, 'Même type de fixation.');
    const entry = kb.hangerFit(m, h);
    if (entry) return fromEntry(this, entry);
    return incompatible(this, `Fixation ${m} sur patte ${h} : aucune solution documentée.`, {
      absolute: false, source: aSourcer('Aucune entrée dans la base'),
    });
  },
};

export const roueLibre = {
  id: 'transmission.corps_roue_libre',
  label: 'Cassette ↔ corps de roue libre / roue libre à visser',
  between: [['cassette', 'wheel']],
  absolute: true,
  confidence: 'haute',
  source: physique('Les cannelures et la longueur du corps de roue libre conditionnent le montage de la cassette.'),
  evaluate(cas, wheel, kb) {
    const g = guard(this, [[cas, ['kind']]]);
    if (g) return g.finding;
    if (cas.attrs.kind === 'roue_libre') {
      if (!wheel.attrs?.freewheelThread) {
        if (wheel.virtual) return null;
        return incompatible(this, 'Roue libre à visser sur un moyeu à corps de roue libre : il faut changer la roue (ou monter une cassette).');
      }
      const g2 = guard(this, [[cas, ['freewheelThread']]]);
      if (g2) return g2.finding;
      const a = cas.attrs.freewheelThread;
      const b = wheel.attrs.freewheelThread;
      if (a === b) return ok(this, 'Même filetage de roue libre.');
      if ([a, b].every((t) => t === 'iso_anglais' || t === 'italien')) {
        return known(this, 'Filetages anglais / ISO et italien : même pas (24 filets au pouce), diamètres très proches.', {
          limitation: 'Angle de filet différent (55° / 60°) : les filets se reforment, surtout roue libre acier sur moyeu alu. Éviter d\'alterner les deux sur un même moyeu.',
          source: THREAD_SRC,
        });
      }
      return incompatible(this, `Filetage différent (${a} ≠ ${b})${a === 'francais' || b === 'francais' ? ' : le filetage français (34,7 × 1 mm) ne se visse pas sur un moyeu anglais / italien, et inversement' : ''}.`, { source: THREAD_SRC });
    }
    if (!wheel.attrs?.freehub) {
      if (wheel.virtual) return null;
      if (wheel.attrs?.freewheelThread) {
        return incompatible(this, 'Cassette sur un moyeu à visser (roue libre) : il faut changer la roue.');
      }
    }
    const g3 = guard(this, [[cas, ['freehub']], [wheel, ['freehub']]]);
    if (g3) return g3.finding;
    const c = cas.attrs.freehub;
    const b = wheel.attrs.freehub;
    if (c === b) return ok(this, `Même corps de roue libre (${c}).`);
    const entry = kb.freehubFit(c, b);
    if (entry) {
      const f = fromEntry(this, entry);
      if (entry.spacerMm) f.extraParts = [`Entretoise de ${entry.spacerMm} mm derrière la cassette`, ...f.extraParts];
      return f;
    }
    return incompatible(this, `Cassette ${c} sur corps ${b} : non montable. Il faut changer le corps de roue libre (si le moyeu le permet) ou la roue.`);
  },
};

export const largeurChaine = {
  id: 'transmission.largeur_chaine',
  label: 'Largeur de chaîne ↔ écartement des pignons',
  between: [['chain', 'cassette']],
  confidence: 'moyenne',
  source: physique('Chaque nombre de vitesses a sa largeur de chaîne ; une chaîne trop large frotte sur le pignon voisin.'),
  evaluate(chain, cas) {
    const g = guard(this, [[chain, ['speeds']], [cas, ['speeds']]]);
    if (g) return g.finding;
    // Certaines cassettes (ex. Shimano CUES) exigent une chaîne d'une autre largeur que leur nombre de pignons.
    const need = cas.attrs.chainSpeeds ?? cas.attrs.speeds;
    const d = chain.attrs.speeds - need;
    if (d === 0) {
      return ok(this, cas.attrs.chainSpeeds
        ? `Chaîne ${need}v prévue pour cette cassette ${cas.attrs.speeds}v.`
        : `Chaîne et cassette ${cas.attrs.speeds} vitesses.`);
    }
    if (d === 1) {
      return known(this, `Chaîne ${chain.attrs.speeds}v (plus étroite) sur cassette ${cas.attrs.speeds}v.`, {
        limitation: 'Fonctionne en général ; chaîne plus fragile que nécessaire.',
      });
    }
    if (d > 1) {
      return degraded(this, `Chaîne ${chain.attrs.speeds}v (bien plus étroite) sur cassette ${cas.attrs.speeds}v.`, {
        limitation: 'Risque de saut de chaîne sur des dents prévues pour une chaîne plus large.',
      });
    }
    if (d === -1) {
      return degraded(this, `Chaîne ${chain.attrs.speeds}v (plus large) sur cassette ${cas.attrs.speeds}v.`, {
        limitation: 'Frottement contre le pignon voisin : bruit, passages imprécis, usure accélérée.',
      });
    }
    return incompatible(this, `Chaîne ${chain.attrs.speeds}v trop large pour l'écartement d'une cassette ${cas.attrs.speeds}v.`);
  },
};

export const flattop = {
  id: 'transmission.flattop',
  label: 'Chaîne Flattop ↔ plateaux',
  between: [['chain', 'chainring'], ['chain', 'crankset']],
  confidence: 'moyenne',
  source: { kind: 'officiel', ref: 'Exigence Flattop indiquée par le constructeur des plateaux' },
  evaluate(chain, ring) {
    const isFlattop = chain.attrs?.flattop === true;
    if (ring.attrs?.requiresFlattop === true && !isFlattop) {
      if (chain.virtual) return null;
      return incompatible(this, 'Ces plateaux exigent une chaîne Flattop.');
    }
    if (isFlattop && ring.attrs?.acceptsFlattop === false) {
      return incompatible(this, "Ces plateaux n'acceptent pas une chaîne Flattop.");
    }
    return null;
  },
};

const FLAT_PROFILE = new Set(['sram-flattop', 'sram-t-type']);

const listOf = (s) => String(s ?? '').split('|').map((x) => x.trim()).filter(Boolean);

export const typeChaine = {
  id: 'transmission.type_chaine',
  label: 'Type de chaîne exigé (Eagle, Flattop, T-Type, HG+…)',
  between: [['chain', 'rear_derailleur'], ['chain', 'cassette'], ['chain', 'chainring'], ['chain', 'crankset']],
  confidence: 'moyenne',
  source: { kind: 'officiel', ref: 'Type de chaîne exigé par le constructeur du dérailleur / de la cassette' },
  evaluate(chain, other) {
    const accepted = listOf(other.attrs?.chainTypes);
    if (!accepted.length || !chain.attrs?.chainType) return null;
    const t = chain.attrs.chainType;
    if (accepted.includes(t)) return ok(this, `Chaîne ${t} prévue.`);
    // Profils « plats » (Flattop, T-Type) : non interchangeables entre eux ni avec les chaînes classiques (SRAM).
    if (FLAT_PROFILE.has(t) || accepted.some((x) => FLAT_PROFILE.has(x))) {
      return incompatible(this, `Chaîne ${t} non prévue (attendu : ${accepted.join(' ou ')}) : profil de plaques différent, risque de déraillement en charge.`, {
        source: { kind: 'officiel', ref: 'SRAM – chaînes Flattop route, Eagle et T-Type non interchangeables', url: 'https://support.sram.com/hc/en-us/articles/6526784724379-Will-a-road-Flattop-chain-work-on-a-SRAM-Eagle-drivetrain-and-vise-versa' },
      });
    }
    return degraded(this, `Chaîne ${t} à la place de ${accepted.join(' ou ')} (même largeur).`, {
      limitation: 'Hors préconisation constructeur : passages un peu moins nets, usure à surveiller.',
      source: aSourcer('Croisement de chaînes classiques de même largeur, à valider'),
    });
  },
};

export const pasPignons = {
  id: 'transmission.pas_pignons',
  label: 'Pas des pignons ↔ indexation du dérailleur',
  // Mécanique : la manette (son tirage par cran) fixe le pas indexé. Électronique : le dérailleur.
  between: [['shifter', 'cassette'], ['rear_derailleur', 'cassette']],
  confidence: 'moyenne',
  source: physique("L'indexation (tirage × ratio du dérailleur) est calculée pour l'écartement des pignons d'un standard donné."),
  evaluate(rd, cas, kb) {
    if (rd.type === 'shifter' && (rd.attrs?.system === 'electronique' || rd.attrs?.side === 'avant' || isFriction(rd))) return null;
    if (rd.type === 'rear_derailleur' && rd.attrs?.system !== 'electronique' && !rd.attrs?.pitch) return null;
    const pitches = rd.attrs?.pitch ? listOf(rd.attrs.pitch) : (kb.family(rd.attrs?.family)?.pitch ?? []);
    const cp = cas.attrs?.pitch;
    if (!pitches.length || !cp) return null;
    if (pitches.includes(cp)) return ok(this, `Pas de pignons ${cp} prévu pour ce dérailleur.`);
    for (const p of pitches) {
      const entry = kb.pitchFit(cp, p);
      if (entry) return fromEntry(this, entry);
    }
    return degraded(this, `Cassette au pas ${cp}, dérailleur indexé pour ${pitches.join(' / ')}.`, {
      limitation: "Écartement des pignons différent : l'indexation dérive, certaines vitesses passent mal.",
      adjustments: ['Régler la tension de câble au milieu de la cassette'],
      source: aSourcer('Croisement de standards de pignons non documenté'),
    });
  },
};

export const plateauxDerailleur = {
  id: 'transmission.plateaux_derailleur',
  label: 'Nombre de plateaux prévu pour le dérailleur arrière',
  between: [['rear_derailleur', 'crankset']],
  confidence: 'moyenne',
  source: { kind: 'officiel', ref: 'Configuration (1x / 2x / 3x) indiquée par le constructeur du dérailleur' },
  evaluate(rd, crank) {
    const max = rd.attrs?.maxFrontChainrings;
    const n = crank.attrs?.chainrings;
    if (!max || !n || crank.virtual) return null;
    if (n <= max) return ok(this, `Dérailleur prévu jusqu'à ${max} plateau(x).`);
    return degraded(this, `Dérailleur prévu pour ${max} plateau(x), pédalier à ${n} plateaux.`, {
      limitation: 'Hors configuration constructeur : capacité et position de chape à vérifier, passages dégradés possibles.',
    });
  },
};

export const maillonRapide = {
  id: 'transmission.maillon_rapide',
  label: 'Maillon rapide ↔ chaîne',
  between: [['quick_link', 'chain']],
  absolute: true,
  confidence: 'haute',
  source: physique("Largeur intérieure, longueur d'axe et profil des plaques propres à chaque largeur de chaîne (et au Flattop)."),
  evaluate(link, chain) {
    const g = guard(this, [[link, ['speeds']], [chain, ['speeds']]]);
    if (g) return g.finding;
    if (link.attrs.speeds !== chain.attrs.speeds) {
      return incompatible(this, `Maillon rapide ${link.attrs.speeds}v sur chaîne ${chain.attrs.speeds}v : jamais (risque de rupture). Dépannage possible : dérive-chaîne et goupille, ou maillon de la bonne largeur.`);
    }
    if (Boolean(link.attrs.flattop) !== Boolean(chain.attrs.flattop)) {
      return incompatible(this, 'Maillon Flattop et chaîne non Flattop (ou l\'inverse) : profils différents.');
    }
    return ok(this, `Maillon ${link.attrs.speeds}v adapté.`, {
      adjustments: link.attrs.reusable === false ? ['Maillon à usage unique : ne pas le réutiliser après ouverture'] : [],
      tools: ['Pince à maillon rapide (ou à défaut à la main)'],
    });
  },
};

export const fixationDerailleurAvant = {
  id: 'transmission.fixation_avant',
  label: 'Fixation du dérailleur avant ↔ cadre',
  between: [['front_derailleur', 'frame']],
  confidence: 'moyenne',
  evaluate(fd, frame) {
    const g = guard(this, [[fd, ['mount']], [frame, ['fdMount']]]);
    if (g) return g.finding;
    const m = fd.attrs.mount;
    const f = frame.attrs.fdMount;
    if (m === f) return ok(this, 'Même fixation de dérailleur avant.', { source: physique('Fixation identique') });
    const clampDiam = (x) => ({ collier_28_6: 28.6, collier_31_8: 31.8, collier_34_9: 34.9 }[x]);
    if (clampDiam(m) && clampDiam(f) && clampDiam(m) > clampDiam(f)) {
      return known(this, `Collier ${clampDiam(m)} mm sur tube ${clampDiam(f)} mm.`, {
        extraParts: ['Cale de réduction de collier'], source: physique('Réduction de diamètre par cale'),
      });
    }
    if (m === 'braze_on' && clampDiam(f)) {
      return known(this, 'Dérailleur braze-on sur tube rond.', {
        extraParts: [`Collier adaptateur braze-on ${clampDiam(f)} mm`], source: physique('Collier adaptateur braze-on'),
      });
    }
    return incompatible(this, `Fixation ${m} impossible sur ${f}.`, { source: physique('Interfaces de fixation différentes') });
  },
};

const parseTeeth = (s) => String(s ?? '').split(/[-/]/).map(Number).filter((n) => Number.isFinite(n) && n > 0);

export const derailleurAvantPedalier = {
  id: 'transmission.avant_pedalier',
  label: 'Dérailleur avant ↔ plateaux',
  between: [['front_derailleur', 'crankset']],
  confidence: 'moyenne',
  source: physique('Courbure de chape et course du dérailleur prévues pour un nombre et une taille de plateaux.'),
  evaluate(fd, crank) {
    const g = guard(this, [[fd, ['chainrings']], [crank, ['chainrings']]]);
    if (g) return g.finding;
    const out = [];
    const n = fd.attrs.chainrings;
    const c = crank.attrs.chainrings;
    if (c === 1) {
      out.push(incompatible(this, 'Pédalier mono-plateau : pas de dérailleur avant.', { absolute: false }));
      return out;
    }
    if (n !== c) {
      out.push(degraded(this, `Dérailleur avant ${n} plateaux sur pédalier ${c} plateaux.`, {
        limitation: n < c ? 'Un plateau risque d\'être inaccessible ou mal indexé.' : 'Indexation prévue pour un triple : butées à régler, crans en trop.',
        adjustments: ['Régler les butées', 'Régler la hauteur et l\'angle du dérailleur'],
      }));
    }
    const teeth = parseTeeth(crank.attrs.teeth);
    if (teeth.length >= 2) {
      const big = Math.max(...teeth);
      const diff = big - Math.min(...teeth);
      if (fd.attrs.capacity && diff > fd.attrs.capacity) {
        out.push(degraded(this, `Écart de plateaux ${diff} dents pour une capacité de ${fd.attrs.capacity} dents.`, {
          limitation: 'Frottement de la chape et passages lents ou imprécis.',
        }));
      }
      if (fd.attrs.maxRing && big > fd.attrs.maxRing) {
        out.push(degraded(this, `Grand plateau ${big} dents pour ${fd.attrs.maxRing} dents max.`, {
          limitation: 'Courbure de chape inadaptée : passages vers le grand plateau dégradés.',
        }));
      }
      if (fd.attrs.minRing && big < fd.attrs.minRing) {
        out.push(degraded(this, `Grand plateau ${big} dents pour ${fd.attrs.minRing} dents min.`, {
          limitation: 'Chape trop haute au-dessus des dents : passages lents.',
        }));
      }
    }
    if (!out.length) out.push(ok(this, `Dérailleur avant adapté à ce pédalier ${c} plateaux.`));
    return out;
  },
};

export const TRANSMISSION_RULES = [
  commandeSysteme, familleActionnement, vitessesManetteCassette, vitessesElectronique,
  plusGrandPignon, patteDerailleur, roueLibre, largeurChaine, flattop, maillonRapide, typeChaine, pasPignons, plateauxDerailleur,
  fixationDerailleurAvant, derailleurAvantPedalier,
];
