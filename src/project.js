// Mode Projet : « je veux monter telle pièce sur mon vélo, que dois-je changer ? »
// La config est une liste d'emplacements ; on place la pièce cible, on évalue
// toutes les paires, puis on cherche le plus petit ensemble d'emplacements à
// changer (cascade) pour obtenir une config entièrement compatible.
import { LEVEL } from './levels.js';
import { EMPTY_KNOWLEDGE } from './knowledge.js';
import { evaluatePair } from './engine/core.js';
import { SYSTEM_RULES } from './engine/replacement.js';
import { partLabel } from './engine/finding.js';

export const REMOVE = '__retire__';

export const SLOTS = [
  { id: 'shifter', label: 'Commandes de vitesses', types: ['shifter'], accepts: (p) => p.attrs?.side !== 'avant' },
  { id: 'shifter_front', label: 'Commande avant (dérailleur avant)', types: ['shifter'], optional: true, accepts: (p) => p.attrs?.side === 'avant' },
  { id: 'rear_derailleur', label: 'Dérailleur arrière', types: ['rear_derailleur'] },
  { id: 'front_derailleur', label: 'Dérailleur avant', types: ['front_derailleur'], optional: true },
  { id: 'cassette', label: 'Cassette / roue libre', types: ['cassette'] },
  { id: 'chain', label: 'Chaîne', types: ['chain'] },
  { id: 'crankset', label: 'Pédalier', types: ['crankset'] },
  { id: 'bottom_bracket', label: 'Boîtier de pédalier', types: ['bottom_bracket'] },
  { id: 'brake_lever', label: 'Leviers de frein', types: ['brake_lever'], optional: true },
  { id: 'brake_caliper', label: 'Freins (étriers / patins)', types: ['brake_caliper'] },
  { id: 'rotor', label: 'Disques', types: ['rotor'], optional: true },
  { id: 'brake_pads', label: 'Plaquettes / patins', types: ['brake_pads'], optional: true },
];
const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

/**
 * Remplit une config avec les pièces d'un groupe (champ « generation »), en
 * choisissant pour chaque emplacement une pièce compatible avec les précédentes.
 */
export function groupConfig(generation, catalog, kb = EMPTY_KNOWLEDGE, threshold = LEVEL.KNOWN) {
  const slots = {};
  const chosen = [];
  for (const s of SLOTS) {
    const pick = catalog.find((p) => p.generation === generation && s.types.includes(p.type) && (!s.accepts || s.accepts(p))
      && chosen.every((o) => !evaluatePair(p, o, kb).some((f) => !(f.missing?.length) && f.level > threshold)));
    if (pick) { slots[s.id] = pick.id; chosen.push(pick); }
  }
  return slots;
}

/** Emplacement naturel d'une pièce. */
export function slotOf(part) {
  if (part.type === 'shifter') return part.attrs?.side === 'avant' ? 'shifter_front' : 'shifter';
  return SLOTS.find((s) => s.types.includes(part.type))?.id ?? null;
}

// Cadre et roue arrière : saisis par l'utilisateur (hors catalogue). Un champ
// absent n'est pas une incompatibilité mais une chose à mesurer.
function userPart(type, attrs, ref) {
  return { id: `config:${type}`, type, virtual: true, user: true, brand: '', ref, attrs: { ...(attrs ?? {}) } };
}

const MEASURES = [
  // [type de pièce présente, objet, champ, ce qu'il faut contrôler]
  ['rear_derailleur', 'frame', 'rdHanger', 'Type de patte de dérailleur du cadre (classique, UDH, direct mount)'],
  ['front_derailleur', 'frame', 'fdMount', 'Fixation du dérailleur avant sur le cadre (collier et diamètre du tube, braze-on, direct mount)'],
  ['bottom_bracket', 'frame', 'bbShell', 'Standard de la coque de boîtier du cadre (BSA, ITA, PF30, T47…) et sa largeur'],
  ['brake_caliper', 'frame', 'brakeMount', 'Fixations de frein du cadre et de la fourche (flat mount, post mount, IS, étrier, V-brake…)'],
  ['brake_caliper', 'frame', 'brakeReach', 'Portée de frein du cadre et de la fourche, pour un frein sur jante (vélos anciens : souvent plus longue que les étriers actuels)'],
  ['rotor', 'frame', 'maxRotor', 'Diamètre de disque maximal autorisé par le cadre et la fourche'],
  ['cassette', 'wheel', 'freehub', 'Corps de roue libre de la roue arrière (HG, Micro Spline, XD, XDR, Campagnolo…)'],
  ['brake_caliper', 'wheel', 'brakeInterface', 'Roues : piste de freinage sur jante ou moyeux pour disque'],
  ['rotor', 'wheel', 'rotorMount', 'Fixation des disques sur les moyeux (6 trous ou Center Lock)'],
];

const has = (v) => v !== undefined && v !== null && v !== '';

/** Pièces présentes (sans doublon) + cadre et roue, prêtes pour l'évaluation. */
function materialize(assign, byId, frame, wheel) {
  const parts = {};
  for (const [slot, id] of Object.entries(assign)) {
    if (id && id !== REMOVE && byId.get(id)) parts[slot] = byId.get(id);
  }
  return { parts, frame, wheel };
}

/** Emplacements obligatoires / interdits selon la config. */
function requirements(parts) {
  const crank = parts.crankset;
  const shifter = parts.shifter;
  const needFront = crank?.attrs?.chainrings ? crank.attrs.chainrings >= 2 : null;
  const integratedBrake = Boolean(shifter?.attrs?.brakeActuation);
  const caliper = parts.brake_caliper;
  return {
    front_derailleur: needFront === null ? 'libre' : needFront ? 'requis' : 'interdit',
    shifter_front: needFront === null ? 'libre' : needFront && shifter && shifter.attrs?.side !== 'les_deux' ? 'requis' : needFront ? 'libre' : 'inutile',
    brake_lever: caliper && shifter && !integratedBrake ? 'requis' : 'libre',
    rotor: caliper?.attrs?.brakeType === 'disque' ? 'requis' : caliper?.attrs?.brakeType === 'jante' ? 'interdit' : 'libre',
  };
}

/**
 * Évalue une config : constats par paire, constats « système », exigences.
 * Renvoie les conflits (niveau > seuil, hors données manquantes) et les
 * points à vérifier.
 */
function evaluateConfig({ parts, frame, wheel }, kb, threshold, lockedSlots) {
  const entries = Object.entries(parts);
  const issues = [];
  const push = (slots, f) => {
    const missing = f.missing?.length > 0;
    const conflict = !missing && f.level > threshold;
    const check = missing || Boolean(f.condition);
    if (conflict || check) issues.push({ slots, finding: f, conflict, check });
  };
  for (let i = 0; i < entries.length; i++) {
    const [sa, a] = entries[i];
    for (let j = i + 1; j < entries.length; j++) {
      const [sb, b] = entries[j];
      if (a.id === b.id) continue;
      for (const f of evaluatePair(a, b, kb)) push([sa, sb], f);
    }
    for (const [ext, obj] of [['frame', frame], ['wheel', wheel]]) {
      for (const f of evaluatePair(a, obj, kb)) push([sa, ext], f);
    }
  }
  const all = [...Object.values(parts), frame, wheel];
  for (const [sa, a] of entries) {
    for (const rule of SYSTEM_RULES[a.type] ?? []) {
      const f = rule.evaluate(a, all, kb);
      // Capacité / pignon max : on met en cause le dérailleur (sauf s'il est la cible).
      if (f) push(lockedSlots?.has(sa) ? ['cassette', 'crankset'].filter((x) => parts[x]) : [sa], f);
    }
  }
  return issues;
}

function requirementIssues(assign, parts, beforeReq = {}) {
  const req = requirements(parts);
  const out = [];
  for (const [slot, need] of Object.entries(req)) {
    const v = assign[slot];
    // Absent alors qu'il devient nécessaire (ex. levier de frein séparé après un changement de manettes).
    const newlyNeeded = need === 'requis' && v === undefined && beforeReq[slot] !== 'requis';
    if (need === 'requis' && (v === REMOVE || v === null || newlyNeeded)) out.push({ slot, kind: 'manquant' });
    if (need === 'interdit' && v && v !== REMOVE) out.push({ slot, kind: 'en_trop' });
  }
  return { req, out };
}

const levelOf = (findings) => (findings.length ? Math.max(...findings.map((f) => f.level)) : LEVEL.OFFICIAL);

/** Le candidat est-il compatible (au seuil) avec chacune des pièces fixes ? */
function compatibleWith(cand, fixed, kb, threshold) {
  for (const other of fixed) {
    if (!other || other.id === cand.id) continue;
    for (const f of evaluatePair(cand, other, kb)) {
      if (!(f.missing?.length) && f.level > threshold) return { ok: false, blocker: other, finding: f };
    }
  }
  return { ok: true };
}

const isFriction = (p) => p?.attrs?.indexed === false || p?.attrs?.family === 'friction';

/** Une donnée manque-t-il sur ce candidat pour le vérifier contre les pièces fixes ? */
function missingOn(cand, fixed, kb) {
  const mine = `${partLabel(cand)} →`;
  return fixed.some((other) => other && other.id !== cand.id
    && evaluatePair(cand, other, kb).some((f) => f.missing?.some((x) => x.startsWith(mine))));
}

/**
 * Écart entre la discipline d'une pièce et celle du vélo (0 = même discipline).
 * Un gravel emprunte volontiers des pièces route et VTT ; une pièce sans
 * discipline (« autre ») convient partout.
 */
export function disciplineRank(part, discipline) {
  if (!discipline || part.discipline === discipline) return 0;
  if (!part.discipline || part.discipline === 'autre') return 1;
  if (discipline === 'gravel' && (part.discipline === 'route' || part.discipline === 'vtt')) return 1;
  if (part.discipline === 'gravel') return 1;
  return 2;
}

/** Disciplines représentées dans un groupe (champ « generation »). */
export function groupDisciplines(generation, catalog) {
  return [...new Set(catalog.filter((p) => p.generation === generation).map((p) => p.discipline).filter((d) => d && d !== 'autre'))];
}

function rankCandidates(cands, target, current, discipline) {
  const score = (p) => 2 * disciplineRank(p, discipline) + (p.brand === current?.brand ? 0 : 1) + (p.brand === target.brand ? 0 : 1)
    + (p.generation && p.generation === target.generation ? -1 : 0)
    + (p.attrs?.form && current?.attrs?.form && p.attrs.form !== current.attrs.form ? 2 : 0);
  return [...cands].sort((x, y) => score(x) - score(y) || String(x.ref).localeCompare(String(y.ref)));
}

/**
 * Analyse d'un projet.
 * @param config  { slots: { [slotId]: partId | REMOVE }, frame: {attrs}, wheel: {attrs} }
 * @param targetId pièce à monter
 * @param opts { kb, catalog, threshold = LEVEL.KNOWN, maxRounds = 6, locked = [], prefer, discipline }
 *   discipline : 'route' | 'gravel' | 'vtt' — les pièces de cette discipline passent en premier.
 */
export function analyzeProject(config, targetId, { kb = EMPTY_KNOWLEDGE, catalog = [], threshold = LEVEL.KNOWN, maxRounds = 6, locked = [], prefer = {}, discipline = config.discipline ?? null } = {}) {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const target = byId.get(targetId);
  if (!target) throw new Error(`Pièce cible inconnue : ${targetId}`);
  const targetSlot = slotOf(target);
  const frame = userPart('frame', config.frame?.attrs ?? config.frame, 'votre cadre / fourche');
  const wheel = userPart('wheel', config.wheel?.attrs ?? config.wheel, 'votre roue arrière');

  const before = { ...config.slots };
  const assign = { ...before, [targetSlot]: target.id };
  // Une paire de leviers route (« les_deux ») tient aussi le rôle de commande avant.
  if (targetSlot === 'shifter' && target.attrs?.side === 'les_deux' && assign.shifter_front && assign.shifter_front !== REMOVE) {
    assign.shifter_front = REMOVE;
  }
  const lockedSlots = new Set([targetSlot, ...locked]);
  const beforeReq = requirements(materialize(before, byId, frame, wheel).parts);

  const evalAll = (a) => {
    const m = materialize(a, byId, frame, wheel);
    const issues = evaluateConfig(m, kb, threshold, lockedSlots);
    const { req, out } = requirementIssues(a, m.parts, beforeReq);
    return { m, issues, req, reqIssues: out };
  };

  // Incompatibilités déjà présentes dans la config saisie (souvent une erreur de saisie).
  const beforeEval = evaluateConfig(materialize(before, byId, frame, wheel), kb, threshold, new Set());
  const preexisting = beforeEval.filter((x) => x.conflict).map((x) => ({
    slots: x.slots, message: x.finding.message,
  }));

  // --- Cascade -------------------------------------------------------------
  const initial = evalAll(assign);
  const reasons = {};       // slot → raisons de changement
  const cascade = [];       // [{ slot, because }]
  const external = [];      // conflits avec le cadre ou la roue (hors catalogue)
  const addReason = (slot, r) => { (reasons[slot] ??= new Set()).add(r); };

  const toChange = new Set();
  for (const is of initial.issues.filter((x) => x.conflict)) {
    const ext = is.slots.filter((s) => s === 'frame' || s === 'wheel');
    const inner = is.slots.filter((s) => s !== 'frame' && s !== 'wheel' && assign[s] && assign[s] !== REMOVE);
    if (ext.length) {
      external.push({ what: ext[0], finding: is.finding, with: inner.map((s) => partLabel(initial.m.parts[s])) });
      continue;
    }
    const free = inner.filter((s) => !lockedSlots.has(s));
    if (!free.length) { external.push({ what: 'cible', finding: is.finding, with: inner.map((s) => partLabel(initial.m.parts[s])) }); continue; }
    // Conflit avec la cible : l'autre pièce change. Conflit préexistant : on le signale et on change la pièce non verrouillée.
    for (const s of free) { toChange.add(s); addReason(s, is.finding.message); }
  }
  for (const r of initial.reqIssues) {
    toChange.add(r.slot);
    addReason(r.slot, r.kind === 'manquant'
      ? `${SLOT_BY_ID[r.slot].label} : à ajouter, nécessaire avec cette configuration.`
      : `${SLOT_BY_ID[r.slot].label} inutile avec cette configuration : à retirer.`);
  }

  // Un cadre ou une roue déjà en conflit avec la cible devra changer : on ne s'en sert pas pour filtrer.
  const externalBroken = new Set(external.map((e) => e.what));
  let solution = null;
  let partial = {};
  let rounds = 0;
  let unsolved = [];
  while (rounds++ < maxRounds) {
    const res = solve(assign, [...toChange], { byId, catalog, kb, threshold, frame, wheel, target, before, prefer, beforeReq, externalBroken, discipline });
    if (res.solution) { solution = res.solution; break; }
    unsolved = res.empty;
    partial = res.partial ?? {};
    // Emplacements qui bloquent les meilleurs candidats : ils entrent dans la cascade.
    let grew = false;
    for (const { slot, blockers } of res.blocked) {
      for (const b of blockers) {
        if (!toChange.has(b.slot) && !lockedSlots.has(b.slot) && b.slot !== 'frame' && b.slot !== 'wheel') {
          toChange.add(b.slot);
          addReason(b.slot, `Doit suivre le changement de « ${SLOT_BY_ID[slot].label.toLowerCase()} » : ${b.finding.message}`);
          cascade.push({ slot: b.slot, because: slot });
          grew = true;
        }
      }
    }
    if (!grew) break;
  }

  // Sans solution complète : meilleur candidat de chaque emplacement pris isolément.
  const finalAssign = { ...assign, ...(solution ?? partial) };
  const final = evalAll(finalAssign);
  // Sans solution : emplacements sans candidat (ou « retiré » alors qu'il reste nécessaire).
  const noCandidate = solution ? new Set() : new Set([...toChange].filter((s) => !partial[s] || partial[s] === assign[s]
    || (partial[s] === REMOVE && final.req[s] === 'requis')));
  if (!solution && !unsolved.length) unsolved = [...noCandidate];

  // --- Points à vérifier (⚠️) ----------------------------------------------
  const checks = [];
  for (const is of final.issues.filter((x) => x.check)) {
    const f = is.finding;
    if (f.condition) checks.push({ slots: is.slots, text: f.condition });
    if (f.missing?.length) checks.push({ slots: is.slots, text: `Donnée manquante dans la base : ${f.missing.join(', ')}.` });
  }
  // À mesurer : seulement pour les pièces neuves (les pièces gardées sont déjà montées).
  const newTypes = new Set(Object.entries(final.m.parts).filter(([k, p]) => p.id !== before[k]).map(([, p]) => p.type));
  for (const [type, objName, field, text] of MEASURES) {
    const obj = objName === 'frame' ? frame : wheel;
    if (newTypes.has(type) && !has(obj.attrs[field])) checks.push({ slots: [slotOf({ type, attrs: {} }), objName], text, measure: true });
  }
  for (const s of SLOTS) {
    if (!finalAssign[s.id] && final.req[s.id] === 'requis') checks.push({ slots: [s.id], text: `${s.label} : pièce actuelle non renseignée, non vérifiée.` });
  }

  // Commande de forme différente (levier route ↔ gâchette VTT…) : cintre et leviers à revoir.
  const FORMS = { levier_route: 'levier route', gachette_vtt: 'gâchette VTT', poignee_tournante: 'poignée tournante', bout_de_cintre: 'manette en bout de cintre', satellite: 'satellite' };
  const shBefore = byId.get(before.shifter);
  const shAfter = final.m.parts.shifter;
  if (shBefore?.attrs?.form && shAfter?.attrs?.form && shBefore.attrs.form !== shAfter.attrs.form && shAfter.id !== shBefore.id) {
    checks.push({ slots: ['shifter'], text: `Forme différente : ${FORMS[shBefore.attrs.form] ?? shBefore.attrs.form} → ${FORMS[shAfter.attrs.form] ?? shAfter.attrs.form}. Cintre, leviers de frein et gaines à adapter.` });
  }

  // Longueur de chaîne (coefficients de la base, base mesurée par l'utilisateur).
  const chainInfo = chainLength(final.m.parts, frame, kb);
  const chainChanged = ['cassette', 'crankset', 'rear_derailleur', 'chain'].some((s) => finalAssign[s] !== before[s]);
  if (chainChanged) {
    if (chainInfo.links) checks.push({ slots: ['chain'], text: chainInfo.text, info: true });
    else checks.push({ slots: ['chain', 'frame'], text: chainInfo.text, measure: true });
  }

  // --- Recommandations (💡) -------------------------------------------------
  const recommendations = recommend(kb, { before, after: finalAssign, byId, parts: final.m.parts });

  // --- Synthèse par emplacement --------------------------------------------
  const slots = SLOTS.map((s) => {
    const was = before[s.id];
    const now = finalAssign[s.id];
    const wasPart = was && was !== REMOVE ? byId.get(was) : null;
    const nowPart = now && now !== REMOVE ? byId.get(now) : null;
    let status;
    if (s.id === targetSlot) status = 'cible';
    else if (noCandidate.has(s.id)) status = 'introuvable';
    else if (was === now || (!was && !now)) status = 'ok';
    else if (now === REMOVE || (!now && was)) status = 'retirer';
    else if (!wasPart && nowPart) status = 'ajouter';
    else status = 'changer';
    if (status === 'ok' && !wasPart && !now) status = final.req[s.id] === 'requis' ? 'inconnu' : 'absent';
    const myChecks = checks.filter((c) => c.slots.includes(s.id)).map((c) => c.text);
    const myRecos = recommendations.filter((r) => r.slot === s.id);
    if (status === 'ok' && myChecks.length) status = 'verifier';
    let alternatives = [];
    let unverified = [];
    if (status === 'introuvable') {
      (reasons[s.id] ??= new Set()).add('Aucune pièce de la base ne convient avec le reste de la configuration (donnée manquante ou combinaison impossible).');
    }
    if (['changer', 'ajouter', 'introuvable'].includes(status)) {
      const fixed = Object.entries(final.m.parts).filter(([k]) => k !== s.id).map(([, p]) => p);
      const cands = catalog
        .filter((p) => s.types.includes(p.type) && (s.accepts ? s.accepts(p) : true) && p.id !== now)
        .filter((p) => compatibleWith(p, [...fixed, frame, wheel], kb, threshold).ok);
      const byDiscipline = (x, y) => disciplineRank(x, discipline) - disciplineRank(y, discipline);
      for (const p of [...cands].sort(byDiscipline)) (missingOn(p, [...fixed, frame, wheel], kb) ? unverified : alternatives).push(p);
      alternatives = alternatives.slice(0, 30);
      unverified = unverified.slice(0, 15);
    }
    return {
      slot: s.id, label: s.label, status, before: wasPart, after: nowPart,
      reasons: [...(reasons[s.id] ?? [])], checks: [...new Set(myChecks)], recommendations: myRecos, alternatives, unverified,
    };
  });

  // --- Liste de courses ------------------------------------------------------
  const shopping = [{ part: target, slot: targetSlot, why: 'Pièce du projet' }];
  for (const s of slots) if (['changer', 'ajouter'].includes(s.status) && s.after) shopping.push({ part: s.after, slot: s.slot, why: s.reasons[0] ?? '' });
  // Travaux, outils et pièces en plus : seulement là où une pièce change.
  const changedIds = new Set(shopping.map((x) => x.part.id));
  const allFindings = [];
  const parts = Object.values(final.m.parts);
  for (let i = 0; i < parts.length; i++) {
    const ci = changedIds.has(parts[i].id);
    for (let j = i + 1; j < parts.length; j++) {
      if (ci || changedIds.has(parts[j].id)) allFindings.push(...evaluatePair(parts[i], parts[j], kb));
    }
    if (ci) allFindings.push(...evaluatePair(parts[i], frame, kb), ...evaluatePair(parts[i], wheel, kb));
  }
  const uniq = (xs) => [...new Set(xs.filter(Boolean))];
  const extras = uniq(allFindings.flatMap((f) => f.extraParts));
  const works = uniq(allFindings.flatMap((f) => f.adjustments));
  const tools = uniq(allFindings.flatMap((f) => f.tools));

  // Cible trop coûteuse : pièces du même type compatibles avec la config d'origine.
  const changes = slots.filter((s) => ['changer', 'ajouter'].includes(s.status)).length;
  let alternativesToTarget = [];
  if (changes >= 3 || !solution || external.length) {
    const origFixed = Object.entries(materialize(before, byId, frame, wheel).parts)
      .filter(([k]) => k !== targetSlot).map(([, p]) => p);
    alternativesToTarget = catalog
      .filter((p) => p.type === target.type && p.id !== target.id && p.id !== before[targetSlot])
      .filter((p) => compatibleWith(p, origFixed, kb, threshold).ok)
      .sort((x, y) => (similarity(y, target) - 1.5 * disciplineRank(y, discipline)) - (similarity(x, target) - 1.5 * disciplineRank(x, discipline)))
      .slice(0, 6);
  }

  return {
    target, targetSlot, solved: Boolean(solution) && external.length === 0,
    solution: finalAssign, slots, cascade,
    external: external.map((e) => ({ what: e.what, message: e.finding.message, with: e.with, absolute: e.finding.absolute })),
    unsolved: unsolved.map((s) => SLOT_BY_ID[s]?.label ?? s),
    checks, recommendations, shopping, extras, works, tools, chain: chainInfo, alternativesToTarget,
    preexisting: preexisting.map((x) => ({ ...x, labels: x.slots.map((k) => SLOT_BY_ID[k]?.label ?? (k === 'frame' ? 'Cadre' : 'Roue arrière')) })),
  };
}

function similarity(p, t) {
  const a = p.attrs ?? {};
  const b = t.attrs ?? {};
  let s = 0;
  if (a.speeds === b.speeds) s += 3;
  if (p.discipline === t.discipline) s += 1;
  if (b.maxCog && a.maxCog >= b.maxCog) s += 2;
  if (b.maxCog && a.maxCog) s -= Math.abs(a.maxCog - b.maxCog) / 10;
  if (p.brand === t.brand) s += 1;
  return s;
}

/**
 * Recherche d'une affectation compatible pour les emplacements `slots`
 * (retour arrière), les autres étant fixes. Renvoie { solution } ou
 * { blocked: [{ slot, blockers }], empty: [slot] }.
 */
function solve(assign, slots, ctx) {
  const { byId, catalog, kb, threshold, frame, wheel, target, before, prefer, beforeReq, externalBroken, discipline } = ctx;
  const fixedParts = Object.entries(assign)
    .filter(([k, v]) => !slots.includes(k) && v && v !== REMOVE && byId.get(v))
    .map(([k, v]) => ({ slot: k, part: byId.get(v) }));
  const fixedList = [...fixedParts.map((x) => x.part),
    ...(externalBroken?.has('frame') ? [] : [frame]), ...(externalBroken?.has('wheel') ? [] : [wheel])];
  const slotOfPart = new Map(fixedParts.map((x) => [x.part.id, x.slot]));
  slotOfPart.set(frame.id, 'frame');
  slotOfPart.set(wheel.id, 'wheel');

  // Exigences calculées sur la config où les emplacements à changer sont encore actuels.
  const domains = {};
  const blocked = [];
  const empty = [];
  for (const s of slots) {
    const def = SLOT_BY_ID[s];
    // Une manette à friction ne remplace pas d'office une manette indexée (perte de fonction) :
    // elle reste proposée dans les autres remplaçants.
    const cur = byId.get(before[s]);
    const keepIndexed = def.types.includes('shifter') && cur && !isFriction(cur);
    const pool = catalog.filter((p) => def.types.includes(p.type) && (def.accepts ? def.accepts(p) : true)
      && !(keepIndexed && isFriction(p)));
    const okList = [];
    const blockers = new Map();
    for (const p of rankCandidates(pool, target, byId.get(before[s]), discipline)) {
      const r = compatibleWith(p, fixedList, kb, threshold);
      if (r.ok) okList.push(p);
      else if (r.blocker) {
        const bs = slotOfPart.get(r.blocker.id) ?? r.blocker.id;
        if (!blockers.has(bs)) blockers.set(bs, { slot: bs, finding: r.finding, count: 0 });
        blockers.get(bs).count++;
      }
    }
    if (prefer[s]) okList.sort((x, y) => (y.id === prefer[s]) - (x.id === prefer[s]));
    domains[s] = okList.slice(0, 40).map((p) => p.id);
    if (def.optional) domains[s].push(REMOVE);
    if (!domains[s].length) {
      empty.push(s);
      blocked.push({ slot: s, blockers: [...blockers.values()].sort((a, b) => b.count - a.count).slice(0, 2) });
    }
  }
  // Solution partielle cohérente : affectation gloutonne, chaque choix compatible avec les précédents.
  const greedy = () => {
    const out = {};
    const chosen = [];
    for (const s of [...slots].sort((a, b) => domains[a].length - domains[b].length)) {
      const pick = domains[s].find((id) => id === REMOVE
        || chosen.every((o) => !evaluatePair(byId.get(id), o, kb).some((f) => !(f.missing?.length) && f.level > threshold)));
      if (pick === undefined) continue;
      out[s] = pick;
      if (pick !== REMOVE) chosen.push(byId.get(pick));
    }
    return out;
  };
  if (empty.length) return { blocked, empty, partial: greedy() };

  const order = [...slots].sort((a, b) => domains[a].length - domains[b].length);
  const current = { ...assign };
  let nodes = 0;
  const pairOk = (p, q) => !evaluatePair(p, q, kb).some((f) => !(f.missing?.length) && f.level > threshold);

  const fullOk = () => {
    const m = materialize(current, byId, frame, wheel);
    if (requirementIssues(current, m.parts, beforeReq).out.length) return false;
    const all = [...Object.values(m.parts), frame, wheel];
    for (const p of Object.values(m.parts)) {
      for (const rule of SYSTEM_RULES[p.type] ?? []) {
        const f = rule.evaluate(p, all, kb);
        if (f && !(f.missing?.length) && f.level > threshold) return false;
      }
    }
    return true;
  };

  const rec = (i) => {
    if (++nodes > 20000) return false;
    if (i === order.length) return fullOk();
    const s = order[i];
    for (const id of domains[s]) {
      if (id !== REMOVE) {
        const p = byId.get(id);
        let ok = true;
        for (let j = 0; j < i && ok; j++) {
          const o = current[order[j]];
          if (o && o !== REMOVE) ok = pairOk(p, byId.get(o));
        }
        if (!ok) continue;
      }
      current[s] = id;
      if (rec(i + 1)) return true;
    }
    current[s] = assign[s];
    return false;
  };
  if (rec(0)) return { solution: Object.fromEntries(slots.map((s) => [s, current[s]])) };
  // Toutes les combinaisons échouent : on élargit aux emplacements fixes en conflit avec les meilleurs candidats.
  const out = [];
  for (const s of slots) {
    const first = domains[s].find((x) => x !== REMOVE);
    if (!first) continue;
    const p = byId.get(first);
    const blockers = [];
    for (const { slot, part } of fixedParts) {
      const f = evaluatePair(p, part, kb).find((x) => !(x.missing?.length) && x.level > threshold);
      if (f) blockers.push({ slot, finding: f });
    }
    out.push({ slot: s, blockers });
  }
  // Exigences (ex. dérailleur avant requis) : l'emplacement concerné entre dans la cascade.
  // Calculées avec les meilleurs candidats (une manette sans frein intégré exige un levier de frein).
  const probe = { ...assign, ...greedy() };
  const m = materialize(probe, byId, frame, wheel);
  for (const r of requirementIssues(probe, m.parts, beforeReq).out) {
    if (!slots.includes(r.slot)) out.push({ slot: slots[0], blockers: [{ slot: r.slot, finding: { message: `${SLOT_BY_ID[r.slot].label} : exigence de la nouvelle configuration.` } }] });
  }
  return { blocked: out, empty: [], partial: greedy() };
}

/** Longueur de chaîne selon la méthode de la base (coefficients sourcés). */
export function chainLength(parts, frame, kb) {
  const method = kb.tables?.chainLength?.[0];
  const crank = parts.crankset;
  const cas = parts.cassette;
  const teeth = String(crank?.attrs?.teeth ?? '').split(/[-/]/).map(Number).filter(Boolean);
  const C = frame?.attrs?.chainstayLength;
  if (!method) return { text: 'Longueur de chaîne à recalculer (méthode de calcul absente de la base).' };
  if (!C) return { text: `Longueur de chaîne à recalculer : mesurez la longueur de base (axe du pédalier → axe de roue arrière). ${method.message}` };
  if (!teeth.length || !cas?.attrs?.maxCog) return { text: `Longueur de chaîne à recalculer : dentures du pédalier ou de la cassette inconnues. ${method.message}` };
  const F = Math.max(...teeth);
  const R = cas.attrs.maxCog;
  const length = (method.chainstayFactor * C) / method.unitMm + method.teethFactor * (F + R) + method.constant;
  let links = Math.ceil(length * method.linksPerUnit);
  if (links % 2) links += 1;
  return {
    links, F, R, chainstay: C,
    text: `Chaîne ≈ ${links} maillons (base ${C} mm, ${F} dents × ${R} dents, ${method.label}). ${method.message}`,
    source: method.source,
  };
}

function recommend(kb, { before, after, byId, parts }) {
  const out = [];
  const changed = (s) => before[s] !== after[s];
  const crankBefore = before.crankset && before.crankset !== REMOVE ? byId.get(before.crankset) : null;
  const ctx = {
    cassette_changee: changed('cassette'),
    plateaux_changes: changed('crankset'),
    passage_1x: (crankBefore?.attrs?.chainrings ?? 0) >= 2 && parts.crankset?.attrs?.chainrings === 1,
    mono_sans_embrayage: parts.crankset?.attrs?.chainrings === 1 && parts.rear_derailleur && parts.rear_derailleur.attrs?.clutch !== true,
    mono_sans_narrow_wide: parts.crankset?.attrs?.chainrings === 1 && parts.crankset.attrs.narrowWide !== true,
    transmission_changee: ['cassette', 'crankset', 'rear_derailleur'].some(changed),
    freins_hydrauliques: changed('brake_caliper') && parts.brake_caliper?.attrs?.brakeActuation === 'hydraulique',
  };
  for (const r of kb.tables?.recommendations ?? []) {
    if (!ctx[r.trigger]) continue;
    let message = r.message;
    if (r.trigger === 'mono_sans_embrayage' && parts.rear_derailleur.attrs?.clutch === undefined) {
      message += ' (Présence d\'un embrayage non renseignée pour ce dérailleur.)';
    }
    out.push({ slot: r.slot, message, source: r.source, toValidate: r.status !== 'valide' });
  }
  return out;
}
