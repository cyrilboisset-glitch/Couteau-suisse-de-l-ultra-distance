// Interface : pièce cassée → remplacements classés ; « sous la main » ; « mon vélo ».
import { createKnowledge, findReplacements, checkAvailable, LEVEL, LEVEL_INFO, PART_TYPES } from './src/index.js';
import { searchParts } from './src/search.js';
import { tr, t, trName, setLang, getLang, detectLang, LANGS } from './src/i18n/index.js';
import { createProjetView } from './projet.js';
import { createParcourirView } from './parcourir.js';

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
// Si le navigateur bloque le stockage (fichier ouvert depuis les téléchargements,
// navigation privée…), les données restent en mémoire le temps de la session.
const memory = new Map();
const store = {
  persistent: (() => {
    try { localStorage.setItem('__test__', '1'); localStorage.removeItem('__test__'); return true; } catch { return false; }
  })(),
  get(key, fallback) {
    if (memory.has(key)) return memory.get(key);
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    memory.set(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { store.persistent = false; }
  },
};

// --- Thème -----------------------------------------------------------------
const themeBtn = document.getElementById('theme');
function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
themeBtn.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  store.set('theme', next);
  themeBtn.classList.remove('turn');
  void themeBtn.offsetWidth;
  themeBtn.classList.add('turn');
});
applyTheme(store.get('theme', null));

// --- Outils d'affichage ----------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Texte venant du moteur ou de la base : traduit puis échappé. */
const x = (s) => esc(tr(s));
/** Nom de pièce ou de génération : traduit (glossaire technique) puis échappé. */
const nm = (s) => esc(trName(s));
const typeLabel = (type) => tr(PART_TYPES[type]?.label ?? type);
const DISCIPLINE = { route: 'Route', gravel: 'Gravel', vtt: 'VTT', autre: 'Polyvalent' };
const VALUE_LABELS = {
  mecanique: 'mécanique', electronique: 'électronique', hydraulique: 'hydraulique', mineral: 'minéral', dot: 'DOT',
  standard: 'patte classique', udh_direct: 'montage direct UDH', direct_mount: 'direct mount', rivete: 'plateaux rivetés', les_deux: 'droite + gauche',
  arriere: 'arrière', avant: 'avant', disque: 'disque', jante: 'jante', cassette: 'cassette', roue_libre: 'roue libre à visser',
  hg_8_9_10: 'HG standard (8/9/10v, VTT 11v)', hg_11_route: 'HG route 11v', hg_12_route: 'Shimano route 12v', hg_l2: 'HG L2',
  microspline: 'Micro Spline', xd: 'XD', xdr: 'XDR', n3w: 'Campagnolo N3W', campagnolo: 'Campagnolo',
  shimano_24: '24 mm (Hollowtech II)', sram_dub: 'SRAM DUB', sram_gxp: 'SRAM GXP', bsa: 'BSA (fileté anglais)', ita: 'ITA', pf30: 'PF30',
  t47_externe: 'T47 (cuvettes externes)', t47_interne: 'T47 (interne)', flat_mount: 'flat mount', post_mount: 'post mount', is: 'IS',
  court: 'court (route)', long: 'long (V-brake)', resine: 'résine', metal: 'métallique',
  iso_anglais: 'anglais / ISO (1,37" × 24)', italien: 'italien (35 × 24)', francais: 'français', suisse: 'suisse',
  clavette: 'axe à clavettes', sans_filetage: 'sans filetage (serrage)', uniglide: 'Uniglide (Shimano ancien)', hg_7: 'HG 7v', carre_jis: 'carré JIS', carre_iso: 'carré ISO',
};
const fmt = (v) => (typeof v === 'boolean' ? t(v ? 'oui' : 'non') : tr(VALUE_LABELS[v] ?? v));
const levelClass = (l) => `l${l}`;
const SHORT = { 1: 'officiel', 2: 'connu', 3: 'dépannage', 4: 'incompatible' };
const partTitle = (p) => `${p.brand} ${p.ref}`;
const partSub = (p) => [typeLabel(p.type), DISCIPLINE[p.discipline] && t(DISCIPLINE[p.discipline]), trName(p.generation)].filter(Boolean).join(' · ');

function sourcesHtml(sources) {
  if (!sources?.length) return `<p class="muted small">${t('Aucune source.')}</p>`;
  return `<ul>${sources.map((s) => `<li class="small">${esc(s.ref ?? s.kind)} <span class="muted">(${x(s.kind)})</span>${s.url ? ` – <a href="${esc(s.url)}" target="_blank" rel="noopener">${t('lien')}</a>` : ''}</li>`).join('')}</ul>`;
}

const bikeParts = () => state.bike.map((id) => state.byId.get(id)).filter(Boolean);

// --- Animations ---------------------------------------------------------------
/** Fait entrer les blocs d'une vue en léger décalé. */
function animateIn(el = view) {
  el.classList.remove('enter');
  [...el.children].forEach((c, i) => c.style.setProperty('--i', i));
  void el.offsetWidth;
  el.classList.add('enter');
}
/** Décale l'apparition des éléments d'une liste. */
function stagger(list) {
  if (!list) return;
  list.classList.add('stagger');
  [...list.children].forEach((c, i) => c.style.setProperty('--i', i));
}
// Onde au toucher sur les boutons.
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn');
  if (!b || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = b.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.style.left = `${e.clientX - r.left}px`;
  dot.style.top = `${e.clientY - r.top}px`;
  b.append(dot);
  setTimeout(() => dot.remove(), 650);
});
function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}
// Pastille de l'onglet actif, qui glisse d'un onglet à l'autre.
const ink = document.querySelector('.tab-ink');
function moveInk() {
  const active = document.querySelector('.tab[aria-current="page"]');
  if (!active || !ink) return;
  ink.style.width = `${active.offsetWidth}px`;
  ink.style.transform = `translateX(${active.offsetLeft}px)`;
}
addEventListener('resize', moveInk);

// --- Langue -----------------------------------------------------------------
const langBtn = document.getElementById('lang');
const langMenu = document.getElementById('lang-menu');
function applyStaticText() {
  const code = getLang();
  document.documentElement.lang = code;
  document.title = t('Trousse du baroudeur');
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-t-label]')) el.setAttribute('aria-label', t(el.dataset.tLabel));
  const cur = LANGS.find((l) => l.code === code);
  langBtn.textContent = cur.flag;
  langBtn.setAttribute('aria-label', `${t('Langue')} : ${cur.label}`);
  langMenu.innerHTML = LANGS.map((l) => `<li><button type="button" role="menuitemradio" data-lang="${l.code}" aria-checked="${l.code === code}">
    <span aria-hidden="true">${l.flag}</span> ${esc(l.label)}</button></li>`).join('');
  requestAnimationFrame(moveInk);
}
function openLangMenu(open) {
  langMenu.hidden = !open;
  langBtn.setAttribute('aria-expanded', String(open));
  if (open) langMenu.querySelector('[aria-checked="true"]')?.focus();
}
langBtn.addEventListener('click', () => openLangMenu(langMenu.hidden));
langMenu.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  setLang(b.dataset.lang);
  store.set('lang', getLang());
  openLangMenu(false);
  applyStaticText();
  if (state.parts.length) route();
  toast(LANGS.find((l) => l.code === getLang()).label);
});
document.addEventListener('click', (e) => {
  if (!langMenu.hidden && !e.target.closest('.lang')) openLangMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !langMenu.hidden) { openLangMenu(false); langBtn.focus(); }
});
setLang(store.get('lang', null) ?? detectLang(navigator.languages ?? [navigator.language]));
applyStaticText();

// --- Liste de recherche réutilisable --------------------------------------
/**
 * Champ de recherche + suggestions. onPick(part) est appelé au choix.
 * `filter` restreint les pièces proposées, `action` est le libellé du bouton.
 */
function searchBox(container, { placeholder, hint, filter = () => true, action = t('Choisir'), onPick, initial = '', rank = null }) {
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
    const found = searchParts(q, pool, { limit: rank ? 60 : 25 });
    const { criteria, relaxed } = found;
    // Tri facultatif (ex. discipline du vélo en premier), le score de recherche départage.
    const results = rank ? [...found.results].sort((a, b) => rank(a.part) - rank(b.part)).slice(0, 25) : found.results;
    const chips = Object.entries(criteria).map(([k, v], i) => `<span class="chip" style="--i:${i}">${x(k)} : ${esc(fmt(typeof v === 'string' && PART_TYPES[v] ? typeLabel(v) : v))}</span>`);
    crit.innerHTML = (chips.length ? `<div class="chips">${chips.join('')}</div>` : '')
      + (relaxed.length ? `<p class="note">${t('Aucun résultat avec tous les critères : {0} ignoré(s) pour vous proposer quelque chose.', esc(relaxed.map(tr).join(', ')))}</p>` : '');
    list.innerHTML = results.length
      ? results.map(({ part }) => `<li><button class="row" type="button" data-id="${esc(part.id)}">
          <span class="main"><span class="ref">${esc(partTitle(part))}</span><span class="sub">${nm(part.name ?? '')} · ${esc(partSub(part))}</span></span>
          <span class="act">${esc(action)} ›</span></button></li>`).join('')
      : `<li class="empty">${t('Aucune pièce trouvée. Essayez une partie de la référence (ex. « 8000 ») ou des critères.')}</li>`;
    stagger(list);
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
  return items?.length ? `<div class="block"><h4>${title}</h4><ul>${items.map((it) => `<li>${x(it)}</li>`).join('')}</ul></div>` : '';
}

function resultCard({ part, result: r }, i = 0) {
  const info = LEVEL_INFO[r.level];
  const incompatible = r.level === LEVEL.INCOMPATIBLE;
  const tags = [DISCIPLINE[part.discipline] && t(DISCIPLINE[part.discipline]), trName(part.generation)].filter(Boolean).map((tag) => `<span class="chip">${esc(tag)}</span>`);
  if (r.toValidate) tags.push(`<span class="chip warn">${t('à valider')}</span>`);
  if (r.absolute) tags.push(`<span class="chip warn">${t('exclusion absolue')}</span>`);
  const reasons = incompatible || r.level === LEVEL.DEGRADED ? r.reasons : [];
  const findings = r.findings.map((f) => `<p class="finding">${LEVEL_INFO[f.level].emoji} ${x(f.message)}${f.source?.url ? ` <a href="${esc(f.source.url)}" target="_blank" rel="noopener">${t('source')}</a>` : f.source?.ref ? ` <span class="muted">(${x(f.source.ref)})</span>` : ''}</p>`).join('');
  return `<article class="card ${levelClass(r.level)}" style="--i:${i}">
    <span class="badge ${levelClass(r.level)}">${info.emoji} ${x(info.label)}</span>
    <h3>${esc(partTitle(part))}</h3>
    <p class="muted small">${nm(part.name ?? '')}</p>
    <div class="chips">${tags.join('')}</div>
    ${block(incompatible ? t('Pourquoi') : t('Point bloquant'), reasons)}
    ${incompatible ? '' : block(t('❓ À vérifier sur votre vélo'), r.conditions)}
    ${incompatible ? '' : block(t('⚠ Limitations'), r.limitations)}
    ${incompatible ? '' : block(t('Ce qui change'), r.changes)}
    ${incompatible ? '' : block(t('Réglages'), r.adjustments)}
    ${incompatible ? '' : block(t('Outils'), r.tools)}
    ${incompatible ? '' : block(t('À prévoir en plus'), r.extraParts)}
    ${block(t('Données manquantes'), r.missing)}
    <details><summary>${t('Détail des vérifications et sources')}</summary>
      ${findings}
      ${r.notes.map((n) => `<p class="finding muted">${x(n)}</p>`).join('')}
      <div class="block"><h4>${t('Sources de la pièce')}</h4>${sourcesHtml(part.sources)}</div>
    </details>
  </article>`;
}

function resultsSection(results, container, levels = state.showLevels) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of results) counts[r.result.level]++;
  const draw = () => {
    const visible = results.filter((r) => levels[r.result.level]);
    container.innerHTML = `
      <div class="levels" role="group" aria-label="${t('Filtrer par niveau')}">
        ${[1, 2, 3, 4].map((l, i) => `<button class="lvl ${levelClass(l)}" style="--i:${i}" type="button" data-level="${l}" aria-pressed="${levels[l]}">
          ${LEVEL_INFO[l].emoji} <span class="num" data-count="${counts[l]}">${counts[l]}</span><small>${t(SHORT[l])}</small></button>`).join('')}
      </div>
      <div class="cards">${visible.length ? visible.map((r, i) => resultCard(r, i)).join('') : `<p class="empty">${t('Aucun résultat à ce niveau. Touchez un niveau pour l\'afficher.')}</p>`}</div>
      <p class="legend">${t('✅ officiel constructeur · 🟢 compatible connu · 🟠 dépannage (limitation indiquée) · ❌ incompatible.')}
        ${t('« À valider » : donnée ou règle sans confirmation constructeur.')}</p>`;
    stagger(container.querySelector('.cards'));
  };
  container.addEventListener('click', (e) => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    const l = Number(b.dataset.level);
    levels[l] = !levels[l];
    draw();
  });
  draw();
  countUp(container);
}

/** Les compteurs de niveaux défilent jusqu'à leur valeur. */
function countUp(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const el of root.querySelectorAll('.num[data-count]')) {
    const end = Number(el.dataset.count);
    if (end < 2) continue;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 600);
      el.textContent = String(Math.round(end * (1 - (1 - k) ** 3)));
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

function partSummary(part, { actions = '' } = {}) {
  const attrs = Object.entries(part.attrs ?? {})
    .map(([k, v]) => `<dt>${x(PART_TYPES[part.type]?.attrs[k]?.label ?? k)}</dt><dd>${esc(fmt(v))}${PART_TYPES[part.type]?.attrs[k]?.unit ? ` ${esc(PART_TYPES[part.type].attrs[k].unit)}` : ''}</dd>`).join('');
  return `<section class="summary hero-part">
    <p class="muted small">${t('{0} cassé(e)', esc(typeLabel(part.type)))}</p>
    <h2>${esc(partTitle(part))}</h2>
    <p class="muted small">${nm(part.name ?? '')} · ${esc(partSub(part))}</p>
    ${part.status !== 'valide' ? `<span class="chip warn">${t('données à valider')}</span>` : ''}
    ${part.notes ? `<p class="note">${x(part.notes)}</p>` : ''}
    <details><summary>${t('Caractéristiques et sources')}</summary><dl>${attrs}</dl>${sourcesHtml(part.sources)}</details>
    ${actions}
  </section>`;
}

const bikeNote = (broken) => {
  const others = bikeParts().filter((p) => p.id !== broken.id);
  return others.length
    ? `<p class="note">${t('Calcul avec votre vélo : {0}.', others.map((p) => esc(partTitle(p))).join(', '))}</p>`
    : `<p class="note">${t('Reste du vélo inconnu : les points marqués ❓ sont à vérifier. Décrivez votre vélo dans « Mon vélo » pour des verdicts précis.')}</p>`;
};

const segHtml = (active) => `<div class="seg" role="tablist" aria-label="${t('Mode de recherche')}">
    <a class="seg-btn" href="#/"${active === 'ref' ? ' aria-current="page"' : ''}>🔎 ${t('Par référence')}</a>
    <a class="seg-btn" href="#/parcourir"${active === 'tree' ? ' aria-current="page"' : ''}>🗂️ ${t('Parcourir')}</a>
  </div>`;

// --- Vues -----------------------------------------------------------------
const VIEWS = {
  casse() {
    view.innerHTML = `${segHtml('ref')}<h2>${t('Quelle pièce est cassée ?')}</h2><div id="sb"></div>`;
    const input = searchBox(view.querySelector('#sb'), {
      placeholder: t('Référence : r8000 gs, rx812…'),
      hint: t('Ou par critères : « dérailleur arrière 11v route chape longue », « cassette 11-34 », « chaîne 12v ».'),
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
      actions: `<div class="btn-row two"><a class="btn ghost" href="#/">‹ ${t('Autre pièce')}</a>
        <button class="btn ghost" type="button" id="to-dispo">${t('J\'ai ça sous la main')}</button></div>`,
    })}${bikeNote(broken)}<h2>${t('Remplacements ({0} possibles)', results.filter((r) => r.result.level < LEVEL.INCOMPATIBLE).length)}</h2><div id="res"></div>`;
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
      view.innerHTML = `<h2>${t('J\'ai ça sous la main')}</h2><p class="muted">${t('1. D\'abord, la pièce cassée :')}</p><div id="sb"></div>`;
      searchBox(view.querySelector('#sb'), {
        placeholder: t('Pièce cassée : référence ou critères'),
        hint: t('Ensuite vous ajouterez les pièces disponibles (vélociste, autre vélo).'),
        onPick: (p) => { state.dispoBroken = p.id; store.set('dispoBroken', p.id); VIEWS.dispo(); animateIn(); },
      });
      return;
    }
    const available = state.dispo.map((id) => state.byId.get(id)).filter((p) => p && p.type === broken.type);
    view.innerHTML = `${partSummary(broken, { actions: `<div class="btn-row"><button class="btn ghost" type="button" id="change">${t('Changer de pièce cassée')}</button></div>` })}
      <h2>${t('2. Pièces disponibles ({0})', available.length)}</h2>
      <ul class="list" id="avail">${available.map((p) => `<li><button class="row" type="button" data-remove="${esc(p.id)}">
        <span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">${t('Retirer')} ✕</span></button></li>`).join('')}</ul>
      <div id="sb"></div>
      <div id="res"></div>`;
    stagger(view.querySelector('#avail'));
    view.querySelector('#change').addEventListener('click', () => { state.dispoBroken = null; store.set('dispoBroken', null); VIEWS.dispo(); animateIn(); });
    view.querySelector('#avail').addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (!b) return;
      state.dispo = state.dispo.filter((id) => id !== b.dataset.remove);
      store.set('dispo', state.dispo);
      VIEWS.dispo();
    });
    const tl = typeLabel(broken.type).toLowerCase();
    searchBox(view.querySelector('#sb'), {
      placeholder: t('Ajouter : {0} disponible', tl),
      hint: t('Seules les pièces du même type ({0}) sont proposées.', esc(tl)),
      filter: (p) => p.type === broken.type && p.id !== broken.id && !state.dispo.includes(p.id),
      action: t('Ajouter'),
      onPick: (p) => { state.dispo.push(p.id); store.set('dispo', state.dispo); VIEWS.dispo(); },
    });
    if (available.length) {
      const res = checkAvailable(broken, available, { kb: state.kb, bike: bikeParts() });
      const el = view.querySelector('#res');
      el.insertAdjacentHTML('beforebegin', `<h2>${t('Verdict')}</h2>${bikeNote(broken)}`);
      resultsSection(res, el, { 1: true, 2: true, 3: true, 4: true });
    }
  },

  velo() {
    const parts = bikeParts();
    view.innerHTML = `<h2>${t('Mon vélo')}</h2>
      <p class="muted small">${t('Pièces montées sur votre vélo (gardées sur ce téléphone). Elles transforment les « ❓ à vérifier » en verdicts.')}</p>
      <ul class="list" id="bike">${parts.map((p) => `<li><button class="row" type="button" data-remove="${esc(p.id)}">
        <span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">${t('Retirer')} ✕</span></button></li>`).join('') || `<li class="empty">${t('Aucune pièce pour l\'instant.')}</li>`}</ul>
      <h2>${t('Ajouter une pièce')}</h2><div id="sb"></div>`;
    stagger(view.querySelector('#bike'));
    view.querySelector('#bike').addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]');
      if (!b) return;
      state.bike = state.bike.filter((id) => id !== b.dataset.remove);
      store.set('bike', state.bike);
      VIEWS.velo();
      updateCount();
    });
    searchBox(view.querySelector('#sb'), {
      placeholder: t('Référence ou critères'),
      hint: t('Manette, cassette, pédalier, freins… : une pièce par type suffit.'),
      filter: (p) => !state.bike.includes(p.id),
      action: t('Ajouter'),
      onPick: (p) => {
        // Une seule pièce par emplacement (deux manettes si gauche / droite).
        state.bike = state.bike.filter((id) => {
          const o = state.byId.get(id);
          return !(o && o.type === p.type && (p.type !== 'shifter' || o.attrs?.side === p.attrs?.side));
        });
        state.bike.push(p.id);
        store.set('bike', state.bike);
        VIEWS.velo();
        updateCount();
        toast(t('{0} ajouté(e) à « Mon vélo »', partTitle(p)));
      },
    });
  },
};

const ctx = { state, view, esc, x, nm, fmt, searchBox, partTitle, partSub, typeLabel, store, segHtml, stagger, animateIn, toast };
let parcourirView = null;
VIEWS.parcourir = (segments) => {
  parcourirView ??= createParcourirView(ctx);
  parcourirView(segments);
};

let projetView = null;
VIEWS.projet = (id) => {
  projetView ??= createProjetView(ctx);
  projetView(id);
};

function updateCount() {
  document.getElementById('bike-count').textContent = state.bike.length ? String(state.bike.length) : '';
}

function route() {
  const [, name = '', arg, ...rest] = location.hash.split('/');
  const tab = name === 'piece' || name === '' || name === 'parcourir' ? 'casse' : name;
  for (const a of document.querySelectorAll('.tab')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  moveInk();
  if (name === 'piece') VIEWS.piece(decodeURIComponent(arg ?? ''));
  else if (name === 'projet') VIEWS.projet(arg ? decodeURIComponent(arg) : null);
  else if (name === 'parcourir') VIEWS.parcourir([arg, ...rest].filter((s) => s !== undefined && s !== ''));
  else (VIEWS[tab] ?? VIEWS.casse)();
  animateIn();
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
    view.innerHTML = `<p class="note">${t('Impossible de charger la base ({0}). En local : <code>npm start</code>.', esc(err.message))}</p>`;
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
