// Icônes de l'appli (Play Store, écran d'accueil) à partir du logo vectoriel.
//   node scripts/build-icons.js   → assets/icon.svg, assets/icon-512.png, assets/icon-192.png
// Nécessite Playwright (navigateur Chromium) pour le rendu PNG.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { crankSvg } from '../app/logo.js';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
mkdirSync(root('assets'), { recursive: true });
// Pastille pleine (le Play Store arrondit lui-même les coins) avec un léger dégradé.
const svg = crankSvg({ teeth: 32, spin: false })
  .replace('<svg ', '<svg width="512" height="512" style="color:#fff" ')
  .replace('<defs>', `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0f7d73"/><stop offset="1" stop-color="#0a4f4a"/></linearGradient></defs>
  <rect width="64" height="64" fill="url(#bg)"/><g transform="translate(5.5 5.5) scale(.83)"><defs>`)
  .replace('</svg>', '</g></svg>');
writeFileSync(root('assets/icon.svg'), svg);

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [512, 192]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body>`);
  await page.screenshot({ path: root(`assets/icon-${size}.png`), omitBackground: true });
}
await browser.close();
console.log('assets/icon.svg, icon-512.png, icon-192.png');
