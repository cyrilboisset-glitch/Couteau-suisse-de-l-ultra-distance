// Logo : un vrai pédalier (plateau denté, araignée 4 bras, vis, manivelle et pédale), dessiné en SVG.
// Tout est en currentColor ; les évidements sont de vrais trous (masque), donc lisibles sur tout fond.

const C = 28; // axe du pédalier, décalé pour laisser la place à la manivelle (viewBox 64 × 64)
const pt = (r, a) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;

/** Contour denté du plateau : creux arrondis (logement du rouleau), dents effilées à sommet arrondi. */
function teethPath(teeth, rRoot, rTip) {
  const steps = 14;
  const pts = [];
  for (let i = 0; i < teeth * steps; i++) {
    const p = (i % steps) / steps;
    const f = ((1 - Math.cos(2 * Math.PI * p)) / 2) ** 1.35;
    pts.push(pt(rRoot + (rTip - rRoot) * f, (2 * Math.PI * i) / (teeth * steps)));
  }
  return `M${pts.join('L')}Z`;
}

/** Bras d'araignée : trapèze du moyeu vers le plateau. */
function arm(angle, r0, r1, w0, w1) {
  const n = angle + Math.PI / 2;
  const p = (r, w, s) => `${(C + r * Math.cos(angle) + s * w * Math.cos(n)).toFixed(2)} ${(C + r * Math.sin(angle) + s * w * Math.sin(n)).toFixed(2)}`;
  return `M${p(r0, w0, 1)}L${p(r1, w1, 1)}L${p(r1, w1, -1)}L${p(r0, w0, -1)}Z`;
}

const deg = (d) => (d * Math.PI) / 180;
// Araignée asymétrique 4 bras (style Hollowtech actuel).
const ARMS = [-12, 80, 168, 258].map(deg);

let n = 0;
/**
 * SVG du pédalier. `teeth` : nombre de dents (moins de dents = plus lisible en petit).
 * `spin` : le plateau tourne lentement.
 */
export function crankSvg({ teeth = 24, spin = true, title = '' } = {}) {
  const id = `crank-${n++}`;
  const rTip = 25;
  const rRoot = 22;
  const rInner = 16.8;
  const rBolt = 18.7;
  const ring = `${teethPath(teeth, rRoot, rTip)}M${C + rInner} ${C}A${rInner} ${rInner} 0 1 0 ${C - rInner} ${C}A${rInner} ${rInner} 0 1 0 ${C + rInner} ${C}Z`;
  const spider = ARMS.map((a) => arm(a, 4, rInner + 2.2, 4, 2.8)).join('');
  // Manivelle : de l'axe vers la pédale, en bas à droite, entre deux bras.
  const crankA = deg(45);
  const len = 31;
  const crank = arm(crankA, 0, len, 5, 3.4);
  const eye = pt(len, crankA).split(' ');
  // Pédale : corps perpendiculaire à la manivelle.
  const pa = crankA + Math.PI / 2;
  const [ex, ey] = eye.map(Number);
  const pedalBody = (() => {
    const ux = Math.cos(pa), uy = Math.sin(pa), vx = Math.cos(crankA), vy = Math.sin(crankA);
    const q = (u, v) => `${(ex + u * ux + v * vx).toFixed(2)} ${(ey + u * uy + v * vy).toFixed(2)}`;
    return `M${q(-8, -1.9)}L${q(8, -1.9)}L${q(8, 1.9)}L${q(-8, 1.9)}Z`;
  })();
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" ${title ? `role="img" aria-label="${title}"` : 'aria-hidden="true"'}>
  <defs><mask id="${id}-m"><rect width="64" height="64" fill="#fff"/>
    ${ARMS.map((a) => { const [x, y] = pt(rBolt, a).split(' '); return `<circle cx="${x}" cy="${y}" r="1.25" fill="#000"/>`; }).join('')}
    <circle cx="${C}" cy="${C}" r="2.6" fill="#000"/>
    <circle cx="${eye[0]}" cy="${eye[1]}" r="1.6" fill="#000"/>
  </mask></defs>
  <g class="${spin ? 'crank spin' : 'crank'}" mask="url(#${id}-m)" fill="currentColor">
    <path d="${ring}" fill-rule="evenodd"/>
    <path d="${spider}" opacity=".78"/>
    <circle cx="${C}" cy="${C}" r="7.2"/>
    <path d="${pedalBody}" opacity=".8"/>
    <path d="${crank}"/>
    <circle cx="${eye[0]}" cy="${eye[1]}" r="3.8"/>
  </g>
</svg>`;
}

/** Icône d'onglet du navigateur (pédalier blanc sur pastille de la couleur de l'appli). */
export function faviconHref() {
  const svg = crankSvg({ teeth: 20, spin: false })
    .replace('<svg ', '<svg width="64" height="64" style="color:#fff" ')
    .replace('<defs>', '<rect width="64" height="64" rx="15" fill="#0d6e66"/><defs>');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
