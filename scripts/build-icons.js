// Icônes de l'appli à partir du logo vectoriel (app/logo.js).
//   node scripts/build-icons.js
//   → assets/icon.svg, icon-512.png (Play Store), icon-192.png
//   → android/…/res : icônes de lancement (classique, ronde, adaptative) et écrans de démarrage
// Nécessite Playwright (navigateur Chromium) pour le rendu PNG.
import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { crankSvg } from '../app/logo.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const GREEN = ['#0f7d73', '#0a4f4a'];
const BG = '#0d6e66';

/** Pédalier blanc, centré dans un carré de `box` unités (le logo occupe `scale` de la largeur). */
function art({ scale = 0.83, background = 'gradient', shape = 'square' }) {
  const pad = (64 * (1 - scale)) / 2;
  const fill = background === 'gradient' ? 'url(#bg)' : background;
  const clip = shape === 'circle' ? '<clipPath id="cl"><circle cx="32" cy="32" r="32"/></clipPath>' : shape === 'rounded' ? '<clipPath id="cl"><rect width="64" height="64" rx="14"/></clipPath>' : '';
  const bgRect = background === 'none' ? '' : `<rect width="64" height="64" fill="${fill}"${clip ? ' clip-path="url(#cl)"' : ''}/>`;
  return crankSvg({ teeth: 32, spin: false })
    .replace('<svg ', '<svg width="100%" height="100%" style="color:#fff" ')
    .replace('<defs>', `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${GREEN[0]}"/><stop offset="1" stop-color="${GREEN[1]}"/></linearGradient>${clip}</defs>
  ${bgRect}<g transform="translate(${pad + 1.5} ${pad + 1.5}) scale(${scale})"><defs>`)
    .replace('</svg>', '</g></svg>');
}

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(svg, w, h, out, bg = 'transparent') {
  await page.setViewportSize({ width: w, height: h });
  const side = Math.min(w, h);
  await page.setContent(`<body style="margin:0;width:${w}px;height:${h}px;display:grid;place-items:center;background:${bg}">
    <div style="width:${side}px;height:${side}px">${svg}</div></body>`);
  await page.screenshot({ path: out, omitBackground: bg === 'transparent' });
}
const pngSize = (f) => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

mkdirSync(root('assets'), { recursive: true });
const store = art({});
writeFileSync(root('assets/icon.svg'), store.replace('width="100%" height="100%"', 'width="512" height="512"'));
for (const size of [512, 192]) await render(store, size, size, root(`assets/icon-${size}.png`));

const res = root('android/app/src/main/res');
if (existsSync(res)) {
  for (const dir of readdirSync(res)) {
    const d = `${res}/${dir}`;
    if (existsSync(`${d}/ic_launcher.png`)) await render(art({ shape: 'rounded', scale: 0.8 }), ...pngSize(`${d}/ic_launcher.png`), `${d}/ic_launcher.png`);
    if (existsSync(`${d}/ic_launcher_round.png`)) await render(art({ shape: 'circle', scale: 0.74 }), ...pngSize(`${d}/ic_launcher_round.png`), `${d}/ic_launcher_round.png`);
    // Adaptative : 108 dp dont seuls les 66 dp centraux sont toujours visibles.
    if (existsSync(`${d}/ic_launcher_foreground.png`)) await render(art({ background: 'none', scale: 0.56 }), ...pngSize(`${d}/ic_launcher_foreground.png`), `${d}/ic_launcher_foreground.png`);
    if (existsSync(`${d}/splash.png`)) {
      const [w, h] = pngSize(`${d}/splash.png`);
      const logo = art({ background: 'none', scale: 0.5 });
      await render(logo, w, h, `${d}/splash.png`, `linear-gradient(160deg, ${GREEN[0]}, ${GREEN[1]})`);
    }
  }
  writeFileSync(`${res}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
}
await browser.close();
console.log('icônes : assets/ + android/app/src/main/res');
