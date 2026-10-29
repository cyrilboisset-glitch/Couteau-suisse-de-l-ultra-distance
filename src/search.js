// Recherche de pièces : par référence (tolérante aux fautes) ou par critères
// (« dérailleur arrière 11v route chape longue »). Fonctions pures, sans DOM.

export const normalize = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const compact = (s) => normalize(s).replace(/ /g, '');

/**
 * Distance d'édition minimale entre `q` et n'importe quelle sous-chaîne de `t`
 * (algorithme de Sellers) : « rd8000 » est à 1 de « rdr8000gs ».
 */
export function substringDistance(q, t) {
  if (!q) return 0;
  let prev = new Array(t.length + 1).fill(0);
  for (let i = 1; i <= q.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      const cost = q[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return Math.min(...prev);
}

function keysOf(part) {
  return [part.ref, `${part.brand} ${part.ref}`, part.name, ...(part.aliases ?? [])].filter(Boolean);
}

/** Score de correspondance d'un texte libre avec une pièce (0 = rien, 1 = parfait). */
export function textScore(query, part) {
  const q = compact(query);
  if (!q) return 0;
  let best = 0;
  for (const key of keysOf(part)) {
    const k = compact(key);
    if (!k) continue;
    if (k === q) return 1;
    if (k.startsWith(q)) best = Math.max(best, 0.95);
    else if (k.includes(q)) best = Math.max(best, 0.9);
    else {
      // Tolérance : 1 faute pour 4 caractères, au plus 2.
      const allowed = Math.min(2, Math.floor(q.length / 4));
      const d = substringDistance(q, k);
      if (d <= allowed) best = Math.max(best, 0.85 - 0.1 * d);
    }
  }
  if (best) return best;
  // Mots séparés (« xt 12 sgs ») : chaque mot doit se retrouver quelque part.
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length > 1) {
    const hay = keysOf(part).map(compact).join(' ');
    const hits = words.filter((w) => hay.includes(w) || (w.length >= 4 && substringDistance(w, hay) <= 1)).length;
    if (hits === words.length) return 0.7;
  }
  return 0;
}

// --- Critères ---------------------------------------------------------------

// Mots-clés en français, anglais, allemand, espagnol et italien (sans accents).
// En italien et en espagnol, « cambio » désigne le dérailleur arrière.
const TYPE_WORDS = [
  ['rear_derailleur', ['derailleur arriere', 'derailleur ar', 'derailleur', 'rd', 'deraileur arriere', 'derailleur arrriere',
    'rear derailleur', 'rear mech', 'schaltwerk', 'cambio trasero', 'desviador trasero', 'cambio', 'deragliatore posteriore']],
  ['front_derailleur', ['derailleur avant', 'derailleur av', 'fd', 'front derailleur', 'front mech', 'umwerfer',
    'desviador delantero', 'desviador', 'deragliatore anteriore', 'deragliatore']],
  ['cassette', ['cassette', 'roue libre', 'pignons', 'freewheel', 'sprockets', 'kassette', 'zahnkranz', 'ritzelpaket',
    'casete', 'pinones', 'cassetta', 'pignoni', 'ruota libera']],
  ['chain', ['chaine', 'chain', 'kette', 'cadena', 'catena']],
  ['quick_link', ['maillon rapide', 'maillon', 'quick link', 'master link', 'kettenschloss', 'eslabon rapido', 'falsa maglia', 'maglia rapida']],
  ['shifter', ['manette', 'levier de vitesse', 'levier vitesse', 'shifter', 'sti', 'commande', 'shift lever', 'schalthebel',
    'mando', 'maneta de cambio', 'palanca de cambio', 'comando', 'leva cambio', 'ergopower']],
  ['brake_lever', ['levier de frein', 'levier frein', 'brake lever', 'bremshebel', 'maneta de freno', 'leva freno']],
  ['brake_caliper', ['etrier', 'frein', 'caliper', 'brake', 'bremssattel', 'bremse', 'pinza', 'freno']],
  ['brake_pads', ['plaquettes', 'plaquette', 'patins', 'patin', 'brake pads', 'pads', 'brake shoes', 'bremsbelage', 'bremsbelag',
    'bremsschuhe', 'pastillas de freno', 'pastillas freno', 'pastillas', 'zapatas', 'pastiglie freno', 'pastiglie', 'pattini', 'brake pad', 'plaquettes de frein']],
  ['rotor', ['disque', 'rotor', 'disc', 'bremsscheibe', 'disco']],
  ['crankset', ['pedalier', 'manivelle', 'manivelles', 'crankset', 'crank', 'cranks', 'kurbel', 'kurbelgarnitur', 'bielas', 'guarnitura', 'pedivelle']],
  ['chainring', ['plateau', 'chainring', 'kettenblatt', 'plato', 'corona']],
  ['bottom_bracket', ['boitier', 'boitier de pedalier', 'bb', 'bottom bracket', 'innenlager', 'tretlager', 'eje pedalier', 'caja de pedalier', 'movimento centrale']],
];

const CAGES = [
  ['chape longue', ['SGS', 'long'], ['long cage', 'langer kafig', 'caja larga', 'gabbia lunga']],
  ['chape moyenne', ['GS', 'moyen'], ['medium cage', 'mittlerer kafig', 'caja media', 'gabbia media']],
  ['chape courte', ['SS', 'court'], ['short cage', 'kurzer kafig', 'caja corta', 'gabbia corta']],
];

const DISCIPLINE_WORDS = [
  ['route', ['route', 'road', 'rennrad', 'strasse', 'carretera', 'strada', 'corsa']],
  ['gravel', ['gravel']],
  ['vtt', ['vtt', 'mtb', 'mountain bike', 'mountainbike', 'btt']],
];

/**
 * Analyse une requête en critères. Les mots reconnus sont retirés ; le reste
 * sert à la recherche textuelle.
 */
export function parseCriteria(query) {
  let text = ` ${normalize(query)} `;
  const c = {};
  const take = (re) => {
    const m = text.match(re);
    if (m) text = text.replace(m[0], ' ');
    return m;
  };
  for (const [label, values, synonyms] of CAGES) {
    for (const w of [label, ...synonyms]) {
      if (!c.cage && take(new RegExp(` ${w} `))) c.cage = { label, values };
    }
  }
  // « levier de frein » avant « frein », « dérailleur avant » avant « dérailleur ».
  const ordered = TYPE_WORDS.flatMap(([type, words]) => words.map((w) => [type, w])).sort((a, b) => b[1].length - a[1].length);
  for (const [type, w] of ordered) {
    if (c.type) break;
    if (take(new RegExp(` ${w} `))) c.type = type;
  }
  let m = take(/ (\d{1,2}) ?(?:v|s|vitesses?|speeds?|sp|fach|gang|velocidades|vel|velocita|rapporti|marce) /);
  if (m) c.speeds = Number(m[1]);
  // « 11-34 » (cassette, croissant) ou « 50-34 » (plateaux, décroissant).
  m = take(/ (\d{1,2}) (\d{2}) /);
  if (m && Number(m[2]) > Number(m[1])) { c.minCog = Number(m[1]); c.maxCog = Number(m[2]); }
  else if (m) c.teeth = `${m[1]}-${m[2]}`;
  m = take(/ (\d{2}) ?(?:t|dents?|teeth|z|zahne|dientes|denti) /);
  if (m) c.maxCog = Number(m[1]);
  for (const [d, words] of DISCIPLINE_WORDS) {
    for (const w of words) if (!c.discipline && take(new RegExp(` ${w} `))) c.discipline = d;
  }
  if (take(/ (electronique|di2|axs|eps|etap|electronic|elektronisch|electronico|elettronico) /)) c.system = 'electronique';
  if (take(/ (mecanique|cable|mechanical|mechanisch|mecanico|meccanico) /)) c.system = 'mecanique';
  if (take(/ (hydraulique|hydro|hydraulic|hydraulisch|hidraulico|idraulico) /)) c.brakeActuation = 'hydraulique';
  if (take(/ (mineral|minerale|mineralol) /)) c.fluid = 'mineral';
  if (take(/ dot /)) c.fluid = 'dot';
  for (const [w, v] of [['microspline', 'microspline'], ['xdr', 'xdr'], ['xd', 'xd'], ['n3w', 'n3w']]) {
    if (take(new RegExp(` ${w} `))) c.freehub = v;
  }
  if (take(/ (1x|mono) /)) c.front = 1;
  if (take(/ (2x|double) /)) c.front = 2;
  c.text = text.trim().replace(/ +/g, ' ');
  return c;
}

const CRITERIA_LABELS = {
  type: 'type', speeds: 'vitesses', discipline: 'discipline', cage: 'chape', system: 'commande',
  teeth: 'plateaux', maxCog: 'plus grand pignon', minCog: 'plus petit pignon', brakeActuation: 'freinage', fluid: 'fluide', freehub: 'corps de roue libre', front: 'plateaux',
};

function matches(part, key, c) {
  const a = part.attrs ?? {};
  switch (key) {
    case 'type': return part.type === c.type;
    case 'speeds': return a.speeds === c.speeds;
    case 'discipline': return part.discipline === c.discipline;
    case 'cage': return c.cage.values.includes(a.cageLength);
    case 'system': return a.system === c.system;
    case 'maxCog': return part.type === 'rear_derailleur' ? a.maxCog >= c.maxCog : a.maxCog === c.maxCog;
    case 'minCog': return a.minCog === c.minCog;
    case 'teeth': return a.teeth === c.teeth;
    case 'brakeActuation': return a.brakeActuation === c.brakeActuation;
    case 'fluid': return a.fluid === c.fluid;
    case 'freehub': return a.freehub === c.freehub;
    case 'front':
      if (part.type === 'crankset') return a.chainrings === c.front;
      // « 1x » = pièce spécifique mono-plateau ; « 2x » = accepte au moins deux plateaux.
      return c.front === 1 ? a.maxFrontChainrings === 1 : (a.maxFrontChainrings ?? 0) >= c.front;
    default: return true;
  }
}

// Ordre de relâchement quand rien ne correspond : du plus accessoire au plus structurant.
const RELAX_ORDER = ['cage', 'front', 'teeth', 'discipline', 'minCog', 'maxCog', 'fluid', 'freehub', 'brakeActuation', 'system', 'speeds'];

/**
 * Recherche combinée. Renvoie { results: [{part, score}], criteria, relaxed }.
 * `relaxed` liste les critères abandonnés faute de résultat (à afficher).
 */
export function searchParts(query, parts, { limit = 30 } = {}) {
  const criteria = parseCriteria(query);
  const keys = Object.keys(criteria).filter((k) => k !== 'text' && criteria[k] !== undefined);
  const relaxed = [];
  const prefix = /^(rd|fd|sl|st|cs|cn|br|bl|fc|bb|bp|bs|mf|sm)[-\s]?\d/i.test(query.trim())
    ? `${query.trim().slice(0, 2).toUpperCase()}-` : null;
  const digits = (query.match(/\d{3,}/) ?? [null])[0];

  const run = (active) => {
    const out = [];
    for (const part of parts) {
      if (!active.every((k) => matches(part, k, criteria))) continue;
      let score = criteria.text ? textScore(criteria.text, part) : 0.5;
      // Préfixe Shimano tapé (rd, fd, br…) : à correspondance approchée, la pièce du bon type passe devant.
      if (score > 0 && prefix && String(part.ref).toUpperCase().startsWith(prefix)) score += 0.05;
      // Le numéro de série tapé (« 8000 ») se retrouve tel quel dans la référence : légèrement devant.
      if (score > 0 && digits && String(part.ref).includes(digits)) score += 0.02;
      if (score > 0) out.push({ part, score });
    }
    return out;
  };

  let active = [...keys];
  let results = run(active);
  for (const k of RELAX_ORDER) {
    if (results.length || !active.includes(k)) continue;
    active = active.filter((x) => x !== k);
    relaxed.push(CRITERIA_LABELS[k]);
    results = run(active);
  }
  // La requête ressemblait peut-être à une référence : on retente sur le texte brut.
  if (!results.length && keys.length) {
    results = parts.map((part) => ({ part, score: textScore(query, part) })).filter((r) => r.score > 0);
    if (results.length) relaxed.splice(0, relaxed.length, 'tous les critères');
  }
  results.sort((x, y) => y.score - x.score || String(x.part.ref).localeCompare(String(y.part.ref)));
  return {
    results: results.slice(0, limit),
    criteria: Object.fromEntries(keys.map((k) => [CRITERIA_LABELS[k], k === 'cage' ? criteria.cage.label : criteria[k]])),
    relaxed,
  };
}
