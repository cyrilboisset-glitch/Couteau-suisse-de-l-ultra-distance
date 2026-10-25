// Schéma des pièces : chaque pièce est décrite par des attributs techniques
// normalisés. Aucune compatibilité n'est stockée ici : le moteur de règles la
// déduit des attributs. Les attributs sont « plats » (une colonne CSV chacun).

export const ENUMS = Object.freeze({
  discipline: ['route', 'gravel', 'vtt', 'autre'],
  shiftSystem: ['mecanique', 'electronique'],
  protocol: ['di2', 'axs', 'eps', 'autre'],
  shifterSide: ['arriere', 'avant', 'les_deux'],
  shifterForm: ['levier_route', 'gachette_vtt', 'poignee_tournante', 'bout_de_cintre', 'satellite', 'autre'],
  // Fixation du dérailleur arrière.
  rdMount: ['standard', 'direct_mount', 'udh_direct'],
  // Patte de dérailleur côté cadre.
  frameHanger: ['standard', 'udh', 'direct_mount'],
  fdMount: ['collier_28_6', 'collier_31_8', 'collier_34_9', 'braze_on', 'direct_mount', 'e_type', 'autre'],
  cassetteKind: ['cassette', 'roue_libre'],
  freehub: ['hg_7', 'hg_8_9_10', 'hg_11_route', 'hg_12_route', 'hg_l2', 'microspline', 'xd', 'xdr', 'n3w', 'campagnolo', 'campagnolo_8', 'autre'],
  chainConnection: ['maillon_rapide', 'goupille'],
  spindle: [
    'carre_jis', 'carre_iso', 'octalink_v1', 'octalink_v2', 'isis', 'shimano_24',
    'sram_gxp', 'sram_dub', 'axe_30', 'campagnolo_ultratorque', 'campagnolo_powertorque', 'autre',
  ],
  bbShell: [
    'bsa', 'ita', 'bb86', 'bb92', 'bb30', 'pf30', 'bb386evo', 'bbright',
    't47_externe', 't47_interne', 'autre',
  ],
  ringInterface: ['bcd', 'direct_mount'],
  brakeType: ['disque', 'jante'],
  brakeActuation: ['hydraulique', 'mecanique'],
  fluid: ['mineral', 'dot'],
  // Tirage câble des freins mécaniques : court (route, cantilever, disque
  // mécanique route) / long (V-brake, disque mécanique VTT).
  cablePull: ['court', 'long'],
  brakeMount: ['flat_mount', 'post_mount', 'is', 'etrier_central', 'direct_mount_jante', 'cantilever', 'v_brake'],
  wheelBrake: ['disque', 'jante', 'les_deux'],
  rotorMount: ['six_trous', 'centerlock'],
  axleType: ['serrage_rapide', 'axe_traversant', 'ecrous', 'autre'],
  padCompound: ['resine', 'metal', 'semi_metal'],
  rotorPadCompat: ['resine_seulement', 'resine_et_metal'],
  confidence: ['haute', 'moyenne', 'basse'],
  // officiel : doc / tableau / fiche constructeur. physique : conséquence
  // directe d'un principe mécanique. communaute : retour terrain non officiel.
  // officiel : site / doc / tableau constructeur. revendeur : fiche revendeur
  // reprenant la fiche constructeur. presse : essai ou article technique.
  // communaute : forum, retour terrain. physique : principe mécanique.
  sourceKind: ['officiel', 'revendeur', 'presse', 'communaute', 'physique', 'a_sourcer'],
  status: ['valide', 'a_valider'],
});

export const DISC_MOUNTS = Object.freeze(['flat_mount', 'post_mount', 'is']);
export const RIM_MOUNTS = Object.freeze(['etrier_central', 'direct_mount_jante', 'cantilever', 'v_brake']);

const a = (kind, label, opts = {}) => ({ kind, label, ...opts });

const SHIFT_ATTRS = {
  system: a('enum', 'Commande (mécanique / électronique)', { enum: 'shiftSystem', required: true }),
  family: a('string', "Famille d'actionnement (ratio de tirage ou protocole + génération)", { required: true }),
  protocol: a('enum', 'Protocole électronique', { enum: 'protocol', requiredIf: (x) => x.system === 'electronique' }),
};

const BRAKE_ATTRS = {
  brakeActuation: a('enum', 'Freinage hydraulique / mécanique', { enum: 'brakeActuation' }),
  fluid: a('enum', 'Fluide (minéral / DOT)', { enum: 'fluid', requiredIf: (x) => x.brakeActuation === 'hydraulique' }),
  cablePull: a('enum', 'Tirage câble (court / long)', { enum: 'cablePull', requiredIf: (x) => x.brakeActuation === 'mecanique' }),
  hydraulicSystem: a('string', 'Système hydraulique (marque + famille de maître-cylindre)'),
  fluidSpec: a('string', 'Fluide exact (ex. shimano_mineral, sram_maxima_mineral, magura_royal_blood, dot_5_1, dot_4)'),
};

const AXLE_ATTRS = {
  axleType: a('enum', "Type d'axe de roue", { enum: 'axleType' }),
  axleDiameter: a('number', "Diamètre d'axe (5 = serrage rapide, 12, 15, 20…)", { unit: 'mm' }),
  axleWidth: a('number', 'Largeur entre pattes (100, 110, 130, 135, 142, 148…)', { unit: 'mm' }),
};

export const PART_TYPES = Object.freeze({
  rear_derailleur: {
    label: 'Dérailleur arrière',
    attrs: {
      speeds: a('int', 'Nombre de vitesses', { required: true }),
      ...SHIFT_ATTRS,
      maxCog: a('int', 'Plus grand pignon max (meilleur cas, en général mono-plateau)', { unit: 'dents', required: true }),
      maxCog2x: a('int', 'Plus grand pignon max en double plateau', { unit: 'dents' }),
      maxCog3x: a('int', 'Plus grand pignon max en triple plateau', { unit: 'dents' }),
      minCog: a('int', 'Plus petit pignon min', { unit: 'dents' }),
      minLowCog: a('int', 'Plus grand pignon minimum (chape prévue pour au moins…)', { unit: 'dents' }),
      maxFrontDiff: a('int', 'Écart max entre plateaux', { unit: 'dents' }),
      chainTypes: a('string', 'Types de chaîne acceptés, séparés par « | »'),
      totalCapacity: a('int', 'Capacité totale', { unit: 'dents', required: true }),
      cageLength: a('string', 'Longueur de chape (SS, GS, SGS…)'),
      mount: a('enum', 'Fixation', { enum: 'rdMount', required: true }),
      clutch: a('bool', 'Embrayage (clutch)'),
      maxFrontChainrings: a('int', 'Nombre de plateaux max prévu (1, 2, 3)'),
    },
  },
  front_derailleur: {
    label: 'Dérailleur avant',
    attrs: {
      speeds: a('int', 'Vitesses arrière de la transmission', { required: true }),
      chainrings: a('int', 'Nombre de plateaux (2 ou 3)', { required: true }),
      ...SHIFT_ATTRS,
      mount: a('enum', 'Fixation', { enum: 'fdMount', required: true }),
      capacity: a('int', 'Capacité (écart plateaux)', { unit: 'dents' }),
      maxRing: a('int', 'Grand plateau max', { unit: 'dents' }),
      minRing: a('int', 'Grand plateau min', { unit: 'dents' }),
      chainline: a('number', 'Ligne de chaîne prévue', { unit: 'mm' }),
    },
  },
  shifter: {
    label: 'Manette / levier de vitesses',
    attrs: {
      side: a('enum', 'Côté', { enum: 'shifterSide', required: true }),
      speeds: a('int', 'Nombre de vitesses (arrière) ou de plateaux (avant)', { required: true }),
      ...SHIFT_ATTRS,
      form: a('enum', 'Forme', { enum: 'shifterForm' }),
      frontPositions: a('int', 'Positions avant (2 ou 3 plateaux)'),
      ...BRAKE_ATTRS,
    },
  },
  brake_lever: {
    label: 'Levier de frein',
    attrs: {
      form: a('enum', 'Forme', { enum: 'shifterForm' }),
      ...BRAKE_ATTRS,
      brakeActuation: { ...BRAKE_ATTRS.brakeActuation, required: true },
    },
  },
  brake_caliper: {
    label: 'Étrier / frein',
    attrs: {
      brakeType: a('enum', 'Disque / jante', { enum: 'brakeType', required: true }),
      ...BRAKE_ATTRS,
      brakeActuation: { ...BRAKE_ATTRS.brakeActuation, required: true },
      mount: a('enum', 'Fixation', { enum: 'brakeMount', required: true }),
      padShape: a('string', 'Forme / référence de plaquette ou patin'),
    },
  },
  rotor: {
    label: 'Disque',
    attrs: {
      mount: a('enum', 'Fixation', { enum: 'rotorMount', required: true }),
      diameter: a('int', 'Diamètre', { unit: 'mm', required: true }),
      thickness: a('number', 'Épaisseur', { unit: 'mm' }),
      padCompat: a('enum', 'Plaquettes admises', { enum: 'rotorPadCompat' }),
    },
  },
  brake_pads: {
    label: 'Plaquettes / patins',
    attrs: {
      shape: a('string', 'Forme / référence', { required: true }),
      compound: a('enum', 'Composé', { enum: 'padCompound' }),
    },
  },
  cassette: {
    label: 'Cassette / roue libre',
    attrs: {
      kind: a('enum', 'Cassette ou roue libre à visser', { enum: 'cassetteKind', required: true }),
      speeds: a('int', 'Nombre de vitesses', { required: true }),
      minCog: a('int', 'Plus petit pignon', { unit: 'dents', required: true }),
      maxCog: a('int', 'Plus grand pignon', { unit: 'dents', required: true }),
      freehub: a('enum', 'Standard de corps de roue libre', { enum: 'freehub', requiredIf: (x) => x.kind === 'cassette' }),
      freewheelThread: a('string', 'Filetage (roue libre à visser)', { requiredIf: (x) => x.kind === 'roue_libre' }),
      cogs: a('string', 'Étagement (ex. 11-12-13-14-16-18-20-22-25-28-32)'),
      pitch: a('string', 'Famille de pas des pignons (ex. hg-11, shimano-12, sram-eagle-12)'),
      chainSpeeds: a('int', 'Largeur de chaîne requise si différente du nombre de vitesses (ex. CUES)'),
      chainTypes: a('string', 'Types de chaîne acceptés, séparés par « | »'),
      cogPitch: a('number', 'Écartement des pignons', { unit: 'mm' }),
    },
  },
  chain: {
    label: 'Chaîne',
    attrs: {
      speeds: a('int', 'Nombre de vitesses', { required: true }),
      flattop: a('bool', 'Flattop'),
      chainType: a('string', 'Type de chaîne (ex. hg-12, sram-eagle, sram-flattop, sram-t-type, campagnolo-12)'),
      links: a('int', 'Nombre de maillons à la vente'),
      connection: a('enum', "Type d'attache", { enum: 'chainConnection' }),
    },
  },
  crankset: {
    label: 'Pédalier',
    attrs: {
      speeds: a('int', 'Vitesses prévues'),
      armLength: a('number', 'Longueur de manivelle', { unit: 'mm' }),
      spindle: a('enum', "Standard d'axe", { enum: 'spindle', required: true }),
      ringInterface: a('enum', 'Interface plateaux', { enum: 'ringInterface', required: true }),
      bcd: a('number', 'BCD (entraxe de fixation)', { unit: 'mm', requiredIf: (x) => x.ringInterface === 'bcd' }),
      bolts: a('int', 'Nombre de vis de plateau', { requiredIf: (x) => x.ringInterface === 'bcd' }),
      dmType: a('string', 'Type de direct mount', { requiredIf: (x) => x.ringInterface === 'direct_mount' }),
      chainrings: a('int', 'Nombre de plateaux (1, 2, 3)', { required: true }),
      teeth: a('string', 'Dentures (ex. 50-34)'),
      chainline: a('number', 'Ligne de chaîne', { unit: 'mm' }),
      shellWidths: a('string', 'Largeurs de boîtier admises, séparées par « | » (ex. 68|73)', { unit: 'mm' }),
      requiresFlattop: a('bool', 'Exige une chaîne Flattop'),
      chainTypes: a('string', 'Types de chaîne acceptés, séparés par « | »'),
      narrowWide: a('bool', 'Plateau à dents alternées (narrow-wide)'),
    },
  },
  chainring: {
    label: 'Plateau',
    attrs: {
      teeth: a('int', 'Nombre de dents', { required: true }),
      ringInterface: a('enum', 'Interface', { enum: 'ringInterface', required: true }),
      bcd: a('number', 'BCD', { unit: 'mm', requiredIf: (x) => x.ringInterface === 'bcd' }),
      bolts: a('int', 'Nombre de vis', { requiredIf: (x) => x.ringInterface === 'bcd' }),
      dmType: a('string', 'Type de direct mount', { requiredIf: (x) => x.ringInterface === 'direct_mount' }),
      speeds: a('int', 'Vitesses prévues'),
      requiresFlattop: a('bool', 'Exige une chaîne Flattop'),
      acceptsFlattop: a('bool', 'Accepte une chaîne Flattop'),
      narrowWide: a('bool', 'Dents alternées (narrow-wide)'),
      chainTypes: a('string', 'Types de chaîne acceptés, séparés par « | »'),
      position: a('string', 'Position (mono, grand, petit, milieu)'),
    },
  },
  bottom_bracket: {
    label: 'Boîtier de pédalier',
    attrs: {
      shell: a('enum', 'Standard de cadre (coque)', { enum: 'bbShell', required: true }),
      shellWidth: a('number', 'Largeur de coque', { unit: 'mm' }),
      shellWidths: a('string', 'Largeurs de coque admises, séparées par « | » (ex. 68|73|83)', { unit: 'mm' }),
      spindle: a('enum', "Standard d'axe accepté", { enum: 'spindle', required: true }),
    },
  },
  wheel: {
    label: 'Roue / moyeu',
    attrs: {
      brakeInterface: a('enum', 'Freinage prévu (disque / jante)', { enum: 'wheelBrake', required: true }),
      freehub: a('enum', 'Corps de roue libre', { enum: 'freehub' }),
      freewheelThread: a('string', 'Filetage roue libre (moyeu à visser)'),
      freehubOptions: a('string', 'Autres corps de roue libre proposés pour ce moyeu, séparés par « | »'),
      rotorMount: a('enum', 'Fixation disque', { enum: 'rotorMount', requiredIf: (x) => x.brakeInterface !== 'jante' }),
      ...AXLE_ATTRS,
    },
  },
  frame: {
    label: 'Cadre / fourche',
    attrs: {
      bbShell: a('enum', 'Coque de boîtier', { enum: 'bbShell' }),
      bbShellWidth: a('number', 'Largeur de coque', { unit: 'mm' }),
      rdHanger: a('enum', 'Patte de dérailleur', { enum: 'frameHanger' }),
      fdMount: a('enum', 'Fixation dérailleur avant', { enum: 'fdMount' }),
      brakeMount: a('enum', 'Fixation de frein', { enum: 'brakeMount' }),
      maxRotor: a('int', 'Diamètre de disque maximal autorisé', { unit: 'mm' }),
      chainstayLength: a('number', 'Longueur de base (axe du pédalier → axe de roue)', { unit: 'mm' }),
      ...AXLE_ATTRS,
    },
  },
  quick_link: {
    label: 'Maillon rapide',
    attrs: {
      speeds: a('int', 'Nombre de vitesses', { required: true }),
      flattop: a('bool', 'Flattop'),
      reusable: a('bool', 'Réutilisable'),
    },
  },
});

const COMMON_REQUIRED = ['id', 'type', 'brand', 'ref'];

const isEmpty = (v) => v === undefined || v === null || v === '';

function checkKind(spec, value) {
  switch (spec.kind) {
    case 'int': return Number.isInteger(value);
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'bool': return typeof value === 'boolean';
    case 'string': return typeof value === 'string';
    case 'enum': return ENUMS[spec.enum].includes(value);
    default: return false;
  }
}

/**
 * Valide une pièce. `errors` = données fausses (bloquant à l'import),
 * `missing` = données attendues mais absentes (signalées, jamais inventées).
 */
export function validatePart(part) {
  const errors = [];
  const missing = [];
  for (const k of COMMON_REQUIRED) if (isEmpty(part?.[k])) errors.push(`Champ obligatoire absent : ${k}`);
  const def = PART_TYPES[part?.type];
  if (!def) {
    errors.push(`Type de pièce inconnu : « ${part?.type} »`);
    return { valid: false, errors, missing };
  }
  if (part.discipline && !ENUMS.discipline.includes(part.discipline)) {
    errors.push(`Discipline inconnue : « ${part.discipline} »`);
  }
  const attrs = part.attrs ?? {};
  for (const k of Object.keys(attrs)) {
    if (!def.attrs[k]) errors.push(`Attribut inconnu pour ${def.label} : ${k}`);
  }
  for (const [k, spec] of Object.entries(def.attrs)) {
    const v = attrs[k];
    if (isEmpty(v)) {
      if (spec.required || spec.requiredIf?.(attrs)) missing.push(k);
      continue;
    }
    if (!checkKind(spec, v)) {
      errors.push(spec.kind === 'enum'
        ? `${k} : valeur « ${v} » hors liste (${ENUMS[spec.enum].join(', ')})`
        : `${k} : type attendu ${spec.kind}, reçu « ${v} »`);
    }
  }
  if (!Array.isArray(part.sources) || part.sources.length === 0) missing.push('sources');
  for (const src of part.sources ?? []) {
    if (!ENUMS.sourceKind.includes(src.kind)) errors.push(`Type de source inconnu : « ${src.kind} »`);
  }
  if (part.status && !ENUMS.status.includes(part.status)) errors.push(`Statut inconnu : « ${part.status} »`);
  if (part.confidence && !ENUMS.confidence.includes(part.confidence)) {
    errors.push(`Niveau de confiance inconnu : « ${part.confidence} »`);
  }
  return { valid: errors.length === 0, errors, missing };
}

export const needsValidation = (part) => part?.status === 'a_valider';

export const hasOfficialSource = (part) =>
  Array.isArray(part?.sources) && part.sources.some((s) => s.kind === 'officiel');
