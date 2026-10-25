// Onglet « Projet » : je veux monter telle pièce, que dois-je changer ?
import { analyzeProject, SLOTS, REMOVE, slotOf, groupConfig } from './src/project.js';
import { ENUMS } from './src/schema.js';

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
  ['frame', 'chainstayLength', 'Longueur de base (mm, axe pédalier → axe roue)', null],
  ['wheel', 'freehub', 'Corps de roue libre (roue arrière)', 'freehub'],
  ['wheel', 'brakeInterface', 'Roues : freinage', 'wheelBrake'],
  ['wheel', 'rotorMount', 'Fixation des disques sur le moyeu', 'rotorMount'],
];

const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createProjetView(ctx) {
  const { state, view, esc, fmt, searchBox, partTitle, partSub, store } = ctx;
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
    view.innerHTML = `<h2>Projets</h2>
      <p class="muted small">Je veux monter une pièce sur mon vélo : qu'est-ce qui reste compatible, que faut-il changer, quoi acheter ? Les projets sont gardés sur ce téléphone.</p>
      <div class="btn-row"><button class="btn" type="button" id="new">+ Nouveau projet</button>
        <button class="btn ghost" type="button" id="import">Importer</button></div>
      <div id="import-box" hidden><textarea id="import-text" rows="5" placeholder="Collez ici un projet copié"></textarea>
        <div class="btn-row"><button class="btn" type="button" id="import-ok">Importer ce projet</button></div><p class="note" id="import-msg" hidden></p></div>
      <ul class="list">${projects.map((p) => `<li><a class="row" href="#/projet/${esc(p.id)}">
        <span class="main"><span class="ref">${esc(p.name)}</span><span class="sub">${p.target ? `Cible : ${esc(partTitle(part(p.target) ?? { brand: '', ref: p.target }))}` : 'Pièce cible à choisir'} · ${Object.values(p.config.slots).filter(Boolean).length} pièce(s)</span></span>
        <span class="act">Ouvrir ›</span></a></li>`).join('') || '<li class="empty">Aucun projet pour l\'instant.</li>'}</ul>`;
    view.querySelector('#new').addEventListener('click', () => {
      const n = load().length + 1;
      const proj = { id: uid(), name: `Projet ${n}`, config: { slots: {}, frame: {}, wheel: {} }, target: null, done: [] };
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
        if (!proj?.config?.slots) throw new Error('format inattendu');
        proj.id = uid();
        put(proj);
        location.hash = `#/projet/${proj.id}`;
      } catch (err) {
        msg.textContent = `Import impossible : ${err.message}. Collez le texte obtenu avec « Copier le projet ».`;
      }
    });
  }

  function slotRow(proj, s) {
    const id = proj.config.slots[s.id];
    const p = part(id);
    const value = id === REMOVE ? 'Aucun (retiré)' : p ? partTitle(p) : 'Non renseigné';
    return `<li><button class="row" type="button" data-slot="${s.id}">
      <span class="main"><span class="sub">${esc(s.label)}</span><span class="ref">${esc(value)}</span></span>
      <span class="act">Modifier ›</span></button><div class="slot-edit" data-edit="${s.id}"></div></li>`;
  }

  function frameForm(proj) {
    return FRAME_FIELDS.map(([obj, key, label, en]) => {
      const v = proj.config[obj]?.[key] ?? '';
      const fid = `f-${obj}-${key}`;
      const input = en
        ? `<select id="${fid}" data-obj="${obj}" data-key="${key}"><option value="">Je ne sais pas</option>${ENUMS[en].map((o) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(fmt(o))}</option>`).join('')}</select>`
        : `<input id="${fid}" type="number" inputmode="decimal" data-obj="${obj}" data-key="${key}" value="${esc(v)}" placeholder="Je ne sais pas">`;
      return `<label class="field" for="${fid}"><span>${esc(label)}</span>${input}</label>`;
    }).join('');
  }

  function resultHtml(proj) {
    if (!proj.target) return '<p class="empty">Choisissez la pièce cible pour voir le résultat.</p>';
    let r;
    try {
      r = analyzeProject(proj.config, proj.target, { kb: state.kb, catalog: state.parts, prefer: proj.prefer ?? {} });
    } catch (err) {
      return `<p class="note">Analyse impossible : ${esc(err.message)}</p>`;
    }
    const toDo = r.slots.filter((s) => ['changer', 'ajouter', 'retirer', 'introuvable'].includes(s.status));
    const ext = r.external;
    const head = r.solved
      ? `<p class="note ok-note">Configuration entièrement compatible après ${toDo.length} changement(s).</p>`
      : `<p class="note">Pas de configuration entièrement compatible avec la base actuelle : voir les points ❌ ci-dessous.</p>`;
    const extHtml = ext.map((e) => `<article class="card l4"><span class="badge l4">❌ ${e.what === 'wheel' ? 'Roue arrière' : e.what === 'frame' ? 'Cadre / fourche' : 'Pièce du projet'}</span>
      <p>${esc(e.message)}</p>${e.what === 'wheel' && proj.config.wheel?.freehubOptions ? `<p class="small muted">Corps proposés pour ce moyeu : ${esc(proj.config.wheel.freehubOptions)}</p>` : ''}
      <p class="small muted">Hors catalogue : à adapter ou remplacer${e.what === 'wheel' ? ' (corps de roue libre si le fabricant du moyeu en propose un, sinon roue)' : ''}.</p></article>`).join('');
    const cards = r.slots.filter((s) => s.status !== 'absent').map((s) => {
      const st = STATUS[s.status] ?? STATUS.ok;
      const alts = s.alternatives.filter((p) => p.id !== s.after?.id);
      return `<article class="card ${st.cls}">
        <span class="badge ${st.cls}">${st.icon} ${esc(st.label)}</span>
        <h3>${esc(s.label)}</h3>
        <p class="small">${s.before ? esc(partTitle(s.before)) : '—'}${s.after && s.after.id !== s.before?.id ? ` → <strong>${esc(partTitle(s.after))}</strong>` : ''}</p>
        ${s.reasons.length ? `<div class="block"><h4>Pourquoi</h4><ul>${s.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${s.checks.length ? `<div class="block"><h4>⚠️ À vérifier / mesurer</h4><ul>${s.checks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${s.recommendations.length ? `<div class="block"><h4>💡 Recommandé</h4><ul>${s.recommendations.map((x) => `<li>${esc(x.message)}${x.toValidate ? ' <span class="chip warn">à valider</span>' : ''}${x.source?.url ? ` <a href="${esc(x.source.url)}" target="_blank" rel="noopener">source</a>` : ''}</li>`).join('')}</ul></div>` : ''}
        ${alts.length ? `<details><summary>Autres remplaçants possibles (${alts.length})</summary><ul class="list">${alts.map((p) => `<li><button class="row" type="button" data-prefer="${s.slot}" data-id="${esc(p.id)}"><span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">Choisir</span></button></li>`).join('')}</ul></details>` : ''}
      </article>`;
    }).join('');
    const done = new Set(proj.done ?? []);
    const shop = r.shopping.map((x) => ({ key: x.part.id, text: `${partTitle(x.part)} (${x.part.name ?? ''})` }))
      .concat(r.extras.map((t) => ({ key: `x:${t}`, text: t })));
    const shopHtml = `<section class="summary"><h2>Liste de courses</h2>
      <ul class="checklist">${shop.map((x) => `<li><label><input type="checkbox" data-done="${esc(x.key)}"${done.has(x.key) ? ' checked' : ''}> ${esc(x.text)}</label></li>`).join('')}</ul>
      ${r.works.length ? `<div class="block"><h4>Travaux et réglages</h4><ul>${r.works.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${r.tools.length ? `<div class="block"><h4>Outils</h4><ul>${r.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      ${r.chain?.links ? `<div class="block"><h4>Chaîne</h4><p class="small">${esc(r.chain.text)}</p></div>` : ''}
      </section>`;
    const altTarget = r.alternativesToTarget.length
      ? `<section class="summary"><h2>Moins de changements avec…</h2><p class="small muted">Pièces du même type compatibles avec votre configuration actuelle :</p>
        <ul class="list">${r.alternativesToTarget.map((p) => `<li><button class="row" type="button" data-target="${esc(p.id)}"><span class="main"><span class="ref">${esc(partTitle(p))}</span><span class="sub">${esc(partSub(p))}</span></span><span class="act">Prendre</span></button></li>`).join('')}</ul></section>`
      : '';
    const pre = r.preexisting.length
      ? `<p class="note">Votre configuration actuelle contient déjà ${r.preexisting.length} incompatibilité(s) (erreur de saisie ?) : ${r.preexisting.map((x) => `${esc(x.labels.join(' + '))} : ${esc(x.message)}`).join(' ; ')}</p>`
      : '';
    return `${pre}${head}${extHtml}${shopHtml}${altTarget}<h2>Détail par pièce</h2>${cards}
      <p class="legend">✅ rien à faire · ❌ à changer · ➕ à ajouter · ➖ à retirer · ⚠️ à vérifier · 💡 recommandé. Les données « à valider » n'ont pas de confirmation constructeur.</p>`;
  }

  function editor(id) {
    const proj = get(id);
    if (!proj) { location.hash = '#/projet'; return; }
    const target = part(proj.target);
    const generations = [...new Set(state.parts.map((p) => p.generation).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    view.innerHTML = `
      <div class="btn-row two"><a class="btn ghost" href="#/projet">‹ Projets</a><button class="btn danger" type="button" id="del">Supprimer</button></div>
      <p id="del-confirm" class="note" hidden>Supprimer ce projet ? <button class="btn danger" type="button" id="del-yes">Oui, supprimer</button></p>
      <label class="field" for="pname"><span>Nom du projet</span><input id="pname" value="${esc(proj.name)}"></label>
      <section class="summary"><h2>1. Ma configuration actuelle</h2>
        <div class="btn-row"><button class="btn ghost" type="button" id="from-bike">Reprendre « Mon vélo »</button></div>
        <label class="field" for="group"><span>Ou charger un groupe</span><select id="group"><option value="">Choisir un groupe…</option>${generations.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label>
        <ul class="list" id="slots">${SLOTS.map((s) => slotRow(proj, s)).join('')}</ul>
        <details><summary>Cadre et roue arrière (facultatif)</summary><div class="form">${frameForm(proj)}</div></details>
      </section>
      <section class="summary"><h2>2. La pièce que je veux monter</h2>
        <p class="ref">${target ? esc(partTitle(target)) : '<span class="muted">Pas encore choisie</span>'}</p>
        ${target ? `<p class="small muted">${esc(partSub(target))}</p>` : ''}
        <div id="tsb"></div>
      </section>
      <section><h2>3. Résultat</h2><div id="res">${resultHtml(proj)}</div></section>
      <div class="btn-row"><button class="btn ghost" type="button" id="copy">Copier le projet</button></div>
      <p class="note" id="copy-msg" hidden></p>`;

    const refresh = () => editor(id);
    view.querySelector('#pname').addEventListener('change', (e) => { proj.name = e.target.value || proj.name; put(proj); });
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
      box.innerHTML = `<div class="btn-row"><button class="btn ghost" type="button" data-none="1">Aucun / retiré</button><button class="btn ghost" type="button" data-clear="1">Je ne sais pas</button></div><div class="sb"></div>`;
      box.querySelector('[data-none]').addEventListener('click', () => { proj.config.slots[s.id] = REMOVE; put(proj); refresh(); });
      box.querySelector('[data-clear]').addEventListener('click', () => { delete proj.config.slots[s.id]; put(proj); refresh(); });
      searchBox(box.querySelector('.sb'), {
        placeholder: `${s.label} : référence ou critères`,
        hint: 'Choisissez la pièce montée actuellement.',
        filter: (p) => s.types.includes(p.type) && (!s.accepts || s.accepts(p)),
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
      placeholder: 'Pièce cible : référence ou critères',
      hint: 'Ex. « cassette 11-34 », « rx812 », « pédalier 1x », « étrier flat mount ».',
      action: 'Monter',
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
        msg.textContent = 'Projet copié : collez-le dans « Importer » sur un autre appareil.';
      } catch {
        msg.innerHTML = `Copie automatique refusée : sélectionnez le texte ci-dessous.<textarea rows="4" readonly>${esc(text)}</textarea>`;
        msg.querySelector('textarea').select();
      }
    });
  }

  return (id) => (id ? editor(id) : list());
}
