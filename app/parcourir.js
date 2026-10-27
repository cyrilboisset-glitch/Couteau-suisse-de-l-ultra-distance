// Recherche par arborescence : Marque → Gamme → Génération (année) → Type → Pièce.
import { browse, speedsAvailable, GENERIC } from './src/browse.js';
import { t, trName } from './src/i18n/index.js';

const enc = (s) => encodeURIComponent(s === '' ? '~' : s);
const dec = (s) => (s === '~' ? '' : decodeURIComponent(s));

export function createParcourirView(ctx) {
  const { state, view, esc, nm, typeLabel, partTitle, segHtml, stagger } = ctx;
  let speeds = null; // filtre « nombre de vitesses », gardé le temps de la session

  const show = (segments = []) => {
    const [brand, gamme, generation, type] = segments.map(dec);
    const path = {};
    if (brand !== undefined) path.brand = brand;
    if (gamme !== undefined) path.gamme = gamme;
    if (generation !== undefined) path.generation = generation;
    if (type !== undefined) path.type = type;
    const res = browse(state.parts, state.kb, path, { speeds: path.generation === undefined ? speeds : null });

    const base = ['#/parcourir'];
    const crumbs = [`<a href="#/parcourir">${t('Marques')}</a>`];
    const parts = [brand, gamme, generation, type];
    const labels = [brand, gamme && trName(gamme), generation ? trName(generation) : t('Sans génération'), type && typeLabel(type)];
    for (let i = 0; i < parts.length && parts[i] !== undefined; i++) {
      base.push(enc(parts[i]));
      crumbs.push(i === parts.filter((x) => x !== undefined).length - 1
        ? `<span aria-current="page">${esc(labels[i])}</span>`
        : `<a href="${base.join('/')}">${esc(labels[i])}</a>`);
    }
    const here = base.join('/');

    // Filtre par nombre de vitesses (marques, gammes, générations).
    let filter = '';
    if (path.generation === undefined) {
      const avail = speedsAvailable(state.parts, state.kb, path);
      if (avail.length > 1) {
        filter = `<div class="chips speed-filter" role="group" aria-label="${t('Filtrer par nombre de vitesses')}">
          <button type="button" class="chip-btn" data-speeds="" aria-pressed="${speeds === null}">${t('Toutes')}</button>
          ${avail.map((n) => `<button type="button" class="chip-btn" data-speeds="${n}" aria-pressed="${speeds === n}">${esc(trName(`${n}v`))}</button>`).join('')}</div>`;
      }
    }

    const row = (href, title, sub, act = `${t('Ouvrir')} ›`) => `<li><a class="row" href="${href}">
      <span class="main"><span class="ref">${title}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</span><span class="act">${act}</span></a></li>`;
    const n = (c) => (c > 1 ? t('{0} pièces', c) : t('{0} pièce', c));
    let body;
    switch (res.level) {
      case 'brands':
        body = res.items.map((it) => row(`${here}/${enc(it.key)}`, esc(it.label), n(it.count))).join('');
        break;
      case 'gammes':
        body = res.items.map((it) => row(`${here}/${enc(it.key)}`, nm(it.label),
          [it.years, it.speeds && trName(it.speeds), it.key === GENERIC ? t('chaînes, boîtiers, freins, plaquettes…') : (it.generations > 1 ? t('{0} générations', it.generations) : t('{0} génération', it.generations)), n(it.count)].filter(Boolean).map(esc).join(' · '))).join('');
        break;
      case 'generations':
        body = res.items.map((it) => row(`${here}/${enc(it.key)}`, it.key ? nm(it.label) : esc(t('Sans génération')),
          [it.year ? t('lancée en {0}', it.year) : t('année non renseignée'), it.speeds && trName(it.speeds), n(it.count)].filter(Boolean).map(esc).join(' · '))).join('');
        break;
      case 'types':
        body = res.items.map((it) => row(`${here}/${enc(it.key)}`, esc(typeLabel(it.key)), n(it.count))).join('');
        break;
      default:
        body = res.items.map((p) => row(`#/piece/${encodeURIComponent(p.id)}`, esc(partTitle(p)), nm(p.name ?? ''), `${t('Remplaçants')} ›`)).join('');
    }
    const titles = { brands: t('Choisir la marque'), gammes: t('Choisir la gamme'), generations: t('Choisir la génération'), types: t('Choisir le type de pièce'), parts: t('Choisir la pièce') };
    const yearNote = res.level === 'generations' && res.items.some((it) => !it.year)
      ? `<p class="muted small">${t('L\'année n\'est indiquée que lorsqu\'une source la donne.')}</p>` : '';

    view.innerHTML = `
      ${segHtml('tree')}
      <nav class="crumbs" aria-label="Chemin">${crumbs.join(' <span aria-hidden="true">›</span> ')}</nav>
      <h2>${titles[res.level]}</h2>
      ${filter}
      ${yearNote}
      <ul class="list">${body || `<li class="empty">${t('Rien ici avec ce filtre.')}</li>`}</ul>`;
    stagger(view.querySelector('.list'));

    view.querySelector('.speed-filter')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-speeds]');
      if (!b) return;
      speeds = b.dataset.speeds ? Number(b.dataset.speeds) : null;
      show(segments);
    });
  };
  return show;
}
