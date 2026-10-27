// Assemble l'application autonome dans dist/www/ (app + moteur + catalogue, appli météo dans meteo/).
//   node scripts/build-www.js   (après scripts/build-data.js)
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const out = root('dist/www/');
if (!existsSync(root('dist/catalogue.json'))) throw new Error('Lancer d\'abord node scripts/build-data.js');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(root('app'), out, { recursive: true });
cpSync(root('src'), `${out}src`, { recursive: true });
cpSync(root('dist/catalogue.json'), `${out}catalogue.json`);
cpSync(root('meteo'), `${out}meteo`, { recursive: true });
console.log('dist/www prêt');
