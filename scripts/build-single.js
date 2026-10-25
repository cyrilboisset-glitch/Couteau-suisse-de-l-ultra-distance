// Génère une version « fichier unique » de l'appli (HTML + CSS + JS + catalogue
// intégrés) : dist/trousse-du-baroudeur.html, utilisable hors ligne en l'ouvrant
// directement sur le téléphone.   node scripts/build-single.js (après npm run build)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const bundle = await build({
  entryPoints: [root('dist/www/app.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020',
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(root('dist/www/style.css'), 'utf8');
const catalogue = readFileSync(root('dist/www/catalogue.json'), 'utf8').replace(/<\//g, '<\\/');
// Remplacement par fonction : sinon « $' », « $& »… présents dans le code minifié sont interprétés.
const html = readFileSync(root('dist/www/index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script>window.__CATALOGUE__=${catalogue};</script>\n<script>${js}</script>`);
writeFileSync(root('dist/trousse-du-baroudeur.html'), html);
console.log(`dist/trousse-du-baroudeur.html (${Math.round(html.length / 1024)} Ko)`);
