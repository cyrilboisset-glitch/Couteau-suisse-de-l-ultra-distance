// Onglet « Projet » : je veux monter telle pièce, que dois-je changer ?
import { analyzeProject, SLOTS, REMOVE, slotOf, groupConfig, disciplineRank } from './src/project.js';
import { ENUMS } from './src/schema.js';
import { t, tr, trName } from './src/i18n/index.js';

const STATUS = {
  cible: { icon: '🎯', label: 'Pièce du projet', cls: 'l1' },
  ok: { icon: '✅', label: 'Compatible, rien à faire', cls: 'l1' },
  verifier: { icon: '⚠️', label: 'À vérifier', cls: 'l3' },
  changer: { icon: '❌', label: 'À changer obligatoirement', cls: 'l4' },
  ajouter: { icon: '➕', label: 'À ajouter', cls: 'l4' },
  retirer: { icon: '➖', label: 'À retirer', cls: 'l3' },
  introuvable: { icon: '❌', label: 'À changer : aucune pièce de la base ne convient', cls: 'l4' },
  inconnu: { icon: '❔', label: 'Pièce actuelle non renseignée', cls: 'l3' },
};

// Champs du cadre et de la roue arrière (tous facultatifs : « je ne sais pas » est permis).
const FRAME_FIELDS = [
  ['frame', 'rdHanger', 'Patte de dérailleur', 'frameHanger'],
  ['frame', 'fdMount', 'Fixation du dérailleur avant', 'fdMount'],
  ['frame', 'bbShell', 'Coque de boîtier', 'bbShell'],
  ['frame', 'bbShellWidth', 'Largeur de coque (mm)', null],
  ['frame', 'brakeMount', 'Fixation des freins', 'brakeMount'],
  ['frame', 'maxRotor', 'Disque max autorisé (mm)', null],
  ['frame', 'brakeReach', 'Portée de frein sur jante (mm, boulon → piste de jante)', null],
  ['frame', 'chainstayLength', 'Longueur de base (mm, axe pédalier → axe roue)', null],
  ['wheel', 'freehub', 'Corps de roue libre (roue arrière)', 'freehub'],
  ['wheel', 'freewheelThread', 'Ou moyeu à visser : filetage de roue libre', 'freewheelThread'],
  ['wheel', 'brakeInterface', 'Roues : freinage', 'wheelBrake'],
  ['wheel', 'rotorMount', 'Fixation des disques sur le moyeu', 'rotorMount'],
];

// Types de vélo proposés pour un montage.
const BIKE_TYPES = [
  { id: 'route', icon: '🚴', label: 'Route' },
  { id: 'gravel', icon: '🪨', label: 'Gravel' },
  { id: 'vtt', icon: '🚵', label: 'VTT' },
];

/** Discipline principale d'un groupe : celle de la majorité de ses pièces. */
function mainDiscipline(parts) {
  const n = {};
  for (const p of parts) if (p.discipline && p.discipline !== 'autre') n[p.discipline] = (n[p.discipline] ?? 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'autre';
}

const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createProjetView(ctx) {
  const { state, view, esc, x, nm, fmt, searchBox, partTitle, partSub, store, stagger, toast } = ctx;
  const bikeType = (proj) => BIKE_TYPES.find((b) => b.id === proj.discipline);

  /** Liste des groupes, rangés par discipline ; celle du vélo d'abord. */
  function groupOptions(proj) {
    const byGen = new Map();
    for (const p of state.parts) if (p.generation) (byGen.get(p.generation) ?? byGen.set(p.generation, []).get(p.generation)).push(p);
    const buckets = { route: [], gravel: [], vtt: [], autre: [] };
    // Un groupe a au moins une commande ou un dérailleur arrière (les séries de chaînes « 9v »… n'en sont pas).
    const label = (g, ps) => `${[...new Set(ps.map((p) => p.brand))].join(' / ')} · ${trName(g)}`;
    for (const [g, ps] of byGen) {
      if (ps.some((p) => p.type === 'shifter' || p.type === 'rear_derailleur')) buckets[mainDiscipline(ps)].push({ g, text: label(g, ps) });
    }
    for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => a.text.localeCompare(b.text, 'fr', { numeric: true }));
    const d = proj.discipline;
    // Gravel : groupes gravel, puis route et VTT (souvent utilisés en gravel).
    const order = d === 'gravel' ? ['gravel', 'route', 'vtt', 'autre'] : d ? [d, 'gravel', 'autre', ...['route', 'vtt'].filter((k) => k !== d)] : ['route', 'gravel', 'vtt', 'autre'];
    const labels = { route: t('Route'), gravel: t('Gravel'), vtt: t('VTT'), autre: t('Composants (standards)') };
    return order.filter((k) => buckets[k].length).map((k, i) => {
      const head = d && i > 0 ? t('Autres : {0}', labels[k]) : labels[k];
      return `<optgroup label="${esc(head)}">${buckets[k].map(({ g, text }) => `<option value="${esc(g)}">${esc(text)}</option>`).join('')}</optgroup>`;
    }).join('');
  }
  const rankFor = (proj) => (proj.discipline ? (p) => disciplineRank(p, proj.discipline) : null);
  const typeChips = (proj) => `<div class="chips bike-type" role="radiogroup" aria-label="${esc(t('Type de vélo'))}">
      ${BIKE_TYPES.map((b) => `<button type="button" class="chip-btn" role="radio" data-disc="${b.id}" aria-checked="${proj.discipline === b.id}" aria-pressed="${proj.discipline === b.id}">${b.icon} ${t(b.label)}</button>`).join('')}
    </div>`;
  const load = () => store.get('projects', []);
  const save = (list) => store.set('projects', list);
  const get = (id) => load().find((p) => p.id === id);
  const put = (proj) => {
    proj.updated = new Date().toISOString();
    save([proj, ...load().filter((p) => p.id !== proj.id)]);
  };
  const part = (id) => (id && id !== REMOVE ? state.byId.get(id) : null);

  function list() {
    const projects = load();
    view.innerHTML = `<h2>${t('Projets')}</h2>
      <p class="muted small">${t('Je veux monter une pièce sur mon vélo : qu\'est-ce qui reste compatible, que faut-il changer, quoi acheter ? Les projets sont gardés sur ce téléphone.')}</p>
      ${store.persistent ? '' : `<p class="note">${t('Ce navigateur bloque l\'enregistrement : les projets restent disponibles jusqu\'à la fermeture de la page. Pour les garder, utilisez « Copier le projet » ou ouvrez l\'appli depuis Chrome (pas depuis un aperçu de fichier).')}</p>`}
      <div class="btn-row"><button class="btn" type="button" id="new">+ ${t('Nouveau projet')}</button>
        <button class="btn ghost" type="button" id="import">${t('Importer')}</button></div>
      <div id="import-box" hidden><textarea id="import-text" rows="5" placeholder="${esc(t('Collez ici un projet copié'))}"></textarea>
        <div class="btn-row"><button class="btn" type="button" id="import-ok">${t('Importer ce projet')}</button></div><p class="note" id="import-msg" hidden></p></div>
      <ul class="list" id="plist">${projects.map((p) => `<li><a class="row" href="#/projet/${esc(p.id)}">
        <span class="main"><span class="ref">${bikeType(p) ? `${bikeType(p).icon} ` : ''}${esc(p.name)}</span><span class="sub">${bikeType(p) ? `${t(bikeType(p).label)} · ` : ''}${p.target ? t('Cible : {0}', esc(partTitle(part(p.target) ?? { brand: '', ref: p.target }))) : t('Pièce cible à choisir')} · ${t('{0} pièce(s)', Object.values(p.config.slots).filter(Boolean).length)}</span></span>
        <span class="act">${t('Ouvrir')} ›</span></a></li>`).join('') || `<li class="empty">${t('Aucun projet pour l\'instant.')}</li>`}</ul>`;
    stagger(view.querySelector('#plist'));
    view.querySelector('#new').addEventListener('click', () => {
      const n = load().length + 1;
      const proj = { id: uid(), name: t('Projet {0}', n), config: { slots: {}, frame: {}, wheel: {} }, target: null, done: [] };
      put(proj);
      location.hash = `#/projet/${proj.id}`;
    });
    const box = view.querySelector('#import-box');
    view.querySelector('#import').addEventListener('click', () => { box.hidden = !box.hidden; });
    view.querySelector('#import-ok').addEventListener('click', () => {
      const msg = view.querySelector('#import-msg');
      msg.hidden = false;
      try {
        const proj = JSON.parse(view.querySelector('#import-text').value);
        if (!proj?.config?.slots) throw new Error(t('format inattendu'));
        proj.id = uid();
        put(proj);
        location.hash = `#/projet/${proj.id}`;
      } catch (err) {
        msg.textContent = t('Import impossible : {0}. Collez le texte obtenu avec « Copier le projet ».', err.message);
      }
    });
  }

  function slotRow(proj, s) {
    const id = proj.config.slots[s.id];
    const p = part(id);
    const value = id === REMOVE ? t('Aucun (retiré)') : p ? partTitle(p) : t('Non renseigné');
    return `<li><button class="row" type="button" data-slot="${s.id}">
      <span class="main"><span class="sub">${x(s.label)}</span><span class="ref">${esc(value)}</span></span>
      <span class="act">${t('Modifier')} ›</span></button><div class="slot-edit" data-edit="${s.id}"></div></li>`;
  }

  function frameForm(proj) {
    return FRAME_FIELDS.map(([obj, key, label, en]) => {
      const v = proj.config[obj]?.[key] ?? '';
      const fid = `f-${obj}-${key}`;
      const input = en
        ? `<select id="${fid}" data-obj="${obj}" data-key="${key}"><option value="">${t('Je ne sais pas')}</option>${ENUMS[en].map((o) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(fmt(o))}</option>`).join('')}</select>`
        : `<input id="${fid}" type="number" inputmode="decimal" data-obj="${obj}" data-key="${key}" value="${esc(v)}" placeholder="${esc(t('Je ne sais pas'))}">`;
      return `<label class="field" for="${fid}"><span>${x(label)}</span>${input}</label>`;
    }).join('');
  }

  function resultHtml(proj) {
    if (!proj.target) return `<p class="empty">${t('Choisissez la pièce cible pour voir le résultat.')}</p>`;
    let r;
    try {
      r = analyzeProject(proj.config, proj.target, { kb: state.kb, catalog: state.parts, prefer: proj.prefer ?? {}, discipline: proj.discipline ?? null });
    } catch (err) {
      return `<p class="note">${t('Analyse impossible : {0}', esc(err.message))}</p>`;
    }
    const toDo = r.slots.filter((s) => ['changer', 'ajouter', 'retirer', 'introuvable'].includes(s.status));
    const ext = r.external;
    const head = r.solved
      ? `<p class="note ok-note">${t('Configuration entièrement compatible après {0} changement(s).', toDo.length)}</p>`
      : `<p class="note">${t('Pas de configuration entièrement compatible avec la base actuelle : voir les points ❌ ci-dessous.')}</p>`;
    const extHtml = ext.map((e) => `<article class="card l4"><span class="badge l4">❌ ${e.what === 'wheel' ? t('Roue arrière') : e.what === 'frame' ? t('Cadre / fourche') : t('Pièce du projet')}</span>
      <p>${x(e.message)}</p>${e.what === 'wheel' && proj.config.wheel?.freehubOptions ? `<p class="small muted">${t('Corps proposés pour ce moyeu : {0}', esc(proj.config.wheel.freehubOptions))}</p>` : ''}
      <p class="small muted">${e.what === 'wheel' ? t('Hors catalogue : à adapter ou remplacer (corps de roue libre si le fabricant du moyeu en propose un, sinon roue).') : t('Hors catalogue : à adapter ou remplacer.')}</p></article>`).join('');
    const altList = (slot, list) => `<ul class="list">${list.map((p) => `<li><button class="row" type="button" data-prefer="${slot}" data-id="${esc(p.id)}"><span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">${t('Choisir')}</span></button></li>`).join('')}</ul>`;
    const cards = r.slots.filter((s) => s.status !== 'absent').map((s, i) => {
      const st = STATUS[s.status] ?? STATUS.ok;
      const alts = s.alternatives.filter((p) => p.id !== s.after?.id);
      return `<article class="card ${st.cls}" style="--i:${i}">
        <span class="badge ${st.cls}">${st.icon} ${t(st.label)}</span>
        <h3>${x(s.label)}</h3>
        <p class="small">${s.before ? esc(partTitle(s.before)) : '—'}${s.after && s.after.id !== s.before?.id ? ` → <strong>${esc(partTitle(s.after))}</strong>` : ''}</p>
        ${s.reasons.length ? `<div class="block"><h4>${t('Pourquoi')}</h4><ul>${s.reasons.map((m) => `<li>${x(m)}</li>`).join('')}</ul></div>` : ''}
        ${s.checks.length ? `<div class="block"><h4>${t('⚠️ À vérifier / mesurer')}</h4><ul>${s.checks.map((m) => `<li>${x(m)}</li>`).join('')}</ul></div>` : ''}
        ${s.recommendations.length ? `<div class="block"><h4>${t('💡 Recommandé')}</h4><ul>${s.recommendations.map((m) => `<li>${x(m.message)}${m.toValidate ? ` <span class="chip warn">${t('à valider')}</span>` : ''}${m.source?.url ? ` <a href="${esc(m.source.url)}" target="_blank" rel="noopener">${t('source')}</a>` : ''}</li>`).join('')}</ul></div>` : ''}
        ${alts.length ? `<details><summary>${t('Autres remplaçants possibles ({0})', alts.length)}</summary>${altList(s.slot, alts)}</details>` : ''}
        ${s.unverified?.length ? `<details><summary>${t('⚠️ Remplaçants non vérifiables : données manquantes ({0})', s.unverified.length)}</summary><p class="small muted">${t('Rien d\'incompatible trouvé, mais une valeur manque dans la base pour ces pièces : contrôler avant d\'acheter.')}</p>${altList(s.slot, s.unverified)}</details>` : ''}
      </article>`;
    }).join('');
    const done = new Set(proj.done ?? []);
    const shop = r.shopping.map((it) => ({ key: it.part.id, html: `${esc(partTitle(it.part))} (${nm(it.part.name ?? '')})` }))
      .concat(r.extras.map((e) => ({ key: `x:${e}`, html: x(e) })));
    const shopHtml = `<section class="summary"><h2>${t('Liste de courses')}</h2>
      <ul class="checklist" id="shop">${shop.map((it) => `<li><label><input type="checkbox" data-done="${esc(it.key)}"${done.has(it.key) ? ' checked' : ''}> ${it.html}</label></li>`).join('')}</ul>
      ${r.works.length ? `<div class="block"><h4>${t('Travaux et réglages')}</h4><ul>${r.works.map((w) => `<li>${x(w)}</li>`).join('')}</ul></div>` : ''}
      ${r.tools.length ? `<div class="block"><h4>${t('Outils')}</h4><ul>${r.tools.map((w) => `<li>${x(w)}</li>`).join('')}</ul></div>` : ''}
      ${r.chain?.links ? `<div class="block"><h4>${t('Chaîne')}</h4><p class="small">${x(r.chain.text)}</p></div>` : ''}
      </section>`;
    const altTarget = r.alternativesToTarget.length
      ? `<section class="summary"><h2>${t('Moins de changements avec…')}</h2><p class="small muted">${t('Pièces du même type compatibles avec votre configuration actuelle :')}</p>
        <ul class="list">${r.alternativesToTarget.map((p) => `<li><button class="row" type="button" data-target="${esc(p.id)}"><span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">${t('Prendre')}</span></button></li>`).join('')}</ul></section>`
      : '';
    const pre = r.preexisting.length
      ? `<p class="note">${t('Votre configuration actuelle contient déjà {0} incompatibilité(s) (erreur de saisie ?) : {1}', r.preexisting.length, r.preexisting.map((it) => `${it.labels.map(x).join(' + ')} : ${x(it.message)}`).join(' ; '))}</p>`
      : '';
    return `${pre}${head}${extHtml}${shopHtml}${altTarget}<h2>${t('Détail par pièce')}</h2><div class="cards stagger">${cards}</div>
      <p class="legend">${t('✅ rien à faire · ❌ à changer · ➕ à ajouter · ➖ à retirer · ⚠️ à vérifier · 💡 recommandé. Les données « à valider » n\'ont pas de confirmation constructeur.')}</p>`;
  }

  function editor(id) {
    const proj = get(id);
    if (!proj) {
      view.innerHTML = `<p class="note">${t('Projet introuvable sur ce téléphone.')}</p><div class="btn-row"><a class="btn ghost" href="#/projet">‹ ${t('Projets')}</a></div>`;
      return;
    }
    const target = part(proj.target);
    view.innerHTML = `
      <div class="btn-row two"><a class="btn ghost" href="#/projet">‹ ${t('Projets')}</a><button class="btn danger" type="button" id="del">${t('Supprimer')}</button></div>
      <p id="del-confirm" class="note" hidden>${t('Supprimer ce projet ?')} <button class="btn danger" type="button" id="del-yes">${t('Oui, supprimer')}</button></p>
      <label class="field" for="pname"><span>${t('Nom du projet')}</span><input id="pname" value="${esc(proj.name)}"></label>
      <section class="summary"><h2>${t('Type de vélo')}</h2>
        ${typeChips(proj)}
        <p class="small muted">${proj.discipline ? t('Groupes, recherches et remplaçants de cette discipline passent en premier.') : t('Choisissez le type de vélo : les groupes et les pièces seront triés en conséquence.')}</p>
      </section>
      <section class="summary"><h2>${t('1. Ma configuration actuelle')}</h2>
        <div class="btn-row"><button class="btn ghost" type="button" id="from-bike">${t('Reprendre « Mon vélo »')}</button></div>
        <label class="field" for="group"><span>${t('Ou charger un groupe')}</span><select id="group"><option value="">${t('Choisir un groupe…')}</option>${groupOptions(proj)}</select></label>
        <ul class="list" id="slots">${SLOTS.map((s) => slotRow(proj, s)).join('')}</ul>
        <details><summary>${t('Cadre et roue arrière (facultatif)')}</summary><div class="form">${frameForm(proj)}</div></details>
      </section>
      <section class="summary"><h2>${t('2. La pièce que je veux monter')}</h2>
        <p class="ref">${target ? esc(partTitle(target)) : `<span class="muted">${t('Pas encore choisie')}</span>`}</p>
        ${target ? `<p class="small muted">${esc(partSub(target))}</p>` : ''}
        <div id="tsb"></div>
      </section>
      <section><h2>${t('3. Résultat')}</h2><div id="res">${resultHtml(proj)}</div></section>
      <div class="btn-row"><button class="btn ghost" type="button" id="copy">${t('Copier le projet')}</button></div>
      <p class="note" id="copy-msg" hidden></p>`;

    const refresh = () => editor(id);
    view.querySelector('#pname').addEventListener('change', (e) => { proj.name = e.target.value || proj.name; put(proj); });
    view.querySelector('.bike-type').addEventListener('click', (e) => {
      const b = e.target.closest('[data-disc]');
      if (!b) return;
      proj.discipline = proj.discipline === b.dataset.disc ? null : b.dataset.disc;
      put(proj); refresh();
    });
    view.querySelector('#del').addEventListener('click', () => { view.querySelector('#del-confirm').hidden = false; });
    view.querySelector('#del-yes').addEventListener('click', () => { save(load().filter((p) => p.id !== id)); location.hash = '#/projet'; });
    view.querySelector('#from-bike').addEventListener('click', () => {
      for (const pid of state.bike) {
        const p = part(pid);
        const s = p && slotOf(p);
        if (s) proj.config.slots[s] = pid;
      }
      put(proj); refresh();
    });
    view.querySelector('#group').addEventListener('change', (e) => {
      const g = e.target.value;
      if (!g) return;
      Object.assign(proj.config.slots, groupConfig(g, state.parts, state.kb));
      put(proj); refresh();
    });
    view.querySelector('#slots').addEventListener('click', (e) => {
      const b = e.target.closest('[data-slot]');
      if (!b) return;
      const s = SLOTS.find((x) => x.id === b.dataset.slot);
      const box = view.querySelector(`[data-edit="${s.id}"]`);
      if (box.innerHTML) { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="btn-row"><button class="btn ghost" type="button" data-none="1">${t('Aucun / retiré')}</button><button class="btn ghost" type="button" data-clear="1">${t('Je ne sais pas')}</button></div><div class="sb"></div>`;
      box.querySelector('[data-none]').addEventListener('click', () => { proj.config.slots[s.id] = REMOVE; put(proj); refresh(); });
      box.querySelector('[data-clear]').addEventListener('click', () => { delete proj.config.slots[s.id]; put(proj); refresh(); });
      searchBox(box.querySelector('.sb'), {
        placeholder: t('{0} : référence ou critères', tr(s.label)),
        hint: t('Choisissez la pièce montée actuellement.'),
        filter: (p) => s.types.includes(p.type) && (!s.accepts || s.accepts(p)),
        rank: rankFor(proj),
        onPick: (p) => { proj.config.slots[s.id] = p.id; put(proj); refresh(); },
      }).focus();
    });
    view.querySelector('.form').addEventListener('change', (e) => {
      const el = e.target.closest('[data-key]');
      if (!el) return;
      const obj = (proj.config[el.dataset.obj] ??= {});
      if (el.value === '') delete obj[el.dataset.key];
      else obj[el.dataset.key] = el.type === 'number' ? Number(el.value) : el.value;
      put(proj); refresh();
    });
    searchBox(view.querySelector('#tsb'), {
      placeholder: t('Pièce cible : référence ou critères'),
      hint: t('Ex. « cassette 11-34 », « rx812 », « pédalier 1x », « étrier flat mount ».'),
      action: t('Monter'),
      rank: rankFor(proj),
      onPick: (p) => { proj.target = p.id; proj.prefer = {}; put(proj); refresh(); },
    });
    const res = view.querySelector('#res');
    res.addEventListener('click', (e) => {
      const pref = e.target.closest('[data-prefer]');
      if (pref) { proj.prefer = { ...(proj.prefer ?? {}), [pref.dataset.prefer]: pref.dataset.id }; put(proj); refresh(); return; }
      const t = e.target.closest('[data-target]');
      if (t) { proj.target = t.dataset.target; proj.prefer = {}; put(proj); refresh(); }
    });
    res.addEventListener('change', (e) => {
      const c = e.target.closest('[data-done]');
      if (!c) return;
      const done = new Set(proj.done ?? []);
      if (c.checked) done.add(c.dataset.done); else done.delete(c.dataset.done);
      proj.done = [...done];
      put(proj);
    });
    view.querySelector('#copy').addEventListener('click', async () => {
      const msg = view.querySelector('#copy-msg');
      const text = JSON.stringify(proj);
      msg.hidden = false;
      try {
        await navigator.clipboard.writeText(text);
        msg.textContent = t('Projet copié : collez-le dans « Importer » sur un autre appareil.');
        toast(t('Projet copié'));
      } catch {
        msg.innerHTML = `${t('Copie automatique refusée : sélectionnez le texte ci-dessous.')}<textarea rows="4" readonly>${esc(text)}</textarea>`;
        msg.querySelector('textarea').select();
      }
    });
  }

  return (id) => (id ? editor(id) : list());
}
