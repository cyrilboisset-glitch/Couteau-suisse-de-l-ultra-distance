// Interface : pièce cassée → remplacements classés ; « sous la main » ; « mon vélo ».
import { createKnowledge, findReplacements, checkAvailable, LEVEL, LEVEL_INFO, PART_TYPES } from './src/index.js';
import { searchParts } from './src/search.js';
import { createProjetView } from './projet.js';

const CATALOGUE_URL = './catalogue.json';
const view = document.getElementById('view');

const state = {
  parts: [],
  byId: new Map(),
  kb: null,
  bike: [],          // ids des pièces connues du vélo
  dispoBroken: null, // id de la pièce cassée en mode « sous la main »
  dispo: [],         // ids des pièces disponibles
  showLevels: { 1: true, 2: true, 3: true, 4: false },
};

// --- Stockage local (confort seulement : l'appli marche sans) ---------------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* navigation privée */ }
  },
};

// --- Thème -----------------------------------------------------------------
function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
document.getElementById('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  store.set('theme', next);
});
applyTheme(store.get('theme', null));

// --- Outils d'affichage ----------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const typeLabel = (t) => PART_TYPES[t]?.label ?? t;
const DISCIPLINE = { route: 'Route', gravel: 'Gravel', vtt: 'VTT', autre: 'Polyvalent' };
const VALUE_LABELS = {
  mecanique: 'mécanique', electronique: 'électronique', hydraulique: 'hydraulique', mineral: 'minéral', dot: 'DOT',
  standard: 'patte classique', udh_direct: 'montage direct UDH', direct_mount: 'direct mount', les_deux: 'droite + gauche',
  arriere: 'arrière', avant: 'avant', disque: 'disque', jante: 'jante', cassette: 'cassette', roue_libre: 'roue libre à visser',
  hg_8_9_10: 'HG standard (8/9/10v, VTT 11v)', hg_11_route: 'HG route 11v', hg_12_route: 'Shimano route 12v', hg_l2: 'HG L2',
  microspline: 'Micro Spline', xd: 'XD', xdr: 'XDR', n3w: 'Campagnolo N3W', campagnolo: 'Campagnolo',
  shimano_24: '24 mm (Hollowtech II)', sram_dub: 'SRAM DUB', sram_gxp: 'SRAM GXP', bsa: 'BSA (fileté anglais)', ita: 'ITA', pf30: 'PF30',
  t47_externe: 'T47 (cuvettes externes)', t47_interne: 'T47 (interne)', flat_mount: 'flat mount', post_mount: 'post mount', is: 'IS',
  court: 'court (route)', long: 'long (V-brake)', resine: 'résine', metal: 'métallique',
};
const fmt = (v) => (typeof v === 'boolean' ? (v ? 'oui' : 'non') : VALUE_LABELS[v] ?? v);
const levelClass = (l) => `l${l}`;
const SHORT = { 1: 'officiel', 2: 'connu', 3: 'dépannage', 4: 'incompatible' };
const partTitle = (p) => `${p.brand} ${p.ref}`;
const partSub = (p) => [typeLabel(p.type), DISCIPLINE[p.discipline], p.generation].filter(Boolean).join(' · ');

function sourcesHtml(sources) {
  if (!sources?.length) return '<p class="muted small">Aucune source.</p>';
  return `<ul>${sources.map((s) => `<li class="small">${esc(s.ref ?? s.kind)} <span class="muted">(${esc(s.kind)})</span>${s.url ? ` – <a href="${esc(s.url)}" target="_blank" rel="noopener">lien</a>` : ''}</li>`).join('')}</ul>`;
}

const bikeParts = () => state.bike.map((id) => state.byId.get(id)).filter(Boolean);

// --- Liste de recherche réutilisable --------------------------------------
/**
 * Champ de recherche + suggestions. onPick(part) est appelé au choix.
 * `filter` restreint les pièces proposées, `action` est le libellé du bouton.
 */
function searchBox(container, { placeholder, hint, filter = () => true, action = 'Choisir', onPick, initial = '' }) {
  container.innerHTML = `
    <div class="search"><input id="q-${container.id || 'main'}" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false"
      placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" value="${esc(initial)}"></div>
    <p class="hint">${hint}</p>
    <div class="crit"></div>
    <ul class="list" aria-live="polite"></ul>`;
  const input = container.querySelector('input');
  const list = container.querySelector('.list');
  const crit = container.querySelector('.crit');
  const pool = state.parts.filter(filter);
  const render = () => {
    const q = input.value.trim();
    if (q.length < 2) { list.innerHTML = ''; crit.innerHTML = ''; return; }
    const { results, criteria, relaxed } = searchParts(q, pool, { limit: 25 });
    const chips = Object.entries(criteria).map(([k, v]) => `<span class="chip">${esc(k)} : ${esc(fmt(typeof v === 'string' && PART_TYPES[v] ? typeLabel(v) : v))}</span>`);
    crit.innerHTML = (chips.length ? `<div class="chips">${chips.join('')}</div>` : '')
      + (relaxed.length ? `<p class="note">Aucun résultat avec tous les critères : ${esc(relaxed.join(', '))} ignoré(s) pour vous proposer quelque chose.</p>` : '');
    list.innerHTML = results.length
      ? results.map(({ part }) => `<li><button class="row" type="button" data-id="${esc(part.id)}">
          <span class="main"><span class="ref">${esc(partTitle(part))}</span><span class="sub">${esc(part.name ?? '')} · ${esc(partSub(part))}</span></span>
          <span class="act">${esc(action)} ›</span></button></li>`).join('')
      : '<li class="empty">Aucune pièce trouvée. Essayez une partie de la référence (ex. « 8000 ») ou des critères.</li>';
  };
  input.addEventListener('input', render);
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (btn) onPick(state.byId.get(btn.dataset.id));
  });
  render();
  return input;
}

// --- Rendu d'un résultat --------------------------------------------------
function block(title, items) {
  return items?.length ? `<div class="block"><h4>${title}</h4><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
}

function resultCard({ part, result: r }) {
  const info = LEVEL_INFO[r.level];
  const incompatible = r.level === LEVEL.INCOMPATIBLE;
  const tags = [DISCIPLINE[part.discipline], part.generation].filter(Boolean).map((t) => `<span class="chip">${esc(t)}</span>`);
  if (r.toValidate) tags.push('<span class="chip warn">à valider</span>');
  if (r.absolute) tags.push('<span class="chip warn">exclusion absolue</span>');
  const reasons = incompatible || r.level === LEVEL.DEGRADED ? r.reasons : [];
  const findings = r.findings.map((f) => `<p class="finding">${LEVEL_INFO[f.level].emoji} ${esc(f.message)}${f.source?.url ? ` <a href="${esc(f.source.url)}" target="_blank" rel="noopener">source</a>` : f.source?.ref ? ` <span class="muted">(${esc(f.source.ref)})</span>` : ''}</p>`).join('');
  return `<article class="card ${levelClass(r.level)}">
    <span class="badge ${levelClass(r.level)}">${info.emoji} ${esc(info.label)}</span>
    <h3>${esc(partTitle(part))}</h3>
    <p class="muted small">${esc(part.name ?? '')}</p>
    <div class="chips">${tags.join('')}</div>
    ${block(incompatible ? 'Pourquoi' : 'Point bloquant', reasons)}
    ${incompatible ? '' : block('❓ À vérifier sur votre vélo', r.conditions)}
    ${incompatible ? '' : block('⚠ Limitations', r.limitations)}
    ${incompatible ? '' : block('Ce qui change', r.changes)}
    ${incompatible ? '' : block('Réglages', r.adjustments)}
    ${incompatible ? '' : block('Outils', r.tools)}
    ${incompatible ? '' : block('À prévoir en plus', r.extraParts)}
    ${block('Données manquantes', r.missing)}
    <details><summary>Détail des vérifications et sources</summary>
      ${findings}
      ${r.notes.map((n) => `<p class="finding muted">${esc(n)}</p>`).join('')}
      <div class="block"><h4>Sources de la pièce</h4>${sourcesHtml(part.sources)}</div>
    </details>
  </article>`;
}

function resultsSection(results, container, levels = state.showLevels) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of results) counts[r.result.level]++;
  const draw = () => {
    const visible = results.filter((r) => levels[r.result.level]);
    container.innerHTML = `
      <div class="levels" role="group" aria-label="Filtrer par niveau">
        ${[1, 2, 3, 4].map((l) => `<button class="lvl ${levelClass(l)}" type="button" data-level="${l}" aria-pressed="${levels[l]}">
          ${LEVEL_INFO[l].emoji} ${counts[l]}<small>${SHORT[l]}</small></button>`).join('')}
      </div>
      ${visible.length ? visible.map(resultCard).join('') : '<p class="empty">Aucun résultat à ce niveau. Touchez un niveau pour l\'afficher.</p>'}
      <p class="legend">✅ officiel constructeur · 🟢 compatible connu · 🟠 dépannage (limitation indiquée) · ❌ incompatible.
        « À valider » : donnée ou règle sans confirmation constructeur.</p>`;
  };
  container.addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    const l = Number(b.dataset.level);
    levels[l] = !levels[l];
    draw();
  });
  draw();
}

function partSummary(part, { actions = '' } = {}) {
  const attrs = Object.entries(part.attrs ?? {})
    .map(([k, v]) => `<dt>${esc(PART_TYPES[part.type]?.attrs[k]?.label ?? k)}</dt><dd>${esc(fmt(v))}${PART_TYPES[part.type]?.attrs[k]?.unit ? ` ${esc(PART_TYPES[part.type].attrs[k].unit)}` : ''}</dd>`).join('');
  return `<section class="summary">
    <p class="muted small">${esc(typeLabel(part.type))} cassé(e)</p>
    <h2>${esc(partTitle(part))}</h2>
    <p class="muted small">${esc(part.name ?? '')} · ${esc(partSub(part))}</p>
    ${part.status !== 'valide' ? '<span class="chip warn">données à valider</span>' : ''}
    ${part.notes ? `<p class="note">${esc(part.notes)}</p>` : ''}
    <details><summary>Caractéristiques et sources</summary><dl>${attrs}</dl>${sourcesHtml(part.sources)}</details>
    ${actions}
  </section>`;
}

const bikeNote = (broken) => {
  const others = bikeParts().filter((p) => p.id !== broken.id);
  return others.length
    ? `<p class="note">Calcul avec votre vélo : ${others.map((p) => esc(partTitle(p))).join(', ')}.</p>`
    : '<p class="note">Reste du vélo inconnu : les points marqués ❓ sont à vérifier. Décrivez votre vélo dans « Mon vélo » pour des verdicts précis.</p>';
};

// --- Vues -----------------------------------------------------------------
const VIEWS = {
  casse() {
    view.innerHTML = '<h2>Quelle pièce est cassée ?</h2><div id="sb"></div>';
    const input = searchBox(view.querySelector('#sb'), {
      placeholder: 'Référence : r8000 gs, rx812…',
      hint: 'Ou par critères : « dérailleur arrière 11v route chape longue », « cassette 11-34 », « chaîne 12v ».',
      onPick: (p) => { location.hash = `#/piece/${encodeURIComponent(p.id)}`; },
      initial: store.get('lastQuery', ''),
    });
    input.addEventListener('input', () => store.set('lastQuery', input.value));
    input.focus();
  },

  piece(id) {
    const broken = state.byId.get(id);
    if (!broken) { location.hash = '#/'; return; }
    const results = findReplacements(broken, state.parts, { kb: state.kb, bike: bikeParts(), includeIncompatible: true });
    view.innerHTML = `${partSummary(broken, {
      actions: `<div class="btn-row two"><a class="btn ghost" href="#/">‹ Autre pièce</a>
        <button class="btn ghost" type="button" id="to-dispo">J'ai ça sous la main</button></div>`,
    })}${bikeNote(broken)}<h2>Remplacements (${results.filter((r) => r.result.level < LEVEL.INCOMPATIBLE).length} possibles)</h2><div id="res"></div>`;
    view.querySelector('#to-dispo').addEventListener('click', () => {
      state.dispoBroken = broken.id;
      store.set('dispoBroken', broken.id);
      location.hash = '#/dispo';
    });
    resultsSection(results, view.querySelector('#res'));
  },

  dispo() {
    const broken = state.byId.get(state.dispoBroken);
    if (!broken) {
      view.innerHTML = '<h2>J\'ai ça sous la main</h2><p class="muted">1. D\'abord, la pièce cassée :</p><div id="sb"></div>';
      searchBox(view.querySelector('#sb'), {
        placeholder: 'Pièce cassée : référence ou critères',
        hint: 'Ensuite vous ajouterez les pièces disponibles (vélociste, autre vélo).',
        onPick: (p) => { state.dispoBroken = p.id; store.set('dispoBroken', p.id); VIEWS.dispo(); },
      });
      return;
    }
    const available = state.dispo.map((x) => state.byId.get(x)).filter((p) => p && p.type === broken.type);
    view.innerHTML = `${partSummary(broken, { actions: '<div class="btn-row"><button class="btn ghost" type="button" id="change">Changer de pièce cassée</button></div>' })}
      <h2>2. Pièces disponibles (${available.length})</h2>
      <ul class="list" id="avail">${available.map((p) => `<li><button class="row" type="button" data-remove="${esc(p.id)}">
        <span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">Retirer ✕</span></button></li>`).join('')}</ul>
      <div id="sb"></div>
      <div id="res"></div>`;
    view.querySelector('#change').addEventListener('click', () => { state.dispoBroken = null; store.set('dispoBroken', null); VIEWS.dispo(); });
    view.querySelector('#avail').addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (!b) return;
      state.dispo = state.dispo.filter((x) => x !== b.dataset.remove);
      store.set('dispo', state.dispo);
      VIEWS.dispo();
    });
    searchBox(view.querySelector('#sb'), {
      placeholder: `Ajouter : ${typeLabel(broken.type).toLowerCase()} disponible`,
      hint: `Seules les pièces du même type (${typeLabel(broken.type).toLowerCase()}) sont proposées.`,
      filter: (p) => p.type === broken.type && p.id !== broken.id && !state.dispo.includes(p.id),
      action: 'Ajouter',
      onPick: (p) => { state.dispo.push(p.id); store.set('dispo', state.dispo); VIEWS.dispo(); },
    });
    if (available.length) {
      const res = checkAvailable(broken, available, { kb: state.kb, bike: bikeParts() });
      const el = view.querySelector('#res');
      el.insertAdjacentHTML('beforebegin', `<h2>Verdict</h2>${bikeNote(broken)}`);
      resultsSection(res, el, { 1: true, 2: true, 3: true, 4: true });
    }
  },

  velo() {
    const parts = bikeParts();
    view.innerHTML = `<h2>Mon vélo</h2>
      <p class="muted small">Pièces montées sur votre vélo (gardées sur ce téléphone). Elles transforment les « ❓ à vérifier » en verdicts.</p>
      <ul class="list" id="bike">${parts.map((p) => `<li><button class="row" type="button" data-remove="${esc(p.id)}">
        <span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">Retirer ✕</span></button></li>`).join('') || '<li class="empty">Aucune pièce pour l\'instant.</li>'}</ul>
      <h2>Ajouter une pièce</h2><div id="sb"></div>`;
    view.querySelector('#bike').addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (!b) return;
      state.bike = state.bike.filter((x) => x !== b.dataset.remove);
      store.set('bike', state.bike);
      VIEWS.velo();
      updateCount();
    });
    searchBox(view.querySelector('#sb'), {
      placeholder: 'Référence ou critères',
      hint: 'Manette, cassette, pédalier, freins… : une pièce par type suffit.',
      filter: (p) => !state.bike.includes(p.id),
      action: 'Ajouter',
      onPick: (p) => {
        // Une seule pièce par emplacement (deux manettes si gauche / droite).
        state.bike = state.bike.filter((x) => {
          const o = state.byId.get(x);
          return !(o && o.type === p.type && (p.type !== 'shifter' || o.attrs?.side === p.attrs?.side));
        });
        state.bike.push(p.id);
        store.set('bike', state.bike);
        VIEWS.velo();
        updateCount();
      },
    });
  },
};

let projetView = null;
VIEWS.projet = (id) => {
  projetView ??= createProjetView({ state, view, esc, fmt, searchBox, partTitle, partSub, store });
  projetView(id);
};

function updateCount() {
  document.getElementById('bike-count').textContent = state.bike.length ? String(state.bike.length) : '';
}

function route() {
  const [, name = '', arg] = location.hash.split('/');
  const tab = name === 'piece' || name === '' ? 'casse' : name;
  for (const a of document.querySelectorAll('.tab')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (name === 'piece') VIEWS.piece(decodeURIComponent(arg ?? ''));
  else if (name === 'projet') VIEWS.projet(arg ? decodeURIComponent(arg) : null);
  else (VIEWS[tab] ?? VIEWS.casse)();
  window.scrollTo(0, 0);
}

async function init() {
  try {
    // Version fichier unique : catalogue intégré à la page. Sinon, fichier à côté.
    let data = window.__CATALOGUE__;
    if (!data) {
      const res = await fetch(CATALOGUE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    }
    const { parts, knowledge } = data;
    state.parts = parts;
    state.byId = new Map(parts.map((p) => [p.id, p]));
    state.kb = createKnowledge(knowledge);
  } catch (err) {
    view.innerHTML = `<p class="note">Impossible de charger la base (${esc(err.message)}). En local : <code>npm start</code>.</p>`;
    return;
  }
  state.bike = store.get('bike', []).filter((id) => state.byId.has(id));
  state.dispo = store.get('dispo', []).filter((id) => state.byId.has(id));
  state.dispoBroken = store.get('dispoBroken', null);
  updateCount();
  addEventListener('hashchange', route);
  route();
}

init();
